import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with a generated one matching the
// brand (see components/splash.tsx for the same black/white pair). This
// supersedes a static favicon.ico, which has been removed.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
          color: "#ffffff",
          fontSize: 18,
          fontWeight: 800,
          fontFamily: "Helvetica, Arial, sans-serif",
          letterSpacing: -1,
        }}
      >
        SP
      </div>
    ),
    { ...size },
  );
}
