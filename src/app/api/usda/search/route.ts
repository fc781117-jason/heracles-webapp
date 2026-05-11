import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";

export async function GET(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const key = process.env.USDA_API_KEY;
  if (!key) return NextResponse.json({ error: "missing USDA_API_KEY" }, { status: 500 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) return NextResponse.json({ error: "missing q" }, { status: 400 });

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", key);
  url.searchParams.set("query", q);
  url.searchParams.set("pageSize", "10");

  const resp = await fetch(url.toString());
  const data = await resp.json();
  if (!resp.ok) return NextResponse.json({ error: data }, { status: resp.status });

  return NextResponse.json(data);
}
