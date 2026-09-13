import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function NewClaimEmail({
  postUrl,
  origin,
  destination,
  claimantName,
  offerFormatted,
}: {
  postUrl: string;
  origin: string;
  destination: string;
  claimantName: string | null;
  offerFormatted?: string | null;
}) {
  return (
    <EmailShell preview="Someone wants to fill your ride" heading="You've got interest">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        <strong>{claimantName ?? "Someone"}</strong> wants to fill your{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        post on Sasta Pathao{offerFormatted ? ` for ${offerFormatted}` : ""}.
      </Text>
      <EmailButton href={postUrl}>Review and respond</EmailButton>
    </EmailShell>
  );
}
