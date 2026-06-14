import { NextResponse } from "next/server";
import { logError } from "@/lib/db";

export const maxDuration = 60; // Incrementar el tiempo de ejecución en Vercel a 60 segundos (evita error 503)

// Reintentos con backoff exponencial ante HTTP 429
async function fetchWithRetry(url: string, options: RequestInit, retries = 4, delay = 2000): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      lastResponse = response;
      if (i < retries - 1) {
        console.warn(`[invoice] 429 recibido. Reintentando en ${delay}ms... (${i + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, delay));
        delay *= 2.5;
        continue;
      }
    }
    return response;
  }
  return lastResponse!;
}

export async function POST(req: Request) {
  // Esta ruta solo procesa imágenes con Gemini — no accede a datos de usuario
  // por lo que no requiere autenticación de sesión
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "API Key de Gemini no configurada" }, { status: 500 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    let mimeType = file.type || "image/jpeg";
    if (mimeType === "application/octet-stream") mimeType = "image/jpeg";
    if (mimeType === "application/pdf") {
      return NextResponse.json(
        { error: "Sube una foto JPG o PNG. Los PDFs no son compatibles con el escáner." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // gemini-2.5-flash: modelo con soporte de OCR de facturas y cuota disponible
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const body = {
      system_instruction: {
        parts: [{
          text: `Eres un sistema experto de OCR para facturas, recibos y comprobantes de pago de Colombia y Latinoamérica (Nequi, Daviplata, Bancolombia, Éxito, D1, etc.).
Tu tarea es EXTRAER datos reales y visibles. JAMÁS inventes valores.
Evalúa primero si la imagen tiene calidad suficiente para escanear (buena iluminación, texto legible, imagen enfocada).`
        }]
      },
      contents: [{
        parts: [
          { inlineData: { mimeType, data: base64Data } },
          {
            text: `Analiza esta imagen y responde con un JSON con estos 6 campos:

1. calidad_imagen: Evalúa la calidad de la imagen. Usa exactamente uno de estos valores:
   - "BUENA": imagen clara, bien iluminada, texto nítido y legible
   - "REGULAR": imagen algo borrosa u oscura pero los datos principales son legibles
   - "MALA": imagen muy oscura, borrosa, mal enfocada o el texto no se puede leer

2. comercio: Nombre del establecimiento, empresa o persona que recibe el pago (ej: "Almacenes Éxito", "D1", "Nequi Juan Pérez"). Si no se ve, usa "Comercio".

3. total: Monto total pagado como número ENTERO en pesos COP.
   REGLA IMPORTANTE para decimales colombianos: "50.000,00" → 50000 | "1.250.000" → 1250000 | "14500.00" → 14500
   Solo dígitos. Sin $, puntos de miles, comas ni letras. Si no es legible: 0.

4. fecha: Fecha de la transacción en formato YYYY-MM-DD.
   Convierte fechas en español: "8 de junio de 2026" → "2026-06-08", "08/Jun/2026" → "2026-06-08"
   Si no hay fecha legible: "${today}"

5. categoria: Elige UNA de estas categorías según el tipo de comercio o concepto:
   - Alimentación (supermercados, restaurantes, D1, Éxito, Ara, Jumbo, domicilios)
   - Transporte (gasolina, taxi, Uber, bus, peajes, parqueadero)
   - Servicios (luz, agua, gas, internet, celular, arriendo)
   - Entretenimiento (cine, Netflix, Spotify, bares, juegos)
   - Salud (droguería, farmacia, médico, laboratorio)
   - Educación (colegio, universidad, cursos, libros)
   - Vivienda (ferretería, decoración, mantenimiento hogar)
   - Ahorro / Reserva (transferencias a ahorros)
   - Ingresos (dinero recibido, consignaciones)

6. descripcion: Descripción corta del gasto (máx 60 caracteres). Ej: "Compra víveres D1", "Gasolina carro".

Devuelve SOLO el JSON sin texto adicional ni bloques de código.`
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            calidad_imagen: { type: "string", enum: ["BUENA", "REGULAR", "MALA"] },
            comercio:       { type: "string" },
            total:          { type: "integer" },
            fecha:          { type: "string" },
            categoria:      { type: "string" },
            descripcion:    { type: "string" }
          },
          required: ["calidad_imagen", "comercio", "total", "fecha", "categoria", "descripcion"]
        }
      }
    };

    const geminiRes = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[invoice] Gemini error:", geminiRes.status, errText);
      throw new Error(`Error del servidor AI: ${geminiRes.status}`);
    }

    const resJson = await geminiRes.json();
    console.log("[invoice] Gemini response:", JSON.stringify(resJson).slice(0, 600));

    const part = resJson.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("Gemini no devolvió respuesta válida");

    let data: Record<string, unknown>;
    if (typeof part.text === "string") {
      data = JSON.parse(part.text);
    } else {
      data = part as Record<string, unknown>;
    }

    // Si la calidad es MALA, retornar un error especial para que el cliente muestre tips de foto
    if (data.calidad_imagen === "MALA") {
      return NextResponse.json(
        {
          error: "imagen_mala",
          mensaje: "La foto no tiene suficiente calidad para escanear. Asegúrate de tener buena luz y que el texto de la factura sea nítido."
        },
        { status: 422 }
      );
    }

    return NextResponse.json(data);

  } catch (err: any) {
    console.error("[invoice] Error:", err.message);
    const userId = req.headers.get("x-user-id") || "anon";
    try {
      await logError(userId, err.message, err.stack, "API_AI_INVOICE");
    } catch (logErr) {
      console.error("Failed to write error log:", logErr);
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
