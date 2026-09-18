"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed } from "lucide-react";
import type { GeocodeResult } from "@/lib/geocode";

// Controlled: label/coords live in the parent (post-form.tsx) so multiple
// fields (pickup + destination) can share one map instead of each field
// rendering its own. This component owns only its own transient UI state
// (suggestions, geolocation-in-progress). Library-agnostic -- it only ever
// calls our own /api/geocode/* routes (Google-backed on this branch, see
// lib/geocode.ts), never a map library directly.
export function LocationPicker({
  idPrefix,
  fieldName,
  labelText,
  placeholder,
  error,
  label,
  onLabelChange,
  onCoordsChange,
  onActivate,
  useCurrentLocationAsDefault = false,
}: {
  idPrefix: string;
  fieldName: string; // e.g. "origin" -> submitted as `origin`
  labelText: string;
  placeholder: string;
  error?: string;
  label: string;
  onLabelChange: (label: string) => void;
  onCoordsChange: (coords: { lat: number; lng: number } | null) => void;
  /** Tells the parent "the shared map's next click/pin should target me" --
   *  fired on focus. */
  onActivate?: () => void;
  /** Pre-fills this field from the browser's geolocation on mount (silently
   *  does nothing if permission is denied/unavailable -- search and the map
   *  stay available either way, this is just a starting point). */
  useCurrentLocationAsDefault?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Shared by the auto-default-on-mount effect below and the "locate me"
  // button in the input.
  function locateMe() {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!mountedRef.current) return;
        onCoordsChange({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (mountedRef.current && data.displayName) onLabelChange(data.displayName);
        } catch {
          // Leave whatever label was already there.
        } finally {
          if (mountedRef.current) setLocating(false);
        }
      },
      () => {
        // Denied/unavailable/timed out -- just leave the field for manual
        // search or a pin drop.
        if (mountedRef.current) setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  useEffect(() => {
    if (!useCurrentLocationAsDefault) return;
    // Deferred a tick so the (shared, setState-ing) locateMe call isn't a
    // direct synchronous call from the effect body itself.
    const id = setTimeout(locateMe, 0);
    return () => clearTimeout(id);
    // Mount-only -- re-running this if the prop somehow changed would
    // overwrite whatever the user has since typed/picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLabelChange(value: string) {
    onLabelChange(value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(value)}`);
        const results: GeocodeResult[] = await res.json();
        setSuggestions(results);
      } catch {
        setSuggestions([]);
      }
    }, 400);
  }

  function selectSuggestion(s: GeocodeResult) {
    onLabelChange(s.displayName);
    onCoordsChange({ lat: s.lat, lng: s.lon });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor={`${idPrefix}-label`} className="block text-sm font-medium text-foreground">
        {labelText}
      </label>
      <div className="relative">
        <input
          id={`${idPrefix}-label`}
          name={fieldName}
          value={label}
          onChange={(e) => handleLabelChange(e.target.value)}
          onFocus={() => {
            setShowSuggestions(true);
            onActivate?.();
          }}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={locating ? "Finding your location…" : placeholder}
          required
          autoComplete="off"
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-background py-2 pl-3 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 ${
            error
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-ring/30"
          }`}
        />
        <button
          type="button"
          onClick={locateMe}
          disabled={locating}
          aria-label="Use my current location"
          title="Use my current location"
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary disabled:opacity-50"
        >
          <LocateFixed className={`h-4 w-4 ${locating ? "animate-pulse" : ""}`} strokeWidth={2.25} />
        </button>
        {showSuggestions && suggestions.length > 0 && (
          // z-[1100]: the map's own panes/controls (rendered just below in
          // this same component) go up to z-index 1000, which otherwise
          // paints over this dropdown despite it being later in the DOM.
          <ul className="absolute z-[1100] mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {suggestions.map((s, i) => (
              <li key={i}>
                <button
                  type="button"
                  onMouseDown={() => selectSuggestion(s)}
                  className="block w-full px-3 py-2 text-left text-sm text-card-foreground hover:bg-muted"
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
    </div>
  );
}
