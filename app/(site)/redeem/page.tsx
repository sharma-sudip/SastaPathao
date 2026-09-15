import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isPartnerEmail } from "@/lib/partner";
import { lookUpCouponAction } from "./actions";

// Entry point for our partner, Guins Barber Shop: scanning a rider's QR with their
// phone's camera app opens /coupons/[code] directly (the QR encodes that
// full URL), but there was no way to redeem a coupon if the QR won't scan
// or the code was read out loud instead -- this is that fallback, and the
// only thing linked from the nav for the partner account.
export default async function RedeemPage({ searchParams }: PageProps<"/redeem">) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/redeem");
  if (!isPartnerEmail(session.user.email)) redirect("/dashboard");

  const params = await searchParams;
  const hasError = params?.error === "empty";

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground">Redeem a coupon</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Scan a rider&apos;s QR code with your phone&apos;s camera, or enter their code below.
        </p>
      </div>
      {hasError && (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          Enter a coupon code first.
        </p>
      )}
      <form action={lookUpCouponAction} className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
        <label htmlFor="code" className="block text-sm font-medium text-foreground">
          Coupon code
        </label>
        <input
          id="code"
          name="code"
          type="text"
          required
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          placeholder="e.g. 4f2a1c9e-..."
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
        >
          Look up
        </button>
      </form>
    </div>
  );
}
