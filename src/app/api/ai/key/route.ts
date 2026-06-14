import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API Key de procesamiento no configurada en el servidor" }, { status: 500 });
  }

  return NextResponse.json({ apiKey });
}
