import { NextResponse } from "next/server";
import { initDb, getErrorLogs, clearErrorLogs, getUserById, logError } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const user = await getUserById(auth.userId);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const logs = await getErrorLogs();
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error("API GET admin logs failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const user = await getUserById(auth.userId);
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    await clearErrorLogs();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE admin logs failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { message, stack, context } = body;
    await initDb();
    await logError(auth.userId, message || "Client Error", stack || "", context || "CLIENT_OCR");
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST admin logs failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
