import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <EmailShell preview="Sign in to Sasta Pathao" heading="Sign in">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        Click the button below to sign in. This link expires shortly and can only be used once.
      </Text>
      <EmailButton href={url}>Sign in</EmailButton>
      <Text style={{ color: "#8a938a", fontSize: "13px", marginTop: "24px" }}>
        If you didn&apos;t request this email, you can safely ignore it.
      </Text>
    </EmailShell>
  );
}
