import { NextResponse } from "next/server";
import { initDb, resetDb } from "@/lib/db";

export async function POST() {
  try {
    await initDb();
    await resetDb();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST Reset failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
