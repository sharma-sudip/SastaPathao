"use client";

import { useTransition } from "react";
import { deletePostAction } from "./actions";

// Unlike ban/unban (reversible), deleting a post is permanent -- confirm()
// before firing the server action rather than a plain form submit.
export function DeletePostButton({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("Permanently delete this post, its claims, and its messages? This can't be undone.")) return;
    startTransition(() => {
      deletePostAction(postId).catch((err) => console.error("deletePostAction failed:", err));
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      className="font-semibold text-danger underline underline-offset-2 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
