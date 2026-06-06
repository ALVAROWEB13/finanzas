import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const hasUrl = !!process.env.DATABASE_URL;
  const urlSnippet = process.env.DATABASE_URL 
    ? process.env.DATABASE_URL.split("@")[1] || "exists-but-no-at-sign"
    : "not-set";

  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        connected: false,
        reason: "DATABASE_URL environment variable is missing on Vercel.",
        urlSnippet
      });
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    let budgetCount = 0;
    let transactionCount = 0;
    
    try {
      const budgetRes = await client.query("SELECT COUNT(*) FROM budget_items");
      budgetCount = parseInt(budgetRes.rows[0].count);
    } catch(e) {}

    try {
      const txRes = await client.query("SELECT COUNT(*) FROM transactions");
      transactionCount = parseInt(txRes.rows[0].count);
    } catch(e) {}

    client.release();
    await pool.end();

    return NextResponse.json({
      connected: true,
      urlSnippet,
      tables: tablesRes.rows.map(r => r.table_name),
      counts: {
        budget_items: budgetCount,
        transactions: transactionCount
      }
    });

  } catch (err: any) {
    return NextResponse.json({
      connected: false,
      error: err.message,
      stack: err.stack,
      urlSnippet
    });
  }
}
