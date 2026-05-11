import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const nickname = String(body.nickname || "").trim().slice(0, 30);

  const { error: e2 } = await supabaseAdmin.from("profiles").update({ nickname }).eq("id", user.id);
  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: user.id,
    action: "profile_update",
    target: `profiles:${user.id}`,
    detail: { nickname },
  });

  return NextResponse.json({ ok: true });
}
