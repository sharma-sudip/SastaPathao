export default async function VerifyRequestPage({
  searchParams,
}: PageProps<"/login/verify-request">) {
  const params = await searchParams;
  const emailParam = params?.email;
  const email = Array.isArray(emailParam) ? emailParam[0] : (emailParam ?? "");
  const callbackUrlParam = params?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : (callbackUrlParam ?? "/");

  return (
    <div className="mx-auto max-w-sm space-y-6">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="mb-2 text-2xl font-bold text-foreground">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a 6-digit code{email ? ` to ${email}` : ""}. Enter it below to finish signing in
          on this device — or just tap the link in the email if you&apos;re reading it here too.
        </p>
      </div>

      {/* Plain GET form straight to the same route the emailed link points
          at -- typing the code does exactly what clicking the link does,
          no extra server action needed. */}
      <form
        method="get"
        action="/api/auth/callback/resend"
        className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
      >
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-foreground">
            6-digit code
          </label>
          <input
            id="token"
            name="token"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            placeholder="000000"
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-3 text-center text-2xl font-black tracking-[0.4em] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-full bg-gradient-primary px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
        >
          Verify &amp; sign in
        </button>
      </form>
    </div>
  );
}
