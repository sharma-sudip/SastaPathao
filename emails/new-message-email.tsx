import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function NewMessageEmail({
  postUrl,
  origin,
  destination,
  senderName,
  body,
}: {
  postUrl: string;
  origin: string;
  destination: string;
  senderName: string | null;
  body: string;
}) {
  return (
    <EmailShell preview="You have a new message" heading="New message">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        <strong>{senderName ?? "Someone"}</strong> sent you a message about{" "}
        <strong>
          {origin} → {destination}
        </strong>
        :
      </Text>
      <Text
        style={{
          margin: "8px 0 20px",
          padding: "12px 16px",
          borderRadius: "10px",
          backgroundColor: "#f2f4ee",
          color: "#0b0c0a",
          fontStyle: "italic",
        }}
      >
        &ldquo;{body}&rdquo;
      </Text>
      <EmailButton href={postUrl}>Reply</EmailButton>
    </EmailShell>
  );
}
