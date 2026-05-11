import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function getUserFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return { user: null, error: "Missing Authorization Bearer token" };

  const token = m[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function requireAdmin(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return { ok: false, user: null, error };

  const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase();
  if (adminEmail && (user.email || "").toLowerCase() === adminEmail) {
    return { ok: true, user, error: null };
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.role === "admin") return { ok: true, user, error: null };
  return { ok: false, user, error: "Not admin" };
}
