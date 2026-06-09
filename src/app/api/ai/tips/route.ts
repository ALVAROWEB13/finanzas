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

    // Simplify transactions to stay within context windows
    const recentTx = transactions.slice(0, 30).map(t => ({
      fecha: t.date,
      descripcion: t.description,
      monto: t.amount,
      categoria: t.category,
      tipo: t.type
    }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Eres "Tobirama AI", un coach de finanzas personales para colombianos.
Analiza las siguientes transacciones recientes y genera exactamente 3 tips financieros personalizados en español.
Basa los tips en patrones reales que veas (categorías con mucho gasto, nivel de ahorro, etc.).
Cada tip tiene: titulo (corto, max 30 chars), consejo (específico y útil, máx 120 chars), gravedad (INFO=informativo, WARNING=alerta por exceso de gasto, SUCCESS=felicitación por buen hábito).

Transacciones del usuario:
${JSON.stringify(recentTx, null, 2)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                titulo:   { type: "string" },
                consejo:  { type: "string" },
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
      console.error("[tips] Gemini error:", response.status, errText);
      throw new Error(`Gemini respondió ${response.status}: ${errText}`);
    }

    const resJson = await response.json();
    console.log("[tips] Gemini response:", JSON.stringify(resJson).slice(0, 400));

    const part = resJson.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("Gemini no devolvió candidatos en la respuesta");

    // With responseMimeType=application/json, Gemini puts a JSON string in part.text
    let tips: unknown[];
    if (typeof part.text === "string") {
      tips = JSON.parse(part.text);
    } else {
      tips = part as unknown[];
    }

    return NextResponse.json(tips);
  } catch (err: any) {
    console.error("[tips] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
