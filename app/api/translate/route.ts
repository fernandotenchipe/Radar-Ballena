import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = body?.text;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 },
      );
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: "Translate to Spanish. Keep it short." },
          { role: "user", content: text },
        ],
        max_tokens: 120,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("OpenAI translate error:", res.status, errText);
      return NextResponse.json(
        { error: "Translation service error" },
        { status: 502 },
      );
    }

    const data = await res.json();
    const translated = data?.choices?.[0]?.message?.content ?? text;

    return NextResponse.json({ text: translated });
  } catch (err) {
    console.error("Translation route failed:", err);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
