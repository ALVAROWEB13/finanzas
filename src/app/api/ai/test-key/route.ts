import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "No key configured" });
  }

  const results: Record<string, any> = {};
  const models = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite"];

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
      });
      const text = await res.text();
      results[model] = {
        status: res.status,
        response: text.slice(0, 300)
      };
    } catch (err: any) {
      results[model] = { error: err.message };
    }
  }

  const maskedKey = apiKey.substring(0, 5) + "..." + apiKey.substring(apiKey.length - 5);

  return NextResponse.json({
    maskedKey,
    keyLength: apiKey.length,
    results
  });
}
