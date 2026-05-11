import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ALLOWED_TARGETS = new Set(["meal_logs", "step_logs", "profiles"]);

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  const decision = String(body.decision || ""); // approved/rejected
  const admin_note = String(body.admin_note || "");

  if (!id) return NextResponse.json({ ok: false, error: "missing id" }, { status: 400 });
  if (!["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ ok: false, error: "decision must be approved|rejected" }, { status: 400 });
  }

  const { data: reqRow, error: e1 } = await supabaseAdmin
    .from("edit_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 400 });
  if (reqRow.status !== "pending") {
    return NextResponse.json({ ok: false, error: "already decided" }, { status: 400 });
  }

  // Update request status
  const { error: e2 } = await supabaseAdmin
    .from("edit_requests")
    .update({
      status: decision,
      admin_id: auth.user!.id,
      admin_note,
      decided_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 400 });

  // Apply patch only when approved
  if (decision === "approved") {
    const target_table = String(reqRow.target_table);
    if (!ALLOWED_TARGETS.has(target_table)) {
      return NextResponse.json({ ok: false, error: `target_table not allowed: ${target_table}` }, { status: 400 });
    }

    const patch = reqRow.patch || {};
    const target_id = reqRow.target_id;

    // NOTE: This is intentionally conservative. Admin can always directly edit in Supabase Studio.
    const { error: e3 } = await supabaseAdmin
      .from(target_table)
      .update(patch)
      .eq("id", target_id);

    if (e3) return NextResponse.json({ ok: false, error: e3.message }, { status: 400 });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: auth.user!.id,
      action: "edit_request_approved_apply",
      target: `${target_table}:${target_id}`,
      detail: { request_id: id, patch },
    });
  } else {
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: auth.user!.id,
      action: "edit_request_rejected",
      target: `edit_requests:${id}`,
      detail: { admin_note },
    });
  }

  return NextResponse.json({ ok: true });
}
