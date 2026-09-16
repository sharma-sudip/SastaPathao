/**
 * A Google Maps "get directions" URL between two free-text addresses --
 * Google Maps geocodes the labels itself when the link opens, so this needs
 * no API key/geocoding on our end. Plain https://www.google.com/maps/...
 * links like this are what opens the native Google Maps app on iOS/Android
 * (via universal/app links) when it's installed, falling back to the
 * browser/web version otherwise -- no user-agent sniffing or app-specific
 * URL scheme needed.
 */
export function directionsUrl(originLabel: string, destinationLabel: string): string {
  const params = new URLSearchParams({
    api: "1",
    origin: originLabel,
    destination: destinationLabel,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
