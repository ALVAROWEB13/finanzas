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
  if (!apiKey) return NextResponse.json({ error: "Servicio de procesamiento no disponible" }, { status: 500 });

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

    // Modelos candidatos en orden de prioridad para evadir límites de cuota (429) de forma transparente
    const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite"];

    const body = {
      system_instruction: {
        parts: [{
          text: `Eres un sistema experto de OCR para facturas, recibos y comprobantes de pago de Colombia y Latinoamérica (Nequi, Daviplata, Bancolombia, Éxito, D1, Jumbo, Ara, etc.).
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

2. comercio: Nombre comercial o marca del establecimiento (ej: "Jumbo", "Metro", "Éxito", "D1", "Ara", "Olímpica", "Nequi Juan Pérez", "Daviplata").
   REGLA IMPORTANTE: Prefiere la marca comercial (ej. "Jumbo" o "Metro") antes que la razón social legal (ej. "Cencosud Colombia S.A."). Si no se ve ningún nombre comercial, usa "Comercio".

3. total: Monto total real de la compra como número ENTERO en pesos COP.
   REGLAS CRÍTICAS PARA EL TOTAL:
   - Extrae el neto real pagado por el cliente. Busca y cruza el valor en múltiples lugares del recibo: la línea de "TOTAL A PAGAR", la línea del método de pago (ej. "TARJ CRE/DEB", "EFECTIVO" o "PAGO ELECTRONICO") y la suma de base + IVA en el desglose de impuestos.
   - REGLA DE VERIFICACIÓN ARITMÉTICA (CRÍTICA): Haz una suma mental rápida de los ítems individuales (restando los descuentos si los hay, como valores negativos) y contrástala con el total impreso. Esto te ayudará a resolver dígitos que parezcan borrosos o desgastados (por ejemplo, diferenciar si un número es un 5 o un 6, o si es un 3 o un 8) en impresoras térmicas.
   - El total debe ser exactamente el valor final cobrado al cliente (ej: 116440 si dice 116.440). NUNCA inventes, aproximes o redondées de forma creativa. Asegúrate de verificar los dígitos con detenimiento.
   - NO te confundas con los subtotales, los impuestos (IVA por separado), el dinero entregado por el cliente antes del cambio, el cambio devuelto ("VUELTAS" / "CAMBIO"), ni con el ahorro acumulado ("AHORRO" / "SU AHORRO").
   - Ejemplo de decimales colombianos: "116.440,00" o "116,440" → 116440 | "1.250.000" → 1250000
   - Solo dígitos. Sin $, puntos de miles, comas ni letras. Si no es legible: 0.

4. fecha: Fecha real de la compra o transacción en formato YYYY-MM-DD.
   REGLAS CRÍTICAS PARA LA FECHA:
   - NO extraigas la fecha de la resolución de la DIAN (ej. "Resolución DIAN No... de 2009", "DIAN No... de Diciembre de 2023"). Esas fechas corresponden a la autorización de facturación, no a tu compra.
   - NO extraigas fechas de vencimiento de promociones o puntos (ej. "Vence 20/03/2027").
   - Busca la fecha real de la compra que suele estar al final del ticket junto a la hora, número de caja y cajero (ej. "20/03/2024 16:32"), o en el encabezado como fecha de emisión.
   - Convierte fechas en español: "8 de junio de 2026" → "2026-06-08", "20/Mar/2024" → "2024-03-20".
   - Si no hay fecha de compra legible o es confusa, o si las únicas fechas visibles en el ticket corresponden a la resolución de la DIAN o al vencimiento de puntos/promociones, debes devolver estrictamente "HOY". NUNCA supongas una fecha de compra a partir de fechas DIAN o de puntos.

5. categoria: Elige UNA de estas categorías según el tipo de comercio o concepto:
   - Alimentación (supermercados, restaurantes, D1, Éxito, Ara, Jumbo, Metro, Olímpica, domicilios)
   - Transporte (gasolina, taxi, Uber, bus, peajes, parqueadero)
   - Servicios (luz, agua, gas, internet, celular, arriendo)
   - Entretenimiento (cine, Netflix, Spotify, bares, juegos)
   - Salud (droguería, farmacia, médico, laboratorio)
   - Educación (colegio, universidad, cursos, libros)
   - Vivienda (ferretería, decoración, mantenimiento hogar)
   - Ahorro / Reserva (transferencias a ahorros)
   - Ingresos (dinero recibido, consignaciones)

6. descripcion: Descripción corta del gasto (máx 60 caracteres). Ej: "Compra víveres Jumbo", "Gasolina carro".

Devuelve SOLO el JSON sin texto adicional ni bloques de código.`
          }
        ]
      }],
      generationConfig: {
        temperature: 0.0,
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

    let geminiRes: Response | null = null;
    let lastErrorMsg = "";

    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log(`[invoice] Intentando procesar factura con el modelo: ${model}`);
      try {
        geminiRes = await fetchWithRetry(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body)
        }, 2, 1000); // 2 reintentos rápidos (espera máx ~1s) antes de saltar al fallback

        if (geminiRes.ok) {
          console.log(`[invoice] Procesamiento exitoso con el modelo: ${model}`);
          break;
        } else {
          const status = geminiRes.status;
          const errText = await geminiRes.text();
          lastErrorMsg = `Modelo ${model} falló con estado ${status}: ${errText}`;
          console.warn(`[invoice] ${lastErrorMsg}. Probando siguiente modelo si está disponible...`);
        }
      } catch (err: any) {
        lastErrorMsg = `Error llamando a ${model}: ${err.message}`;
        console.warn(`[invoice] ${lastErrorMsg}. Probando siguiente modelo...`);
      }
    }

    if (!geminiRes || !geminiRes.ok) {
      const finalStatus = geminiRes ? geminiRes.status : 500;
      throw new Error(`Error de procesamiento: ${finalStatus}`);
    }

    const resJson = await geminiRes.json();
    console.log("[invoice] Gemini response:", JSON.stringify(resJson).slice(0, 600));

    const part = resJson.candidates?.[0]?.content?.parts?.[0];
    if (!part) throw new Error("No se pudo extraer una respuesta válida del escáner");

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
