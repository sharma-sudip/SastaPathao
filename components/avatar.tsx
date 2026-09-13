import { User } from "lucide-react";

const SIZE_CLASSES = {
  sm: "h-6 w-6 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

/**
 * A user's uploaded photo (see app/(site)/account/photo-actions.ts) if they
 * have one, else their first initial, else a generic person icon -- so
 * there's always something to visually anchor a name to, upload or not.
 * Plain <img>, not next/image -- the Blob store's hostname varies per
 * project, and isn't worth wiring into next.config.ts's remote-image
 * allowlist for what's always a small, already-hosted image.
 */
export function Avatar({
  src,
  name,
  size = "sm",
}: {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const className = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted font-bold text-muted-foreground ${SIZE_CLASSES[size]}`;

  if (src) {
    return (
      <img
        src={src}
        alt={name ? `${name}'s profile picture` : "Profile picture"}
        className={`${className} object-cover`}
      />
    );
  }

  const initial = name?.trim()?.[0]?.toUpperCase();
  return (
    <span className={className} aria-hidden={!name}>
      {initial ?? <User className="h-1/2 w-1/2" strokeWidth={2.25} />}
    </span>
  );
}
