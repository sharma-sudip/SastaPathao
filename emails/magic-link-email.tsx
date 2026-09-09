import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function MagicLinkEmail({ code, url }: { code: string; url: string }) {
  return (
    <EmailShell preview={`${code} is your sign-in code`} heading="Sign in">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        Enter this code on the device you started signing in from:
      </Text>
      <Text
        style={{
          margin: "8px 0 20px",
          padding: "16px",
          borderRadius: "10px",
          backgroundColor: "#f2f4ee",
          textAlign: "center",
          fontSize: "32px",
          fontWeight: 800,
          letterSpacing: "0.3em",
          color: "#0b0c0a",
        }}
      >
        {code}
      </Text>
      <Text style={{ color: "#8a938a", fontSize: "13px" }}>
        Expires in 15 minutes. Reading this on the same device? You can also just tap below instead
        of typing the code.
      </Text>
      <EmailButton href={url}>Sign in</EmailButton>
      <Text style={{ color: "#8a938a", fontSize: "13px", marginTop: "24px" }}>
        If you didn&apos;t request this email, you can safely ignore it.
      </Text>
    </EmailShell>
  );
}
