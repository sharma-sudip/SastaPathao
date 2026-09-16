"use client";

import { useActionState } from "react";
import { MIN_PRICE_DOLLARS } from "@/lib/pricing";
import type { PostActionState } from "@/lib/action-types";

export function PostForm({
  action,
}: {
  action: (state: PostActionState, formData: FormData) => Promise<PostActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const fieldErrors = state?.fieldErrors;

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div>
        <label htmlFor="origin" className="block text-sm font-medium text-foreground">
          Pickup location
        </label>
        <input
          id="origin"
          name="origin"
          type="text"
          required
          placeholder="e.g. Boardman Plaza"
          aria-invalid={!!fieldErrors?.origin}
          className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 ${
            fieldErrors?.origin
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-ring/30"
          }`}
        />
        {fieldErrors?.origin && <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.origin}</p>}
      </div>

      <div>
        <label htmlFor="destination" className="block text-sm font-medium text-foreground">
          Destination
        </label>
        <input
          id="destination"
          name="destination"
          type="text"
          required
          placeholder="e.g. YSU campus"
          aria-invalid={!!fieldErrors?.destination}
          className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 ${
            fieldErrors?.destination
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-ring/30"
          }`}
        />
        {fieldErrors?.destination && (
          <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.destination}</p>
        )}
      </div>

      <div>
        <label htmlFor="departAt" className="block text-sm font-medium text-foreground">
          When do you need the ride?
        </label>
        <input
          id="departAt"
          name="departAt"
          type="datetime-local"
          required
          aria-invalid={!!fieldErrors?.departAt}
          className={`mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 ${
            fieldErrors?.departAt
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-ring/30"
          }`}
        />
        {fieldErrors?.departAt && <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.departAt}</p>}
      </div>

      <div>
        <label htmlFor="askingPrice" className="block text-sm font-medium text-foreground">
          Asking price <span className="text-muted-foreground">(optional)</span>
        </label>
        <div className="relative mt-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <input
            id="askingPrice"
            name="askingPrice"
            type="number"
            min={MIN_PRICE_DOLLARS}
            max="500"
            step="1"
            placeholder="0"
            aria-invalid={!!fieldErrors?.askingPrice}
            className={`w-full rounded-lg border bg-background py-2 pl-6 pr-3 text-sm text-foreground focus:outline-none focus:ring-2 ${
              fieldErrors?.askingPrice
                ? "border-danger focus:border-danger focus:ring-danger/30"
                : "border-border focus:border-primary focus:ring-ring/30"
            }`}
          />
        </div>
        {fieldErrors?.askingPrice ? (
          <p className="mt-1 text-sm font-semibold text-danger">{fieldErrors.askingPrice}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            ${MIN_PRICE_DOLLARS} minimum if you set one — change it, clear it, or leave it for drivers to
            offer whatever they think is fair.
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-foreground">
          Notes <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Flexible on time, can meet nearby, etc."
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
      </div>

      {state?.error && <p className="text-sm text-danger">{state.error}</p>}

      <p className="text-xs text-muted-foreground">
        Sasta Pathao doesn&apos;t process payment — arrange any costs directly. Please use
        good judgment when meeting someone you&apos;ve matched with here.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-primary px-6 py-2.5 font-bold text-primary-foreground shadow-sm transition hover:shadow-glow disabled:opacity-60"
      >
        {pending ? "Posting…" : "Post ride request"}
      </button>
    </form>
  );
}
