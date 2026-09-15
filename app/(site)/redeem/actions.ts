"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPartnerEmail } from "@/lib/partner";

/** Just routes a hand-typed code to its coupon page -- redemption itself
 * happens there (coupons/[code]/actions.ts) so there's one code path for
 * "confirm and redeem," whether the partner arrived by scanning a QR or by
 * typing the code in here. */
export async function lookUpCouponAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/redeem`);
  // Not a user-facing case in normal use -- the page itself already
  // redirects a non-partner away before this form ever renders -- but
  // redirect rather than throw so a stale session doesn't crash the page.
  if (!isPartnerEmail(session.user.email)) redirect("/dashboard");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) redirect("/redeem?error=empty");

  redirect(`/coupons/${encodeURIComponent(code)}`);
}
