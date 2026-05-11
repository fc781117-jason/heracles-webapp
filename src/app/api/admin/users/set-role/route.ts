import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function findUserIdByEmail(email: string) {
  // supabase-js v2 沒有 getUserByEmail，改用 listUsers 找
  const perPage = 200;

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) return { userId: null as string | null, error: error.message };

    const user = (data?.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );

    if (user?.id) return { userId: user.id, error: null };

    // 如果這一頁不到 perPage，代表已經到底了
    if ((data?.users || []).length < perPage) break;
  }

  return { userId: null, error: "user not found (user must sign in at least once)" };
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const role = String(body.role || "vip").trim();
  const vipDays = body.vipDays === undefined ? null : Number(body.vipDays);

  if (!email || !email.includes("@")) {
    return NextResponse.json({ ok: false, error: "invalid email" }, { status: 400 });
  }
  if (!["user", "vip", "admin"].includes(role)) {
    return NextResponse.json({ ok: false, error: "role must be user|vip|admin" }, { status: 400 });
  }
  if (vipDays !== null && (!Number.isFinite(vipDays) || vipDays < 0 || vipDays > 3650)) {
    return NextResponse.json({ ok: false, error: "invalid vipDays" }, { status: 400 });
  }

  const found = await findUserIdByEmail(email);
  if (!found.userId) {
    return NextResponse.json({ ok: false, error: found.error }, { status: 400 });
  }
  const userId = found.userId;

  let vip_until: string | null = null;
  if (role === "vip") {
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
