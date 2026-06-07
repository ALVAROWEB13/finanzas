import { NextResponse } from "next/server";
import { initDb, getTransactions, addTransaction, deleteTransaction, Transaction } from "@/lib/db";

// API handler for GET and POST transactions
export async function GET(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const transactions = await getTransactions(userId);
    return NextResponse.json(transactions);
  } catch (err: any) {
    console.error("API GET Transactions failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const body: Transaction = await req.json();
    if (!body.description || !body.category || body.amount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await addTransaction(body, userId);
    return NextResponse.json({ success: true, transaction: body });
  } catch (err: any) {
    console.error("API POST Transaction failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing transaction ID" }, { status: 400 });
    }
    await deleteTransaction(id, userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Transaction failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
