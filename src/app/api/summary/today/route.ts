import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const today = new Date().toISOString().slice(0, 10);

  const { data: meals } = await supabaseAdmin
    .from("meal_logs")
    .select("created_at,total_kcal,protein_g,carbs_g,fat_g,meal_type")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  const { data: stepsRow } = await supabaseAdmin
    .from("step_logs")
    .select("steps")
    .eq("user_id", user.id)
    .eq("created_at", today)
    .maybeSingle();

  const { data: coins } = await supabaseAdmin
    .from("coin_ledger")
    .select("delta")
    .eq("user_id", user.id)
    .gte("created_at", `${today}T00:00:00.000Z`)
    .lte("created_at", `${today}T23:59:59.999Z`);

  const kcal = (meals || []).reduce((s, x) => s + Number(x.total_kcal || 0), 0);
  const protein = (meals || []).reduce((s, x) => s + Number(x.protein_g || 0), 0);
  const carbs = (meals || []).reduce((s, x) => s + Number(x.carbs_g || 0), 0);
  const fat = (meals || []).reduce((s, x) => s + Number(x.fat_g || 0), 0);
  const steps = Number(stepsRow?.steps || 0);
  const coinsToday = (coins || []).reduce((s, x) => s + Number(x.delta || 0), 0);

  const mealCounts = (meals || []).reduce(
    (acc: any, m: any) => {
      const k = String(m.meal_type || "unknown");
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    },
    { breakfast: 0, lunch: 0, dinner: 0, snack: 0, unknown: 0 }
  );

  return NextResponse.json({
    date: today,
    kcal,
    protein,
    carbs,
    fat,
    steps,
    coinsToday,
    mealsCount: (meals || []).length,
    mealCounts,
  });
}
