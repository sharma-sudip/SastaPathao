"use client";

import { useState } from "react";
import { Phone, Copy, Check } from "lucide-react";

// Tapping the number itself calls it (native `tel:` link, works with no JS);
// the copy button is the fallback for desktop or "save it for later" instead
// of dialing right now.
export function PhoneNumber({ phone }: { phone: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable/denied -- the number's still right there to
      // select and copy by hand.
    }
  }

  return (
    <div className="mt-0.5 flex items-center gap-1">
      <a
        href={`tel:${phone.replace(/[^\d+]/g, "")}`}
        className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-accent"
      >
        <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} />
        {phone}
      </a>
      <button
        type="button"
        onClick={copy}
        aria-label="Copy phone number"
        title="Copy phone number"
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-accent"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
        ) : (
          <Copy className="h-3.5 w-3.5" strokeWidth={2.25} />
        )}
      </button>
    </div>
  );
}
