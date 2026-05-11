import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "vip").trim();
  const vipDays = body.vipDays === undefined ? null : Number(body.vipDays);

  if (!email || !email.includes("@")) return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  if (!['user','vip','admin'].includes(role)) return NextResponse.json({ ok: false, error: "role must be user|vip|admin" }, { status: 400 });
  if (vipDays !== null && (!Number.isFinite(vipDays) || vipDays < 0 || vipDays > 3650)) {
    return NextResponse.json({ ok: false, error: "invalid vipDays" }, { status: 400 });
  }

  const { data: u, error: e0 } = await supabaseAdmin.auth.admin.getUserByEmail(email);
  if (e0 || !u?.user) return NextResponse.json({ ok: false, error: e0?.message || "user not found" }, { status: 400 });

  const userId = u.user.id;

  let vip_until: string | null = null;
  if (role === 'vip') {
    const days = vipDays ?? 30;
    const d = new Date();
    d.setDate(d.getDate() + days);
    vip_until = d.toISOString();
  }

  const { error: e1 } = await supabaseAdmin
    .from("profiles")
    .upsert({ id: userId, role, vip_until }, { onConflict: "id" });

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: auth.user!.id,
    action: "admin_set_role",
    target: `profiles:${userId}`,
    detail: { email, role, vip_until },
  });

  return NextResponse.json({ ok: true, userId, role, vip_until });
}
