import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function ClaimDeclinedEmail({
  postUrl,
  origin,
  destination,
}: {
  postUrl: string;
  origin: string;
  destination: string;
}) {
  return (
    <EmailShell preview="Your claim wasn't accepted this time" heading="Not this time">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        Your claim on{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        wasn&apos;t accepted — the seat went to someone else, or the post was cancelled. Feel free
        to look for another ride on the board.
      </Text>
      <EmailButton href={postUrl}>Browse rides</EmailButton>
    </EmailShell>
  );
}
