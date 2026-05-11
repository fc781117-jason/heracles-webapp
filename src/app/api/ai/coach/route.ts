import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  if (!key) return NextResponse.json({ error: "missing OPENAI_API_KEY" }, { status: 500 });

  const { kind } = await req.json().catch(() => ({}));
  const mode: "daily" | "weekly" = kind === "weekly" ? "weekly" : "daily";

  const today = isoDate(new Date());
  const start = new Date();
  start.setDate(start.getDate() - 6);
  const startDay = isoDate(start);

  const { data: meals } = await supabaseAdmin
    .from("meal_logs")
    .select("created_at,total_kcal,protein_g")
    .eq("user_id", user.id)
    .gte("created_at", `${startDay}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  const { data: stepsRows } = await supabaseAdmin
    .from("step_logs")
    .select("created_at,steps")
    .eq("user_id", user.id)
    .gte("created_at", startDay)
    .lte("created_at", today);

  const todayMeals = (meals || []).filter((m: any) => String(m.created_at).startsWith(today));
  const todayKcal = todayMeals.reduce((s: number, x: any) => s + Number(x.total_kcal || 0), 0);
  const todayProtein = todayMeals.reduce((s: number, x: any) => s + Number(x.protein_g || 0), 0);
  const todaySteps = Number((stepsRows || []).find((s: any) => s.created_at === today)?.steps || 0);

  const weekKcal = (meals || []).reduce((s: number, x: any) => s + Number(x.total_kcal || 0), 0);
  const weekProtein = (meals || []).reduce((s: number, x: any) => s + Number(x.protein_g || 0), 0);
  const weekSteps = (stepsRows || []).reduce((s: number, x: any) => s + Number(x.steps || 0), 0);

  const sys = `你是 Heracles 的教練「喀戎」。語氣：溫和、務實、激勵但不浮誇。輸出繁體中文。`;
  const userPrompt = mode === "daily"
    ? `請根據今日數據給 3 點可執行建議（每點 <= 30 字），最後補一句鼓勵。
今日：熱量 ${todayKcal}kcal、蛋白 ${todayProtein}g、步數 ${todaySteps}。`
    : `請用「神話報告」風格寫一段本週回顧（150~220字），再列出下週 3 個目標（條列），最後一句鼓勵。
本週（7天）：總熱量 ${weekKcal}kcal、總蛋白 ${weekProtein}g、總步數 ${weekSteps}。`;

  const payload = {
    model,
    input: [
      { role: "system", content: [{ type: "input_text", text: sys }] },
      { role: "user", content: [{ type: "input_text", text: userPrompt }] },
    ],
  };

  const resp = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
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

  return NextResponse.json({ text });
}
