import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

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

  const daily: Record<string, { kcal: number; protein: number; steps: number }> = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    daily[isoDate(d)] = { kcal: 0, protein: 0, steps: 0 };
  }

  (meals || []).forEach((m: any) => {
    const day = String(m.created_at).slice(0, 10);
    if (!daily[day]) return;
    daily[day].kcal += Number(m.total_kcal || 0);
    daily[day].protein += Number(m.protein_g || 0);
  });

  (stepsRows || []).forEach((s: any) => {
    const day = String(s.created_at);
    if (!daily[day]) return;
    daily[day].steps = Number(s.steps || 0);
  });

  const summary = Object.entries(daily).reduce(
    (acc, [day, v]) => {
      acc.totalKcal += v.kcal;
      acc.totalProtein += v.protein;
      acc.totalSteps += v.steps;
      acc.days.push({ day, ...v });
      return acc;
    },
    { totalKcal: 0, totalProtein: 0, totalSteps: 0, days: [] as any[] }
  );

  summary.days.sort((a, b) => (a.day < b.day ? -1 : 1));

  return NextResponse.json({
    range: { start: startDay, end: today },
    ...summary,
  });
}
