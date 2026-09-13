"use client";

import { useActionState, useState } from "react";
import dynamic from "next/dynamic";
import { LocationPicker } from "@/components/location-picker";
import { suggestedPriceCents, MIN_PRICE_DOLLARS } from "@/lib/pricing";
import type { PostActionState } from "@/lib/action-types";

const DualLocationMap = dynamic(() => import("@/components/dual-location-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[280px] items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

type Point = { label: string; coords: { lat: number; lng: number } | null };
const EMPTY_POINT: Point = { label: "", coords: null };

export function PostForm({
  action,
}: {
  action: (state: PostActionState, formData: FormData) => Promise<PostActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const fieldErrors = state?.fieldErrors;

  // Lifted out of <LocationPicker> so both fields can share one map below
  // instead of each rendering its own -- see dual-location-map.tsx.
  const [origin, setOrigin] = useState<Point>(EMPTY_POINT);
  const [destination, setDestination] = useState<Point>(EMPTY_POINT);
  const [activeField, setActiveField] = useState<"origin" | "destination">("origin");

  // Pre-filled from a rough $/mile heuristic (lib/pricing.ts) once both
  // points are set, but freely editable -- `priceTouched` stops the
  // auto-suggestion from clobbering a price the user already typed. Adjusted
  // during render (React's recommended pattern for "derive state from
  // changed props/state" without an effect) rather than in a useEffect,
  // guarded by `lastPricedCoordsKey` so it only fires once per coordinate
  // change instead of looping.
  const [askingPrice, setAskingPrice] = useState("");
  const [priceTouched, setPriceTouched] = useState(false);
  const [lastPricedCoordsKey, setLastPricedCoordsKey] = useState<string | null>(null);

  const coordsKey =
    origin.coords && destination.coords
      ? `${origin.coords.lat},${origin.coords.lng}|${destination.coords.lat},${destination.coords.lng}`
      : null;

  if (coordsKey && coordsKey !== lastPricedCoordsKey) {
    setLastPricedCoordsKey(coordsKey);
    if (!priceTouched) {
      const cents = suggestedPriceCents(origin.coords!, destination.coords!);
      setAskingPrice((cents / 100).toFixed(0));
    }
  }

  async function handleMapPick(lat: number, lng: number) {
    const setPoint = activeField === "origin" ? setOrigin : setDestination;
    setPoint((p) => ({ ...p, coords: { lat, lng } }));
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.displayName) setPoint((p) => ({ ...p, label: data.displayName }));
    } catch {
      // Keep whatever label was already there.
    }
  }

  return (
    <form action={formAction} className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
      <LocationPicker
        idPrefix="origin"
        fieldName="origin"
        labelText="Pickup location"
        placeholder="e.g. Boardman Plaza"
        error={fieldErrors?.origin}
        label={origin.label}
        onLabelChange={(label) => setOrigin((o) => ({ ...o, label }))}
        onCoordsChange={(coords) => setOrigin((o) => ({ ...o, coords }))}
        onActivate={() => setActiveField("origin")}
        useCurrentLocationAsDefault
      />
      <LocationPicker
        idPrefix="destination"
        fieldName="destination"
        labelText="Destination"
        placeholder="e.g. YSU campus"
        error={fieldErrors?.destination}
        label={destination.label}
        onLabelChange={(label) => setDestination((d) => ({ ...d, label }))}
        onCoordsChange={(coords) => setDestination((d) => ({ ...d, coords }))}
        onActivate={() => setActiveField("destination")}
      />

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Tap the map to drop a pin for whichever field you tapped last —{" "}
          <span className="font-semibold text-foreground">{activeField === "origin" ? "pickup" : "destination"}</span>{" "}
          right now.
        </p>
        <div className="overflow-hidden rounded-lg border border-border">
          <DualLocationMap origin={origin.coords} destination={destination.coords} onPick={handleMapPick} />
        </div>
      </div>

      <input type="hidden" name="originLat" value={origin.coords?.lat ?? ""} />
      <input type="hidden" name="originLng" value={origin.coords?.lng ?? ""} />
      <input type="hidden" name="destinationLat" value={destination.coords?.lat ?? ""} />
      <input type="hidden" name="destinationLng" value={destination.coords?.lng ?? ""} />

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
            value={askingPrice}
            onChange={(e) => {
              setPriceTouched(true);
              setAskingPrice(e.target.value);
            }}
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
            A rough suggestion based on distance (${MIN_PRICE_DOLLARS} minimum) — change it, clear it, or
            leave it for drivers to offer whatever they think is fair.
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
