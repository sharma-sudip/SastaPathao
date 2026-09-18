"use client";

import { APIProvider } from "@vis.gl/react-google-maps";

// Wraps the whole (site) layout, not just the pages with a map -- cheap to
// do since @vis.gl/react-google-maps only actually loads the Maps
// JavaScript API script the first time a <Map> mounts, not on every page.
// NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is a separate, HTTP-referrer-restricted
// key from the server-only GOOGLE_MAPS_API_KEY (lib/geocode.ts,
// lib/directions.ts) -- see CLAUDE.md.
//
// Always renders <APIProvider>, even with an empty key -- the library
// throws ("<Map> can only be used inside an <ApiProvider> component")
// if a <Map> ever renders with no provider ancestor at all, regardless of
// whether the script it loads actually succeeds. With no/an invalid key,
// the script load itself just fails quietly (a console error, an empty map
// box) rather than crashing the page -- the graceful degradation for a
// preview deploy or local dev before the key's configured.
export function GoogleMapsProvider({ children }: { children: React.ReactNode }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  return <APIProvider apiKey={apiKey}>{children}</APIProvider>;
}
