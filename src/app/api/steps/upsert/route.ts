import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const date = String(body.date || new Date().toISOString().slice(0, 10));
  const steps = Number(body.steps || 0);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
  }
  if (!Number.isFinite(steps) || steps < 0 || steps > 200000) {
    return NextResponse.json({ ok: false, error: "invalid steps" }, { status: 400 });
  }

  const { error: e1 } = await supabaseAdmin
    .from("step_logs")
    .upsert({ user_id: user.id, created_at: date, steps }, { onConflict: "user_id,created_at" });

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
