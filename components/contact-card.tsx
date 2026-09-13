import { revealContactIfAuthorized } from "@/lib/contacts";
import { PhoneNumber } from "@/components/phone-number";
import { Avatar } from "@/components/avatar";

export async function ContactCard({ postId, viewerId }: { postId: string; viewerId: string | undefined }) {
  const contact = await revealContactIfAuthorized(postId, viewerId);
  if (!contact) return null;

  return (
    <div className="rounded-xl border border-accent/30 bg-accent/10 p-4">
      <p className="text-sm font-bold text-accent">Contact</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
        <Avatar src={contact.image} name={contact.name} />
        {contact.name ?? "—"}
      </p>
      {contact.phone ? (
        <PhoneNumber phone={contact.phone} />
      ) : (
        <p className="mt-0.5 text-sm text-muted-foreground">
          No phone number on file yet — reply by email to coordinate.
        </p>
      )}
    </div>
  );
}
