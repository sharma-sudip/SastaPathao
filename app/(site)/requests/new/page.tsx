import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile, isProfileComplete } from "@/lib/db/queries";
import { PostForm } from "@/components/post-form";
import { createRequestAction } from "./actions";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/requests/new");

  const profile = await getUserProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect("/account?callbackUrl=/requests/new");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Where are you going, {profile?.name}?</h1>
      <PostForm action={createRequestAction} />
    </div>
  );
}
