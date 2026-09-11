import { Phone, User } from "lucide-react";
import { revealContactIfAuthorized } from "@/lib/contacts";

export async function ContactCard({ postId, viewerId }: { postId: string; viewerId: string | undefined }) {
  const contact = await revealContactIfAuthorized(postId, viewerId);
  if (!contact) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
      <p className="text-sm font-bold text-accent">Contact</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
        <User className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} />
        {contact.name ?? "—"}
      </p>
      {contact.phone ? (
        <p className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Phone className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={2.25} />
          {contact.phone}
        </p>
      ) : (
        <p className="mt-0.5 text-sm text-muted-foreground">
          No phone number on file yet — reply by email to coordinate.
        </p>
      )}
    </div>
  );
}
