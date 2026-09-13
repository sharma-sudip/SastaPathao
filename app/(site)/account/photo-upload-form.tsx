"use client";

import { useActionState, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { updatePhotoAction } from "./photo-actions";

export function PhotoUploadForm({ name, image }: { name: string; image: string | null }) {
  const [state, action, pending] = useActionState(updatePhotoAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  // Preview whatever's just been picked, even before the upload completes --
  // falls back to the saved photo (or initial/icon) once cleared or on load.
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={action}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
    >
      <Avatar src={preview ?? image} name={name} size="lg" />
      <div className="flex-1 space-y-2">
        <label htmlFor="photo" className="block text-sm font-medium text-foreground">
          Profile picture
        </label>
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          required
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setPreview(URL.createObjectURL(file));
            // Saves as soon as a photo's picked -- no separate "Upload" step.
            formRef.current?.requestSubmit();
          }}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-foreground hover:file:bg-border"
        />
        <p className="text-sm" aria-live="polite">
          {pending && <span className="text-muted-foreground">Uploading…</span>}
          {!pending && state?.success && <span className="font-semibold text-primary">Photo updated.</span>}
          {!pending && state?.error && <span className="text-danger">{state.error}</span>}
        </p>
      </div>
    </form>
  );
}
