"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Avoid rendering theme-dependent UI until mounted, so server and client
  // markup match on first paint (the real theme is only known client-side).
  // This is the standard next-themes hydration-guard pattern -- there's no
  // external-system subscription to move this into.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition hover:bg-muted"
    >
      {!mounted ? (
        <span className="h-4 w-4" />
      ) : resolvedTheme === "dark" ? (
        <Sun className="h-4 w-4" strokeWidth={2.25} />
      ) : (
        <Moon className="h-4 w-4" strokeWidth={2.25} />
      )}
    </button>
  );
}
