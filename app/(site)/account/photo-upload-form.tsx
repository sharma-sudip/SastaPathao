"use client";

import { useActionState, useState } from "react";
import { Avatar } from "@/components/avatar";
import { updatePhotoAction } from "./photo-actions";

export function PhotoUploadForm({ name, image }: { name: string; image: string | null }) {
  const [state, action, pending] = useActionState(updatePhotoAction, undefined);
  // Preview whatever's just been picked, even before the upload completes --
  // falls back to the saved photo (or initial/icon) once cleared or on load.
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm">
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
            setPreview(file ? URL.createObjectURL(file) : null);
          }}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-full file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-bold file:text-foreground hover:file:bg-border"
        />
        {state?.success && <p className="text-sm font-semibold text-primary">Photo updated.</p>}
        {state?.error && <p className="text-sm text-danger">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gradient-primary px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow disabled:opacity-60"
        >
          {pending ? "Uploading…" : "Upload"}
        </button>
      </div>
    </form>
  );
}
