import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

// Función auxiliar para reintentar peticiones a Gemini con retraso exponencial ante un HTTP 429 (ResourceExhausted)
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1200): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status === 429) {
      lastResponse = response;
      if (i < retries - 1) {
        console.warn(`[Gemini API - Invoice] Recibido 429. Reintentando en ${delay}ms... (Intento ${i + 1}/${retries})`);
        await new Promise((res) => setTimeout(res, delay));
        delay *= 2.5; // Backoff exponencial agresivo para disipar rate-limits
        continue;
      }
    }
    return response;
  }
  return lastResponse!;
}

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
          text: `Eres un asistente experto de OCR especializado en extraer información de facturas, recibos, comprobantes de transferencias (Nequi, Daviplata, Bancolombia, etc.) y tickets de compra de Colombia y Latinoamérica.
Tu objetivo es analizar la imagen y extraer los datos EXACTOS y VERÍDICOS. NUNCA debes alucinar o inventar valores. Si no se puede leer un campo con certeza, utiliza el valor por defecto indicado.`
        }]
      },
      contents: [{
        parts: [
          {
            inlineData: { mimeType, data: base64Data }
          },
          {
            text: `Analiza detenidamente esta imagen de factura, recibo o comprobante de pago y extrae los siguientes campos con la mayor precisión posible:

1. comercio: Nombre del establecimiento comercial, empresa emisora o destinatario de la transferencia (por ejemplo, "Almacenes Éxito", "D1", "Gasolinera Copec", "Nequi Juan P.", etc.). Debe ser un nombre propio representativo. Si no se visualiza ninguno, usa "Comercio".
2. total: El valor total neto pagado/transferido como número entero (en pesos COP). 
   - Busca el total definitivo (a veces rotulado como "TOTAL", "PAGO TOTAL", "VALOR", "VALOR DE LA TRANSACCION", "Total a pagar", "Monto").
   - Ignora montos intermedios como sub-totales, IVA o propinas a menos que sea el único valor disponible.
   - OJO con los decimales: si dice por ejemplo "50.000,00" o "50000.00", el valor a retornar es 50000 (no 5000000). 
   - Devuelve solo el número entero, sin símbolos de moneda ($), puntos, comas ni letras. Si no es legible o no hay monto, devuelve 0.
3. fecha: Fecha en que se realizó la transacción en formato YYYY-MM-DD.
   - Traduce formatos latinos/españoles de fecha (ej. "08/Jun/2026", "8 de junio de 2026", "08-06-26") al formato estándar YYYY-MM-DD.
   - Si no se encuentra ninguna fecha legible en la imagen, usa la fecha de hoy: "${today}".
4. categoria: Clasifica la transacción seleccionando exactamente UNA de las siguientes categorías según el comercio o concepto:
   - Alimentación (comida, restaurantes, cafeterías, supermercados, D1, Éxito, Ara, Jumbo)
   - Transporte (combustible, gasolina, taxis, Uber, parqueadero, peajes, pasajes)
   - Servicios (servicios públicos, luz, agua, gas, planes de celular, internet, arriendo)
   - Entretenimiento (cine, suscripciones como Netflix, Spotify, bares, videojuegos, salidas)
   - Salud (droguería, farmacia, consultas médicas, laboratorios, medicamentos)
   - Educación (colegio, universidad, cursos, libros, papelería)
   - Vivienda (mantenimiento del hogar, ferretería, decoración, ropa)
   - Ahorro / Reserva (dinero destinado a fondos de ahorro o reservas)
   - Ingresos (si el comprobante representa un dinero recibido, consignación o abono)
5. descripcion: Una descripción muy corta y concisa de lo comprado o pagado (máximo 60 caracteres), por ejemplo: "Compra de víveres", "Combustible para auto", "Pago de internet Claro", etc.

La respuesta debe ser estrictamente un JSON válido con la estructura solicitada, sin bloques de código markdown (\`\`\`) ni texto explicativo.`
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

    // Realizar llamada con reintentos para mitigar errores 429
    const geminiRes = await fetchWithRetry(url, {
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
