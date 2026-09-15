"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { redeemCoupon } from "@/lib/coupons";
import { isPartnerEmail } from "@/lib/partner";

export async function redeemCouponAction(code: string) {
  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/coupons/${code}`);
  if (!isPartnerEmail(session.user.email)) throw new Error("Forbidden.");

  await redeemCoupon(code, session.user.id);
  revalidatePath(`/coupons/${code}`);
}
