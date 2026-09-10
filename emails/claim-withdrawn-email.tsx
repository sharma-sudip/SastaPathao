import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function ClaimWithdrawnEmail({
  postUrl,
  origin,
  destination,
}: {
  postUrl: string;
  origin: string;
  destination: string;
}) {
  return (
    <EmailShell preview="A volunteer backed out" heading="A volunteer backed out">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        The person who volunteered for your{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        post backed out. It&apos;s back open on the board for someone else to pick up.
      </Text>
      <EmailButton href={postUrl}>View post</EmailButton>
    </EmailShell>
  );
}
