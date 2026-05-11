import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: 403 });

  const tables = [
    "profiles",
    "meal_logs",
    "step_logs",
    "coin_ledger",
    "dislikes",
    "spin_logs",
    "edit_requests",
    "audit_logs",
    "app_settings",
  ] as const;

  const out: any = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of tables) {
    const { data, error } = await supabaseAdmin.from(t).select("*");
    out.tables[t] = { data: data || [], error: error?.message || null };
  }

  await supabaseAdmin.from("audit_logs").insert({
    actor_id: auth.user!.id,
    action: "admin_export",
    target: "all_tables",
    detail: { tables },
  });

  const json = JSON.stringify(out);
  return new NextResponse(json, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="heracles_export_${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
