import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "API Key de Gemini no configurada en el servidor" },
      { status: 500 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const base64Data = Buffer.from(bytes).toString("base64");

    // Normalize MIME type — Gemini vision needs image/jpeg or image/png
    let mimeType = file.type || "image/jpeg";
    if (mimeType === "application/octet-stream") mimeType = "image/jpeg";

    // PDFs are not supported as inline image data for the REST API
    if (mimeType === "application/pdf") {
      return NextResponse.json(
        { error: "Por favor sube una foto JPG o PNG de la factura, los PDFs no se pueden escanear directamente." },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    // gemini-2.0-flash: stable, fast multimodal model with JSON output support
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const body = {
      system_instruction: {
        parts: [{
          text: "Eres un experto en OCR de comprobantes de pago colombianos y latinoamericanos. Extrae siempre los datos reales visibles. NUNCA inventes valores. Si no puedes leer un campo, usa el valor por defecto indicado en el prompt."
        }]
      },
      contents: [{
        parts: [
          {
            inlineData: { mimeType, data: base64Data }
          },
          {
            text: `Analiza esta imagen de factura, recibo o comprobante de pago y extrae los siguientes campos:

1. comercio: Nombre del establecimiento o empresa emisora. Default si no se ve: "Comercio"
2. total: Valor total pagado como número entero en pesos COP, SIN puntos ni comas ni símbolos. Ejemplo: "$45.900" → 45900. Default: 0
3. fecha: Fecha del comprobante en formato YYYY-MM-DD. Default: ${today}
4. categoria: Elige UNA categoría de esta lista según el tipo de gasto:
   - Alimentación (supermercados, restaurantes, domicilios)
   - Transporte (gasolina, taxi, Uber, bus, peajes)
   - Servicios (luz, agua, gas, internet, telefonía, arriendos)
   - Entretenimiento (Netflix, Spotify, cine, juegos)
   - Salud (farmacia, médico, laboratorio)
   - Educación (cursos, libros, universidad)
   - Vivienda (ferretería, muebles, ropa del hogar)
   - Ahorro / Reserva (transferencias a ahorros)
   - Ingresos (depósitos recibidos)
5. descripcion: Descripción corta y precisa del gasto, máx 60 caracteres.

Devuelve SOLO el JSON sin texto adicional.`
          }
        ]
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            comercio:    { type: "string" },
            total:       { type: "integer" },
            fecha:       { type: "string" },
            categoria:   { type: "string" },
            descripcion: { type: "string" }
          },
          required: ["comercio", "total", "fecha", "categoria", "descripcion"]
        }
      }
    };

    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("[invoice] Gemini error:", geminiRes.status, errText);
      throw new Error(`Gemini respondió ${geminiRes.status}: ${errText}`);
    }

    const resJson = await geminiRes.json();
    console.log("[invoice] Gemini response:", JSON.stringify(resJson).slice(0, 500));

    // With responseMimeType=application/json the content is a JSON string inside parts[0].text
    const part = resJson.candidates?.[0]?.content?.parts?.[0];
    if (!part) {
      throw new Error("Gemini no devolvió candidatos en la respuesta");
    }

    let data: Record<string, unknown>;
    if (typeof part.text === "string") {
      data = JSON.parse(part.text);
    } else {
      // Fallback: some builds return object directly
      data = part as Record<string, unknown>;
    }

    return NextResponse.json(data);

  } catch (err: any) {
    console.error("[invoice] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
