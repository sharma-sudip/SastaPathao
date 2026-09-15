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
  if (!isPartnerEmail(session.user.email)) throw new Error("Forbidden.");

  const code = String(formData.get("code") ?? "").trim();
  if (!code) throw new Error("Enter a coupon code.");

  redirect(`/coupons/${encodeURIComponent(code)}`);
}
