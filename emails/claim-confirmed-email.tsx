import { Link, Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function ClaimConfirmedEmail({
  postUrl,
  origin,
  destination,
  counterpartName,
  counterpartPhone,
  agreedPriceFormatted,
}: {
  postUrl: string;
  origin: string;
  destination: string;
  counterpartName: string | null;
  counterpartPhone: string | null;
  agreedPriceFormatted?: string | null;
}) {
  return (
    <EmailShell preview="Your ride is confirmed" heading="Ride confirmed 🎉">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        <strong>
          {origin} → {destination}
        </strong>{" "}
        is confirmed on Sasta Pathao{agreedPriceFormatted ? ` for ${agreedPriceFormatted}` : ""}.
      </Text>
      {counterpartName || counterpartPhone ? (
        <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
          Contact: <strong>{counterpartName ?? "—"}</strong>
          {counterpartPhone ? (
            <>
              {" — "}
              <Link href={`tel:${counterpartPhone.replace(/[^\d+]/g, "")}`} style={{ color: "#276ef1" }}>
                {counterpartPhone}
              </Link>
            </>
          ) : (
            ""
          )}
        </Text>
      ) : null}
      <Text style={{ color: "#8a938a", fontSize: "13px" }}>
        Reach out directly to confirm pickup details. This is a coordination tool only — Sasta
        Pathao doesn&apos;t process any payment.
      </Text>
      <EmailButton href={postUrl}>View ride</EmailButton>
    </EmailShell>
  );
}
