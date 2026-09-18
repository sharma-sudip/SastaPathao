import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserProfile, isProfileComplete, getOwnPostForRepeat } from "@/lib/db/queries";
import { PostForm } from "@/components/post-form";
import { createRequestAction } from "./actions";

export default async function NewRequestPage({ searchParams }: PageProps<"/requests/new">) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/requests/new");

  const profile = await getUserProfile(session.user.id);
  if (!isProfileComplete(profile)) redirect("/account?callbackUrl=/requests/new");

  // "Request again" from a past post on /dashboard -- prefills
  // origin/destination/notes/price but never the date, so this is one click
  // to a ready-to-submit form rather than a truly blank one.
  const params = await searchParams;
  const repeatParam = params?.repeat;
  const repeatId = Array.isArray(repeatParam) ? repeatParam[0] : repeatParam;
  const repeatFrom = repeatId ? await getOwnPostForRepeat(repeatId, session.user.id) : null;

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Where are you going, {profile?.name}?</h1>
      <PostForm action={createRequestAction} initialValues={repeatFrom ?? undefined} />
    </div>
  );
}
