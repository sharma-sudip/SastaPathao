import { NextRequest, NextResponse } from "next/server";
import { getDrivingRoute } from "@/lib/directions";

export async function GET(req: NextRequest) {
  const originLat = parseFloat(req.nextUrl.searchParams.get("originLat") ?? "");
  const originLng = parseFloat(req.nextUrl.searchParams.get("originLng") ?? "");
  const destLat = parseFloat(req.nextUrl.searchParams.get("destLat") ?? "");
  const destLng = parseFloat(req.nextUrl.searchParams.get("destLng") ?? "");

  if ([originLat, originLng, destLat, destLng].some(Number.isNaN)) {
    return NextResponse.json({ route: null }, { status: 400 });
  }

  const route = await getDrivingRoute({ lat: originLat, lng: originLng }, { lat: destLat, lng: destLng });
  return NextResponse.json({ route });
}
