import { Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function ClaimCounteredEmail({
  postUrl,
  origin,
  destination,
  counterpartName,
  amountFormatted,
}: {
  postUrl: string;
  origin: string;
  destination: string;
  counterpartName: string | null;
  amountFormatted: string;
}) {
  return (
    <EmailShell preview="You've got a counter-offer" heading="New price proposed">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        <strong>{counterpartName ?? "The other person"}</strong> proposed{" "}
        <strong>{amountFormatted}</strong> for{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        on Sasta Pathao.
      </Text>
      <EmailButton href={postUrl}>Accept, counter, or decline</EmailButton>
    </EmailShell>
  );
}
