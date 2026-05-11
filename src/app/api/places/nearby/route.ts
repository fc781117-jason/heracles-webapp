import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/server-auth";

export async function POST(req: NextRequest) {
  const { user, error } = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ error }, { status: 401 });

  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return NextResponse.json({ error: "missing GOOGLE_MAPS_API_KEY" }, { status: 500 });

  const { lat, lng, radius = 1200, languageCode = "zh-TW" } = await req.json();
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "lat/lng must be numbers" }, { status: 400 });
  }

  const url = "https://places.googleapis.com/v1/places:searchNearby";

  // Cost control: list request (avoid rating/openingHours/reviews in list)
  const fieldMask = [
    "places.id",
    "places.displayName",
    "places.formattedAddress",
    "places.location",
    "places.types"
  ].join(",");

  const body = {
    languageCode,
    locationRestriction: {
      circle: { center: { latitude: lat, longitude: lng }, radius }
    },
    includedTypes: ["restaurant"],
    maxResultCount: 20
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json();
  if (!resp.ok) return NextResponse.json({ error: data }, { status: resp.status });

  return NextResponse.json({ places: data.places || [] });
}
