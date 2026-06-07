import { NextResponse } from "next/server";
import { initDb, getCredits, addCredit, deleteCredit, Credit } from "@/lib/db";
import { authenticateRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const credits = await getCredits(auth.userId);
    return NextResponse.json(credits);
  } catch (err: any) {
    console.error("API GET Credits failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = authenticateRequest(req);
  if (!auth) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    await initDb();
    const body: Credit = await req.json();
    if (
      !body.id || !body.name ||
      body.totalAmount === undefined || body.remainingAmount === undefined ||
      body.monthlyPayment === undefined || body.totalInstallments === undefined ||
      body.paidInstallments === undefined || !body.category
    ) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }
    await addCredit(body, auth.userId);
    return NextResponse.json({ success: true, credit: body });
  } catch (err: any) {
    console.error("API POST Credit failed:", err);
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
      return NextResponse.json({ error: "ID de crédito faltante" }, { status: 400 });
    }
    await deleteCredit(id, auth.userId);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("API DELETE Credit failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
