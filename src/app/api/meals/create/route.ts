import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const COIN_MM: Record<string, number> = { "50": 28, "10": 26, "5": 22, "1": 20 };

function pickNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function extractMacrosFromUSDA(food: any) {
  const ns = food?.foodNutrients || [];

  const find = (pred: (n: any) => boolean) => {
    const hit = ns.find(pred);
    return hit ? pickNumber(hit.value) : 0;
  };

  // Energy (kcal)
  const kcal =
    find((n) => String(n.nutrientName || "").toLowerCase() === "energy" && String(n.unitName || "").toUpperCase() === "KCAL") ||
    find((n) => String(n.nutrientName || "").toLowerCase().includes("energy") && String(n.unitName || "").toUpperCase() === "KCAL");

  const protein = find((n) => String(n.nutrientName || "").toLowerCase() === "protein");
  const fat = find((n) => String(n.nutrientName || "").toLowerCase().includes("total lipid"));
  const carbs = find((n) => String(n.nutrientName || "").toLowerCase().includes("carbohydrate"));

  return { kcal, protein, fat, carbs };
}

async function resolveUSDAByName(name: string) {
  const key = process.env.USDA_API_KEY;
  if (!key) throw new Error("missing USDA_API_KEY");

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", name);
  url.searchParams.set("pageSize", "5");

  const resp = await fetch(url.toString());
  const data = await resp.json();
  if (!resp.ok) throw new Error(`USDA error: ${JSON.stringify(data).slice(0, 500)}`);

  const food = data?.foods?.[0];
  if (!food) return null;

  const fdcId = String(food.fdcId || "");
  const desc = String(food.description || name);
  const macros = extractMacrosFromUSDA(food);

  return { fdcId, desc, macros, raw: food };
}

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const coin = String(body.coin || "");
  const coinPx = Number(body.coinPx || 0);
  const image_path = String(body.image_path || "");
  const meal_type = String(body.meal_type || "unknown");
  const rawItems = Array.isArray(body.items) ? body.items : [];

  if (!COIN_MM[coin]) return NextResponse.json({ ok: false, error: "invalid coin" }, { status: 400 });
  if (!coinPx || coinPx < 20) return NextResponse.json({ ok: false, error: "invalid coinPx" }, { status: 400 });
  if (!image_path) return NextResponse.json({ ok: false, error: "missing image_path" }, { status: 400 });

  if (!rawItems.length) return NextResponse.json({ ok: false, error: "missing items" }, { status: 400 });

  const meta = {
    image_path,
    coin,
    coin_mm: COIN_MM[coin],
    coin_px: coinPx,
    px_per_mm: coinPx / COIN_MM[coin],
  };

  // Resolve nutrition via USDA (MVP). Cache by fdcId if foods table exists.
  const finalItems: any[] = [];
  let totalKcal = 0;
  let totalProtein = 0;
  let totalCarbs = 0;
  let totalFat = 0;

  for (const it of rawItems) {
    const name = String(it.name || "").slice(0, 120);
    const grams = pickNumber(it.grams);
    const unit = String(it.unit || "");
    const multiplier = pickNumber(it.multiplier);
    const kind = String(it.kind || "unknown");
    const confidence = pickNumber(it.confidence);

    if (!name || !grams) continue;

    const resolved = await resolveUSDAByName(name);
    let nutrition = { kcal100: 0, protein100: 0, carbs100: 0, fat100: 0 };
    let fdcId = "";
    let canonicalName = name;

    if (resolved) {
      fdcId = resolved.fdcId;
      canonicalName = resolved.desc;
      nutrition = {
        kcal100: resolved.macros.kcal,
        protein100: resolved.macros.protein,
        carbs100: resolved.macros.carbs,
        fat100: resolved.macros.fat,
      };

      // cache (best-effort)
      try {
        await supabaseAdmin
          .from("foods")
          .upsert(
            {
              source: "usda",
              external_id: fdcId,
              name: canonicalName,
              nutrients_per_100g: nutrition,
              raw: resolved.raw,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "source,external_id" }
          );
      } catch {
        // ignore if foods table not created yet
      }
    }

    const factor = grams / 100;
    const kcal = nutrition.kcal100 * factor;
    const protein = nutrition.protein100 * factor;
    const carbs = nutrition.carbs100 * factor;
    const fat = nutrition.fat100 * factor;

    totalKcal += kcal;
    totalProtein += protein;
    totalCarbs += carbs;
    totalFat += fat;

    finalItems.push({
      name,
      canonicalName,
      kind,
      confidence,
      unit,
      multiplier,
      grams,
      fdcId,
      nutrition_per_100g: nutrition,
      computed: { kcal, protein, carbs, fat },
    });
  }

  if (!finalItems.length) return NextResponse.json({ ok: false, error: "items invalid" }, { status: 400 });

  const { data, error: e1 } = await supabaseAdmin
    .from("meal_logs")
    .insert({
      user_id: user.id,
      meal_type,
      items: finalItems,
      total_kcal: Math.round(totalKcal),
      protein_g: Math.round(totalProtein * 10) / 10,
      carbs_g: Math.round(totalCarbs * 10) / 10,
      fat_g: Math.round(totalFat * 10) / 10,
      verification_level: "gold",
      verified: true,
      meta,
    })
    .select("id")
    .single();

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

  // reward coins (baseline)
  await supabaseAdmin.from("coin_ledger").insert({
    user_id: user.id,
    delta: 10,
    reason: "meal_log_created",
    meta: { meal_log_id: data.id },
  });

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: user.id,
    action: "meal_log_created",
    target: `meal_logs:${data.id}`,
    detail: { meta, items_count: finalItems.length, total_kcal: Math.round(totalKcal) },
  });

  return NextResponse.json({ ok: true, id: data.id, totals: { kcal: Math.round(totalKcal), protein: totalProtein, carbs: totalCarbs, fat: totalFat } });
}
