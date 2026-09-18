import { NextRequest, NextResponse } from "next/server";
import { reverseGeocode } from "@/lib/geocode";

export async function GET(req: NextRequest) {
  const lat = parseFloat(req.nextUrl.searchParams.get("lat") ?? "");
  const lon = parseFloat(req.nextUrl.searchParams.get("lon") ?? "");
  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    return NextResponse.json({ displayName: null }, { status: 400 });
  }
  const displayName = await reverseGeocode(lat, lon);
  return NextResponse.json({ displayName });
}
