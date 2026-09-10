"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMessagesAction, sendMessageAction } from "@/app/(site)/posts/[id]/actions";

type Message = { id: string; senderId: string; body: string; createdAt: Date };

const POLL_MS = 4000;

// Simple poll-and-refetch chat, not a websocket -- fine at this app's scale
// and keeps it dependency-free. One thread per claim; see lib/messages.ts
// for why (same author+claimant-only boundary as the phone-number reveal).
export function ClaimChat({ claimId, viewerId }: { claimId: string; viewerId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      const fresh = await fetchMessagesAction(claimId);
      if (!cancelled && fresh) setMessages(fresh);
    }

    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [claimId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setError(null);
    try {
      await sendMessageAction(claimId, trimmed);
      setBody("");
      const fresh = await fetchMessagesAction(claimId);
      if (fresh) setMessages(fresh);
    } catch {
      setError("Couldn't send that -- try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mt-3 rounded-lg border border-border bg-background">
      <div ref={listRef} className="max-h-56 space-y-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No messages yet -- say where/when you&apos;ll meet.
          </p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === viewerId ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[80%] rounded-lg px-3 py-1.5 text-sm ${
                  m.senderId === viewerId
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {m.body}
              </p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2 border-t border-border p-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Message about pickup..."
          maxLength={1000}
          className="flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow disabled:opacity-60"
        >
          Send
        </button>
      </form>
      {error && <p className="px-3 pb-2 text-xs text-danger">{error}</p>}
    </div>
  );
}
