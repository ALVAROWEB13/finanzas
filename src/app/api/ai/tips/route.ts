import { NextResponse } from "next/server";
import { initDb, getTransactions } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export const maxDuration = 60; // Incrementar el tiempo de ejecución en Vercel a 60 segundos (evita error 503)

// Función auxiliar para reintentar peticiones a Gemini con retraso exponencial ante un HTTP 429 (ResourceExhausted)
async function fetchWithRetry(url: string, options: RequestInit, retries = 4, delay = 2000): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      lastResponse = response;
      if (i < retries - 1) {
        console.warn(`[Gemini API - Tips] Recibido 429. Reintentando en ${delay}ms... (Intento ${i + 1}/${retries})`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2.5; // Backoff exponencial agresivo
        continue;
      }
    }
    return response;
  }
  return lastResponse!;
}

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Servicio de análisis no disponible" }, { status: 500 });
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

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const prompt = `Eres "Tobirama AI", un coach de finanzas personales para colombianos.
Analiza las siguientes transacciones recientes y genera exactamente 3 tips financieros personalizados en español.
Basa los tips en patrones reales que veas (categorías con mucho gasto, nivel de ahorro, etc.).
Cada tip tiene: titulo (corto, max 30 chars), consejo (específico y útil, máx 120 chars), gravedad (INFO=informativo, WARNING=alerta por exceso de gasto, SUCCESS=felicitación por buen hábito).

Transacciones del usuario:
${JSON.stringify(recentTx, null, 2)}`;

    // Realizar llamada con reintentos para mitigar errores 429
    const response = await fetchWithRetry(url, {
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
      throw new Error(`Error de procesamiento: ${response.status}`);
    }

    const resJson = await response.json();
    console.log("[tips] Gemini response:", JSON.stringify(resJson).slice(0, 400));

    const part = resJson.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("No se pudo extraer una respuesta válida del analizador");

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
