"use client";

import { useActionState } from "react";
import { updateProfileAction } from "./actions";

export function ProfileForm({
  email,
  name,
  phone,
  callbackUrl,
}: {
  email: string;
  name: string;
  phone: string;
  callbackUrl?: string;
}) {
  const [state, action, pending] = useActionState(updateProfileAction, undefined);

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          value={email}
          disabled
          className="mt-1 w-full cursor-not-allowed rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          This is what you sign in with — not editable here.
        </p>
      </div>
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground">
          Name
        </label>
        <input
          id="name"
          name="name"
          defaultValue={name}
          required
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>
      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-foreground">
          Phone number
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          required={!!callbackUrl}
          placeholder="(330) 555-0100"
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Only shown to someone once you&apos;ve matched with them on a ride — never shown in the
          open feed.
        </p>
      </div>
      {state?.success && (
        <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
          Profile saved.
        </p>
      )}
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
