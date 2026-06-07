import { NextResponse } from "next/server";
import { initDb, getBudgetItems, updateBudgetItem, deleteBudgetItem } from "@/lib/db";

// API handler for GET, POST, and DELETE budget items
export async function GET(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const budgetItems = await getBudgetItems(userId);
    return NextResponse.json(budgetItems);
  } catch (err: any) {
    console.error("API GET Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const body = await req.json();
    const { id, assigned, paid, isFixed, category, item } = body;
    if (!id || assigned === undefined || paid === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await updateBudgetItem(id, assigned, paid, isFixed ?? false, category, item, userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API POST Budget failed:", err);
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
      return NextResponse.json({ error: "Missing budget item ID" }, { status: 400 });
    }
    await deleteBudgetItem(id, userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Budget failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
