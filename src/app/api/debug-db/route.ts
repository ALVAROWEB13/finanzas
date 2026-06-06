import { NextResponse } from "next/server";
import { Pool } from "pg";

export async function GET() {
  const connectionString = 
    process.env.DATABASE_URL || 
    process.env.POSTGRES_URL || 
    process.env.SUPABASE_DATABASE_URL ||
    process.env.POSTGRES_URL_NON_POOLING;

  let envVarName = "none";
  if (process.env.DATABASE_URL) envVarName = "DATABASE_URL";
  else if (process.env.POSTGRES_URL) envVarName = "POSTGRES_URL";
  else if (process.env.SUPABASE_DATABASE_URL) envVarName = "SUPABASE_DATABASE_URL";
  else if (process.env.POSTGRES_URL_NON_POOLING) envVarName = "POSTGRES_URL_NON_POOLING";

  const urlSnippet = connectionString 
    ? connectionString.split("@")[1] || "exists-but-no-at-sign"
    : "not-set";

  try {
    if (!connectionString) {
      return NextResponse.json({
        connected: false,
        reason: "No database connection environment variable was found (checked DATABASE_URL, POSTGRES_URL, SUPABASE_DATABASE_URL, POSTGRES_URL_NON_POOLING).",
        envVarsAvailable: Object.keys(process.env).filter(k => k.includes("URL") || k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("SUPABASE"))
      });
    }

    const pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });

    const client = await pool.connect();
    
    // Create tables if they do not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS budget_items (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(100) NOT NULL,
        item VARCHAR(100) NOT NULL,
        assigned INT NOT NULL,
        paid INT NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        description VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount INT NOT NULL
      );
    `);

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
      usedEnvVar: envVarName,
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
      usedEnvVar: envVarName,
      urlSnippet,
      envVarsAvailable: Object.keys(process.env).filter(k => k.includes("URL") || k.includes("POSTGRES") || k.includes("DATABASE") || k.includes("SUPABASE"))
    });
  }
}
