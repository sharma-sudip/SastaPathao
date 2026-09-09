import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrlParam = params?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : callbackUrlParam ?? "/";
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
