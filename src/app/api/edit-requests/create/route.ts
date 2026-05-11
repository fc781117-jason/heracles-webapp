import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_TARGETS = new Set(["meal_logs", "step_logs", "profiles"]);

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ ok: false, error }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const target_table = String(body.target_table || "");
  const target_id = body.target_id || null;
  const patch = body.patch || null;
  const reason = String(body.reason || "").slice(0, 200);

  if (!ALLOWED_TARGETS.has(target_table)) {
    return NextResponse.json({ ok: false, error: "target_table not allowed" }, { status: 400 });
  }
  if (!patch || typeof patch !== "object") {
    return NextResponse.json({ ok: false, error: "missing patch" }, { status: 400 });
  }

  // Basic safety: limit number of keys
  if (Object.keys(patch).length > 12) {
    return NextResponse.json({ ok: false, error: "patch too large" }, { status: 400 });
  }

  const { error: e1 } = await supabaseAdmin.from("edit_requests").insert({
    requester_id: user.id,
    target_table,
    target_id,
    patch,
    reason,
    status: "pending",
  });

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: user.id,
    action: "edit_request_created",
    target: `${target_table}:${target_id || "(none)"}`,
    detail: { patch, reason },
  });

  return NextResponse.json({ ok: true });
}
