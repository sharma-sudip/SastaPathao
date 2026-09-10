import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile } from "@/lib/db/queries";
import { ProfileForm } from "./profile-form";
import { PushToggle } from "@/components/push-toggle";

export default async function AccountPage({ searchParams }: PageProps<"/account">) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const params = await searchParams;
  const callbackUrlParam = params?.callbackUrl;
  const callbackUrl = Array.isArray(callbackUrlParam) ? callbackUrlParam[0] : callbackUrlParam;
  const isOnboarding = !!callbackUrl;

  const me = await getUserProfile(session.user.id);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-foreground">
        {isOnboarding ? "Welcome — one quick step" : "Your profile"}
      </h1>
      <p className="mb-6 text-muted-foreground">
        {isOnboarding
          ? "Add your name and number so a matched rider/driver can actually reach you."
          : "This is what matched riders/drivers see once you confirm a ride together."}
      </p>
      <ProfileForm
        email={session.user.email ?? ""}
        name={me?.name ?? ""}
        phone={me?.phone ?? ""}
        callbackUrl={callbackUrl}
      />
      {!isOnboarding && (
        <div className="mt-4">
          <PushToggle />
        </div>
      )}
    </div>
  );
}
