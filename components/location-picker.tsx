"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { GeocodeResult } from "@/lib/geocode";

const LocationPickerMap = dynamic(() => import("@/components/location-picker-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[240px] items-center justify-center rounded-lg border border-border bg-muted text-sm text-muted-foreground">
      Loading map…
    </div>
  ),
});

export function LocationPicker({
  idPrefix,
  fieldName,
  labelText,
  placeholder,
  error,
  useCurrentLocationAsDefault = false,
}: {
  idPrefix: string;
  fieldName: string; // e.g. "origin" -> fields: origin, originLat, originLng
  labelText: string;
  placeholder: string;
  error?: string;
  /** Pre-fills this field from the browser's geolocation on mount (silently
   *  does nothing if permission is denied/unavailable -- search and the map
   *  stay available either way, this is just a starting point). */
  useCurrentLocationAsDefault?: boolean;
}) {
  const [label, setLabel] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!useCurrentLocationAsDefault || !("geolocation" in navigator)) return;

    let cancelled = false;

    function locate() {
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          setCoords({ lat: latitude, lng: longitude });
          try {
            const res = await fetch(`/api/geocode/reverse?lat=${latitude}&lon=${longitude}`);
            const data = await res.json();
            if (!cancelled && data.displayName) setLabel(data.displayName);
          } catch {
            // Leave it blank for manual entry.
          } finally {
            if (!cancelled) setLocating(false);
          }
        },
        () => {
          // Denied/unavailable/timed out -- just leave the field for manual
          // search or a pin drop, same as if this prop weren't set at all.
          if (!cancelled) setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    }

    locate();
    return () => {
      cancelled = true;
    };
  }, [useCurrentLocationAsDefault]);

  function handleLabelChange(value: string) {
    setLabel(value);
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
    setLabel(s.displayName);
    setCoords({ lat: s.lat, lng: s.lon });
    setSuggestions([]);
    setShowSuggestions(false);
  }

  async function handleMapPick(lat: number, lng: number) {
    setCoords({ lat, lng });
    try {
      const res = await fetch(`/api/geocode/reverse?lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data.displayName) setLabel(data.displayName);
    } catch {
      // Keep whatever label was already typed.
    }
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
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={locating ? "Finding your location…" : placeholder}
          required
          autoComplete="off"
          aria-invalid={!!error}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 ${
            error
              ? "border-danger focus:border-danger focus:ring-danger/30"
              : "border-border focus:border-primary focus:ring-ring/30"
          }`}
        />
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
      <p className="text-xs text-muted-foreground">
        {useCurrentLocationAsDefault
          ? "Defaulted to your current location — search above or drop a pin on the map to use somewhere else."
          : "Search above, or drop a pin on the map — use a nearby landmark or intersection rather than your exact address."}
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <LocationPickerMap value={coords} onPick={handleMapPick} />
      </div>
      <input type="hidden" name={`${fieldName}Lat`} value={coords?.lat ?? ""} />
      <input type="hidden" name={`${fieldName}Lng`} value={coords?.lng ?? ""} />
    </div>
  );
}
