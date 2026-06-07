import { NextResponse } from "next/server";
import { initDb, getBudgetItems, updateBudgetItem, deleteBudgetItem } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

// API handler for GET, POST, and DELETE budget items
export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const budgetItems = await getBudgetItems(auth.userId);
    return NextResponse.json(budgetItems);
  } catch (err: any) {
    console.error("API GET Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const body = await req.json();
    const { id, assigned, paid, isFixed, category, item } = body;
    if (!id || assigned === undefined || paid === undefined) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }
    await updateBudgetItem(id, assigned, paid, isFixed ?? false, category, item, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de elemento faltante" }, { status: 400 });
    }
    await deleteBudgetItem(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
