import { ImageResponse } from "next/og";

// Replaces the default Next.js favicon with a generated one matching the
// brand -- a red scooter glyph (same lucide "Scooter" icon as
// components/logo.tsx, hand-copied as raw SVG since Satori/ImageResponse
// can't import a React icon component here) on the black ground used
// throughout the site. This supersedes a static favicon.ico, which has
// been removed.
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
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e11900"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 4h-3.5l2 11.05" />
          <path d="M6.95 17h5.142c.523 0 .95-.406 1.063-.916a6.5 6.5 0 0 1 5.345-5.009" />
          <circle cx="19.5" cy="17.5" r="2.5" />
          <circle cx="4.5" cy="17.5" r="2.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
