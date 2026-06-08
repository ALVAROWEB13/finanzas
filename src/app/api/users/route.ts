import { NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { getAllUsers, initDb } from "@/lib/db";

await initDb();

/**
 * GET /api/users
 * Admin-only: list all registered users (no passwords).
 */
export async function GET(req: Request) {
  const session = authenticateRequest(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (err: any) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
