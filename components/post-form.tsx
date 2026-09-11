"use client";

import { useActionState } from "react";
import { LocationPicker } from "@/components/location-picker";
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
      <LocationPicker
        idPrefix="origin"
        fieldName="origin"
        labelText="Pickup location"
        placeholder="e.g. Boardman Plaza"
        error={fieldErrors?.origin}
        useCurrentLocationAsDefault
      />
      <LocationPicker
        idPrefix="destination"
        fieldName="destination"
        labelText="Destination"
        placeholder="e.g. YSU campus"
        error={fieldErrors?.destination}
      />

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
