import { Img, Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function CouponEarnedEmail({
  origin,
  destination,
  redeemUrl,
  qrDataUrl,
  couponCode,
}: {
  origin: string;
  destination: string;
  redeemUrl: string;
  qrDataUrl: string;
  couponCode: string;
}) {
  return (
    <EmailShell preview="You earned a $5 coupon" heading="You earned $5 off">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        Your ride from <strong>{origin}</strong> to <strong>{destination}</strong> is complete —
        here&apos;s $5 off, on us, at our partner barber: a haircut, or a facial (bring your own
        kit).
      </Text>
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>Show this code to redeem it:</Text>
      <Img
        src={qrDataUrl}
        width="220"
        height="220"
        alt={`QR code for coupon ${couponCode}`}
        style={{ display: "block", margin: "8px auto" }}
      />
      <Text
        style={{
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#6b6b6b",
          letterSpacing: "0.05em",
        }}
      >
        {couponCode}
      </Text>
      <Text style={{ color: "#8a938a", fontSize: "13px" }}>
        One-time use. If the QR code doesn&apos;t scan, the barber can open the link below and
        enter the code by hand.
      </Text>
      <EmailButton href={redeemUrl}>View coupon</EmailButton>
    </EmailShell>
  );
}
