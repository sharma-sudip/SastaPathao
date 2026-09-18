import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function PostExpiredEmail({
  postUrl,
  origin,
  destination,
}: {
  postUrl: string;
  origin: string;
  destination: string;
}) {
  return (
    <EmailShell preview="Your ride request expired" heading="Request expired">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        Nobody confirmed a ride for{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        before it was due, so it&apos;s been automatically cancelled. Feel free to post it again if you
        still need a lift.
      </Text>
      <EmailButton href={postUrl}>View post</EmailButton>
    </EmailShell>
  );
}
