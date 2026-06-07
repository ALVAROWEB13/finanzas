import { NextResponse } from "next/server";
import { initDb, getTransactions, addTransaction, deleteTransaction, Transaction } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

// API handler for GET, POST, and DELETE transactions
export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const transactions = await getTransactions(auth.userId);
    return NextResponse.json(transactions);
  } catch (err: any) {
    console.error("API GET Transactions failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const body: Transaction = await req.json();
    if (!body.description || !body.category || body.amount === undefined) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }
    await addTransaction(body, auth.userId);
    return NextResponse.json({ success: true, transaction: body });
  } catch (err: any) {
    console.error("API POST Transaction failed:", err);
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
      return NextResponse.json({ error: "ID de transacción faltante" }, { status: 400 });
    }
    await deleteTransaction(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Transaction failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
