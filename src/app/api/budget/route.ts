import { NextResponse } from "next/server";
import { initDb, getBudgetItems, updateBudgetItem, deleteBudgetItem } from "@/lib/db";

export async function GET() {
  try {
    await initDb();
    const budgetItems = await getBudgetItems();
    return NextResponse.json(budgetItems);
  } catch (err: any) {
    console.error("API GET Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const body = await req.json();
    if (!body.id || body.assigned === undefined || body.paid === undefined || body.isFixed === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await updateBudgetItem(body.id, body.assigned, body.paid, body.isFixed, body.category, body.item);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await initDb();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing budget item ID" }, { status: 400 });
    }
    await deleteBudgetItem(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
