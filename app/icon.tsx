import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with a generated one matching the
// brand (see components/splash.tsx for the same dark + brand-green pair).
// This supersedes a static favicon.ico, which has been removed.
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
          background: "#0b0c0a",
          color: "#8fd424",
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
