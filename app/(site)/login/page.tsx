import { cookies } from "next/headers";
import { LoginForm } from "./login-form";

// Must match the literal in actions.ts (see the comment there for why it
// isn't just imported).
const CALLBACK_COOKIE = "login_callback_url";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrlParam = params?.callbackUrl;
  const queryCallbackUrl = Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : callbackUrlParam;
  // A failed code redirects here as just "/login?error=Verification" --
  // Auth.js's own redirect drops callbackUrl, so fall back to the cookie
  // requestMagicLink set before sending the code, rather than silently
  // losing the original destination on a retry.
  const cookieCallbackUrl = (await cookies()).get(CALLBACK_COOKIE)?.value;
  const callbackUrl = queryCallbackUrl ?? cookieCallbackUrl ?? "/";
  const error = Array.isArray(params?.error) ? params.error[0] : params?.error;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        No password needed — we&apos;ll email you a one-time sign-in code.
      </p>
      {error && (
        <p className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger">
          That code is invalid, expired, or already used. Request a new one below.
        </p>
      )}
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
