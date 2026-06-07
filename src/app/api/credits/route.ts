import { NextResponse } from "next/server";
import { initDb, getCredits, addCredit, deleteCredit, Credit } from "@/lib/db";

export async function GET(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const credits = await getCredits(userId);
    return NextResponse.json(credits);
  } catch (err: any) {
    console.error("API GET Credits failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await initDb();
    const userId = req.headers.get("x-user-id") || "default";
    const body: Credit = await req.json();
    if (!body.id || !body.name || body.totalAmount === undefined || body.remainingAmount === undefined || body.monthlyPayment === undefined || body.totalInstallments === undefined || body.paidInstallments === undefined || !body.category) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    await addCredit(body, userId);
    return NextResponse.json({ success: true, credit: body });
  } catch (err: any) {
    console.error("API POST Credit failed:", err);
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
      return NextResponse.json({ error: "Missing credit ID" }, { status: 400 });
    }
    await deleteCredit(id, userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Credit failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
