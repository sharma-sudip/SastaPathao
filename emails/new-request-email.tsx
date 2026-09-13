import { Link, Text } from "@react-email/components";
import { EmailButton, EmailShell } from "./brand";

export function NewRequestEmail({
  postUrl,
  origin,
  destination,
  authorName,
}: {
  postUrl: string;
  origin: string;
  destination: string;
  authorName: string | null;
}) {
  return (
    <EmailShell preview="New ride request posted" heading="New ride request">
      <Text style={{ color: "#3a3f3a", fontSize: "15px" }}>
        <strong>{authorName ?? "Someone"}</strong> just posted{" "}
        <strong>
          {origin} → {destination}
        </strong>{" "}
        on Sasta Pathao.
      </Text>
      <EmailButton href={postUrl}>View and offer to drive</EmailButton>
      <Text style={{ color: "#8a938a", fontSize: "13px" }}>
        You&apos;re getting this because you opted in to driver notifications on{" "}
        <Link href={postUrl.replace(/\/posts\/.*/, "/account")} style={{ color: "#276ef1" }}>
          your account page
        </Link>
        .
      </Text>
    </EmailShell>
  );
}
