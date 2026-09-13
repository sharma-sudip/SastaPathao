import { NextResponse } from "next/server";
import { purgeOldPosts } from "@/lib/retention";

// Hit daily by Vercel Cron (vercel.json). Gated on CRON_SECRET -- Vercel
// signs its own cron requests with `Authorization: Bearer $CRON_SECRET`
// automatically once that env var is set, so this also blocks the route
// from being triggered by anyone who just finds the URL. In local dev,
// where CRON_SECRET typically isn't set, the check is skipped so this stays
// easy to hit by hand for testing.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { deletedCount } = await purgeOldPosts();
  return NextResponse.json({ ok: true, deletedCount });
}
