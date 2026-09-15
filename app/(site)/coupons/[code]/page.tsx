import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { getCouponByCode } from "@/lib/coupons";
import { isPartnerEmail } from "@/lib/partner";
import { generateQrDataUrl } from "@/lib/qr";
import { formatDepartAt } from "@/lib/format-date";
import { redeemCouponAction } from "./actions";

export default async function CouponPage({ params }: PageProps<"/coupons/[code]">) {
  const { code } = await params;

  const session = await auth();
  if (!session?.user) redirect(`/login?callbackUrl=/coupons/${code}`);

  const coupon = await getCouponByCode(code);
  if (!coupon) notFound();

  const isOwner = coupon.userId === session.user.id;
  const isPartner = isPartnerEmail(session.user.email);
  const qrDataUrl = isOwner
    ? await generateQrDataUrl(`${process.env.AUTH_URL ?? "http://localhost:3000"}/coupons/${coupon.code}`)
    : null;

  if (!isOwner && !isPartner) {
    return (
      <div className="mx-auto max-w-sm">
        <p className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          You don&apos;t have access to this coupon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-bold text-card-foreground">$5 off — haircut or facial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {coupon.post.origin} → {coupon.post.destination}
        </p>
        <p className="text-xs text-muted-foreground">{formatDepartAt(coupon.post.departAt, "long")}</p>

        {isOwner && qrDataUrl && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- a data: URI, next/image can't optimize it anyway */}
            <img
              src={qrDataUrl}
              alt={`QR code for coupon ${coupon.code}`}
              width={220}
              height={220}
              className="mx-auto my-4"
            />
            <p className="font-mono text-xs tracking-wide text-muted-foreground">{coupon.code}</p>
          </>
        )}

        <p
          className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
            coupon.redeemed
              ? "bg-muted text-muted-foreground"
              : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {coupon.redeemed ? "Redeemed" : "Available"}
        </p>
      </div>

      {isPartner && (
        <div className="rounded-xl border border-accent/30 bg-accent/10 p-4 text-center">
          <p className="text-sm text-foreground">
            For <strong>{coupon.user?.name ?? "a rider"}</strong>
          </p>
          {coupon.redeemed ? (
            <p className="mt-2 text-sm font-semibold text-muted-foreground">
              Already redeemed{coupon.redeemedAt ? ` on ${formatDepartAt(coupon.redeemedAt, "long")}` : ""}.
            </p>
          ) : (
            <form action={redeemCouponAction.bind(null, coupon.code)} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-full bg-gradient-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
              >
                Redeem $5 coupon
              </button>
            </form>
          )}
        </div>
      )}

      {isOwner && !isPartner && (
        <p className="text-center text-xs text-muted-foreground">
          Show this QR code at Guins Barber Shop to redeem it — good for a haircut, or a facial
          (bring your own kit).
        </p>
      )}
    </div>
  );
}
