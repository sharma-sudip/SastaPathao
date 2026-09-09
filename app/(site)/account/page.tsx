import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ProfileForm } from "./profile-form";

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  const [me] = await db
    .select({ name: users.name, phone: users.phone })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Your profile</h1>
      <p className="mb-6 text-muted-foreground">
        This is what matched riders/drivers see once you confirm a ride together.
      </p>
      <ProfileForm name={me?.name ?? ""} phone={me?.phone ?? ""} />
    </div>
  );
}
