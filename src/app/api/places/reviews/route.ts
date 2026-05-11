import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  const { placeId, languageCode = "zh-TW" } = await req.json();
  if (!placeId) return NextResponse.json({ error: "missing placeId" }, { status: 400 });

  const fieldMask = ["id", "displayName", "googleMapsUri", "reviews"].join(",");

  const resp = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${encodeURIComponent(languageCode)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
    }
  );

  const data = await resp.json();
  if (!resp.ok) return NextResponse.json({ error: data }, { status: resp.status });

  return NextResponse.json({
    place: { id: data.id, name: data.displayName, googleMapsUri: data.googleMapsUri },
    reviews: data.reviews || [],
    note: "Google Places reviews 通常最多回傳 5 則且無分頁；屬於 Google 精選相關評論。",
  });
}
