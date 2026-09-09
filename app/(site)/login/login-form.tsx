"use client";

import { useActionState } from "react";
import { requestMagicLink } from "./actions";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, action, pending] = useActionState(requestMagicLink, undefined);

  return (
    <form action={action} className="space-y-4 rounded-2xl border-2 border-border bg-card p-6 shadow-sm">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-gradient-primary px-4 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:shadow-glow disabled:opacity-60"
      >
        {pending ? "Sending…" : "Email me a sign-in code"}
      </button>
    </form>
  );
}
