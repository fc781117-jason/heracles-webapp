import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const weight_kg = body.weight_kg === null || body.weight_kg === undefined ? null : Number(body.weight_kg);
  const body_fat_pct = body.body_fat_pct === null || body.body_fat_pct === undefined ? null : Number(body.body_fat_pct);
  const note = String(body.note || "").slice(0, 200);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
  }

  if (weight_kg !== null && (!Number.isFinite(weight_kg) || weight_kg < 20 || weight_kg > 500)) {
    return NextResponse.json({ ok: false, error: "invalid weight" }, { status: 400 });
  }

  if (body_fat_pct !== null && (!Number.isFinite(body_fat_pct) || body_fat_pct < 0 || body_fat_pct > 80)) {
    return NextResponse.json({ ok: false, error: "invalid body_fat_pct" }, { status: 400 });
  }

  const { error: e1 } = await supabaseAdmin
    .from("body_metrics")
    .upsert(
      { user_id: user.id, created_at: date, weight_kg, body_fat_pct, note },
      { onConflict: "user_id,created_at" }
    );

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
