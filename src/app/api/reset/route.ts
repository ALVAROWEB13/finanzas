import { NextResponse } from "next/server";
import { initDb, resetDb } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    await resetDb(auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST Reset failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
