import { NextResponse } from "next/server";
import { initDb, getTransactions } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key de Gemini no configurada en el servidor" }, { status: 500 });
  }

  try {
    await initDb();
    const transactions = await getTransactions(auth.userId);

    // Simplify transactions to stay within context windows and keep prompt clean
    const recentTx = transactions.slice(0, 30).map(t => ({
      fecha: t.date,
      descripcion: t.description,
      monto: t.amount,
      categoria: t.category,
      tipo: t.type
    }));

    // Call Gemini via native fetch
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Eres un coach de finanzas personales altamente inteligente y analítico llamado "Tobirama AI".
      Analiza las siguientes últimas transacciones de este usuario y dale exactamente 3 consejos o tips de finanzas útiles y directos en español.
      Los tips deben basarse en comportamientos reales observados (ej. si tiene gastos altos en alguna categoría, si su ahorro es óptimo, o consejos para mantener un presupuesto sano).
      Cada tip debe tener un título, un consejo detallado pero conciso, y una gravedad: INFO (azul, informativo), WARNING (rojo, advertencia si hay gastos excesivos), o SUCCESS (verde, felicitación por ahorro o control).

      Transacciones del usuario:
      ${JSON.stringify(recentTx, null, 2)}
    `;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo: { type: "string" },
                consejo: { type: "string" },
                gravedad: { type: "string", enum: ["INFO", "WARNING", "SUCCESS"] }
              },
              required: ["titulo", "consejo", "gravedad"]
            }
          }
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`API Gemini falló con estado ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    const text = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Respuesta vacía o estructura incorrecta de Gemini API");
    }

    const tips = JSON.parse(text);
    return NextResponse.json(tips);
  } catch (err: any) {
    console.error("Error en API de tips con IA:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
