import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrlParam = params?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : callbackUrlParam ?? "/";

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-2 text-2xl font-bold text-foreground">Sign in</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        No password needed — we&apos;ll email you a one-time sign-in link.
      </p>
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
