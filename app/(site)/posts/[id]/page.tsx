import Link from "next/link";
import { notFound } from "next/navigation";
import { Hand, Navigation } from "lucide-react";
import { auth } from "@/auth";
import { getPostById } from "@/lib/db/queries";
import { formatDepartAt } from "@/lib/format-date";
import { directionsUrl } from "@/lib/maps-url";
import { formatCents } from "@/lib/pricing";
import { Avatar } from "@/components/avatar";
import { ContactCard } from "@/components/contact-card";
import { ClaimList } from "@/components/claim-list";
import { PostMapSection } from "@/components/post-map-section";
import { claimAction, cancelPostAction } from "./actions";

export default async function PostDetailPage({ params }: PageProps<"/posts/[id]">) {
  const { id } = await params;
  const post = await getPostById(id);
  if (!post) notFound();

  const session = await auth();
  const viewerId = session?.user?.id;
  const isAuthor = viewerId === post.authorId;
  const hasActiveClaim = post.claims.some(
    (c) => c.claimantId === viewerId && (c.status === "PROPOSED" || c.status === "CONFIRMED")
  );
  const isOpenForClaims = post.status === "OPEN" || post.status === "PENDING";
  const canClaim = !!viewerId && !isAuthor && !hasActiveClaim && isOpenForClaims;

  // Once a claim's confirmed, its offerAmountCents (whatever was actually
  // agreed after any back-and-forth) is the real price -- post.askingPriceCents
  // is just the original suggestion from before negotiation and never
  // updates, so showing it here once FILLED would be stale/wrong.
  const confirmedClaim = post.claims.find((c) => c.status === "CONFIRMED");
  const displayPriceCents = confirmedClaim?.offerAmountCents ?? post.askingPriceCents;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold text-muted-foreground">
            <Hand className="h-3.5 w-3.5" strokeWidth={2.5} />
            Ride request · {post.status}
          </span>
          {displayPriceCents != null && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-bold text-primary">
              {formatCents(displayPriceCents)}
              {confirmedClaim && <span className="ml-1 font-medium text-primary/70">agreed</span>}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-card-foreground">
          {post.origin} <span className="text-muted-foreground">→</span> {post.destination}
        </h1>
        <p className="mt-1 text-muted-foreground">{formatDepartAt(post.departAt, "long")}</p>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
          <Avatar src={post.author?.image} name={post.author?.name} />
          Posted by {post.author?.name ?? "A neighbor"}
        </p>
        <a
          href={directionsUrl(
            { label: post.origin, lat: post.originLat, lng: post.originLng },
            { label: post.destination, lat: post.destLat, lng: post.destLng }
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-1.5 text-sm font-bold text-foreground shadow-sm transition hover:border-primary hover:bg-muted"
        >
          <Navigation className="h-3.5 w-3.5" strokeWidth={2.5} />
          Get directions
        </a>
      </div>

      {post.notes && (
        <p className="rounded-xl border border-border bg-card p-4 text-card-foreground">{post.notes}</p>
      )}

      {post.originLat != null && post.originLng != null && (
        <PostMapSection
          origin={{ lat: post.originLat, lng: post.originLng, label: post.origin }}
          destination={
            post.destLat != null && post.destLng != null
              ? { lat: post.destLat, lng: post.destLng, label: post.destination }
              : null
          }
        />
      )}

      <ContactCard postId={post.id} viewerId={viewerId} />

      <ClaimList post={post} viewerId={viewerId} />

      {canClaim && (
        <form
          action={claimAction.bind(null, post.id)}
          className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <label htmlFor="message" className="block text-sm font-medium text-foreground">
            Offer to give this ride
          </label>
          <div>
            <label htmlFor="offerAmount" className="block text-xs font-medium text-muted-foreground">
              Your price <span className="text-muted-foreground">(optional)</span>
            </label>
            <div className="relative mt-1 w-32">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <input
                id="offerAmount"
                name="offerAmount"
                type="number"
                min="0"
                max="500"
                step="1"
                defaultValue={post.askingPriceCents != null ? (post.askingPriceCents / 100).toFixed(0) : ""}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-background py-2 pl-6 pr-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
            </div>
          </div>
          <textarea
            id="message"
            name="message"
            rows={2}
            placeholder="Optional note, e.g. what time you can pick up"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
          <button
            type="submit"
            className="rounded-full bg-gradient-primary px-5 py-2 text-sm font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
          >
            I can drive
          </button>
        </form>
      )}

      {!viewerId && isOpenForClaims && (
        <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
          <Link href={`/login?callbackUrl=/posts/${post.id}`} className="font-bold text-primary underline underline-offset-2">
            Sign in
          </Link>{" "}
          to respond to this post.
        </p>
      )}

      {isAuthor && post.status !== "FILLED" && post.status !== "CANCELLED" && (
        <form action={cancelPostAction.bind(null, post.id)}>
          <button type="submit" className="text-sm font-semibold text-danger underline underline-offset-2 hover:opacity-80">
            Cancel this post
          </button>
        </form>
      )}
    </div>
  );
}
