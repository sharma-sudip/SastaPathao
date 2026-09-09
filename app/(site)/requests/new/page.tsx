import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { PostForm } from "@/components/post-form";
import { createRequestAction } from "./actions";

export default async function NewRequestPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/requests/new");

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-bold text-foreground">Ask for a ride</h1>
      <p className="mb-6 text-muted-foreground">
        Post when and where you need a ride. Neighbors can volunteer to take you.
      </p>
      <PostForm action={createRequestAction} />
    </div>
  );
}
