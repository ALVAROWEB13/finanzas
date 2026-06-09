import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key de Gemini no configurada en el servidor" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) {
      return NextResponse.json({ error: "No se subió ningún archivo" }, { status: 400 });
    }

    // Convert file to base64
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64Data = buffer.toString("base64");
    const mimeType = file.type;

    // Call Gemini 2.5 Flash API via native fetch
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{
            text: "Eres un experto en OCR y extracción de datos de comprobantes de pago colombianos y latinoamericanos. Tu trabajo es analizar imágenes de facturas, recibos, tickets, y comprobantes electrónicos con máxima precisión. Siempre extraes los datos reales visibles en el documento — NUNCA inventas valores."
          }]
        },
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              },
              {
                text: `Analiza este comprobante de pago con máxima precisión. Extrae EXACTAMENTE los datos que aparecen en el documento:

1. COMERCIO: El nombre real del establecimiento o empresa emisora del comprobante (ej: "Rappi", "Éxito", "Claro", "Netflix"). Si no hay nombre visible, usa "Comercio desconocido".

2. TOTAL: El valor total a pagar o pagado en pesos colombianos (COP) como número entero SIN puntos, comas ni símbolos. Busca palabras como "Total", "Total a pagar", "Valor", "Subtotal". Si hay IVA incluido, usa el total final. Ejemplo: si dice "$150.000" devuelve 150000.

3. FECHA: La fecha del comprobante en formato YYYY-MM-DD. Si no hay fecha, usa la de hoy: ${new Date().toISOString().split("T")[0]}.

4. CATEGORIA: Asigna UNA de estas categorías según el tipo de gasto: Vivienda, Transporte, Servicios, Alimentación, Entretenimiento, Salud, Educación, Ahorro / Reserva, Ingresos. Ejemplos: supermercados/restaurantes=Alimentación, Netflix/Spotify=Entretenimiento, gasolina/taxi=Transporte, recibo luz/agua/internet=Servicios.

5. DESCRIPCION: Una descripción corta y precisa del gasto (máx 60 caracteres), como "Compra de mercado", "Recarga de celular", "Pago de membresía".`
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              comercio: { type: "string" },
              total: { type: "integer" },
              fecha: { type: "string" },
              categoria: { type: "string" },
              descripcion: { type: "string" }
            },
            required: ["comercio", "total", "fecha", "categoria", "descripcion"]
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

    const parsedData = JSON.parse(text);
    return NextResponse.json(parsedData);
  } catch (err: any) {
    console.error("Error en API de escaneo de facturas:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
