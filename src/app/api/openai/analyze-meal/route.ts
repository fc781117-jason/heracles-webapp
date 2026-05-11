import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const imageUrl = body.imageUrl;
  if (!imageUrl) return NextResponse.json({ error: "missing imageUrl" }, { status: 400 });

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const key = process.env.OPENAI_API_KEY;
  if (!key) return NextResponse.json({ error: "missing OPENAI_API_KEY" }, { status: 500 });

  const prompt = `你是營養資料檢索員（不要編造營養數字）。\n\n請你只做一件事：辨識圖片中的主要食物項目，並分類項目類型。\n\n輸出必須是嚴格 JSON（不要任何多餘文字）：\n{\n  "items": [\n    {"name":"","confidence":0.0,"kind":"carb|protein|veg|fat|drink|unknown","notes":""}\n  ],\n  "meal_guess": "breakfast|lunch|dinner|snack|unknown"\n}`;

  const payload = {
    model,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: prompt },
          { type: "input_image", image_url: imageUrl },
        ],
      },
    ],
  };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });

  const data = await resp.json();
  if (!resp.ok) return NextResponse.json({ error: data }, { status: resp.status });

  const text =
    data.output
      ?.flatMap((o: any) => o.content || [])
      ?.filter((c: any) => c.type === "output_text")
      ?.map((c: any) => c.text)
      ?.join("") || "";

  let parsed: any = null;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }

  return NextResponse.json({ parsed });
}
