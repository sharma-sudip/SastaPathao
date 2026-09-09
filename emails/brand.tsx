import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { ReactNode } from "react";

// Shared chrome for every transactional email, matching the site's bold
// dark-panel-plus-brand-green look (see components/splash.tsx) instead of
// react-email's default plain white card. Email clients strip gradients and
// most CSS unpredictably, so this sticks to solid colors + inline styles.
const DARK = "#0b0c0a";
const GREEN = "#15a24d";

export function EmailShell({
  preview,
  heading,
  children,
}: {
  preview: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: DARK, padding: "32px 16px", fontFamily: "Helvetica, Arial, sans-serif" }}>
        <Container style={{ maxWidth: "480px", borderRadius: "16px", overflow: "hidden", backgroundColor: "#ffffff" }}>
          <Section style={{ backgroundColor: DARK, padding: "20px 32px" }}>
            <Text
              style={{
                margin: 0,
                color: "#ffffff",
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.3em",
                textTransform: "uppercase",
              }}
            >
              Sasta Pathao
            </Text>
          </Section>
          <Section style={{ padding: "32px" }}>
            <Heading
              style={{
                margin: "0 0 16px",
                fontSize: "24px",
                fontWeight: 800,
                letterSpacing: "-0.02em",
                textTransform: "uppercase",
                color: DARK,
              }}
            >
              {heading}
            </Heading>
            {children}
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function EmailButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Button
      href={href}
      style={{
        display: "inline-block",
        marginTop: "8px",
        borderRadius: "8px",
        backgroundColor: GREEN,
        padding: "14px 28px",
        fontSize: "14px",
        fontWeight: 800,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "#ffffff",
      }}
    >
      {children}
    </Button>
  );
}
