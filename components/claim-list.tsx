import { Check, X } from "lucide-react";
import type { PostDetail } from "@/lib/db/queries";
import { confirmAction, declineAction, withdrawAction, counterAction } from "@/app/(site)/posts/[id]/actions";
import { formatCents } from "@/lib/pricing";
import { ClaimChat } from "@/components/claim-chat";
import { Avatar } from "@/components/avatar";

const ACTIVE_STATUSES = new Set(["PROPOSED", "CONFIRMED"]);

const STATUS_STYLE: Record<string, string> = {
  PROPOSED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONFIRMED: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  DECLINED: "bg-muted text-muted-foreground",
  WITHDRAWN: "bg-muted text-muted-foreground",
};

export function ClaimList({ post, viewerId }: { post: PostDetail; viewerId: string | undefined }) {
  const isAuthor = viewerId === post.authorId;
  const visibleClaims = isAuthor
    ? post.claims
    : post.claims.filter((c) => c.claimantId === viewerId);

  if (visibleClaims.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold text-foreground">
        {isAuthor ? "Claims on this post" : "Your claim"}
      </h2>
      {visibleClaims.map((claim) => {
        const isMe = claim.claimantId === viewerId;
        const hasOffer = claim.offerAmountCents != null;
        // Whose turn is it to act on the current number -- the author's,
        // unless the author is the one who just countered (offerBy
        // "author"), in which case it's the claimant's turn to respond.
        // With no offer at all yet, introducing one is open to either side.
        const isMyTurn = isAuthor ? claim.offerBy !== "author" : isMe && claim.offerBy === "author";
        const canAccept = claim.status === "PROPOSED" && (hasOffer ? isMyTurn : isAuthor);
        const canCounter = claim.status === "PROPOSED" && (isAuthor || isMe) && (!hasOffer || isMyTurn);

        return (
          <div key={claim.id} className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm font-bold text-card-foreground">
                {isAuthor && <Avatar src={claim.claimant?.image} name={claim.claimant?.name} />}
                {isAuthor ? claim.claimant?.name ?? "A neighbor" : "You"}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[claim.status]}`}>
                {claim.status.charAt(0) + claim.status.slice(1).toLowerCase()}
              </span>
            </div>
            {claim.message && (
              <p className="mt-1 text-sm text-muted-foreground">&ldquo;{claim.message}&rdquo;</p>
            )}

            {hasOffer && (
              <p className="mt-1.5 text-sm">
                <span className="font-bold text-primary">{formatCents(claim.offerAmountCents!)}</span>{" "}
                {claim.status === "PROPOSED" && (
                  <span className="text-xs text-muted-foreground">
                    {isMyTurn ? "— your turn to respond" : "— waiting for a response"}
                  </span>
                )}
              </p>
            )}

            {claim.status === "PROPOSED" && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {canAccept && (
                  <form action={confirmAction.bind(null, claim.id, post.id)}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                      {hasOffer ? `Accept ${formatCents(claim.offerAmountCents!)}` : "Confirm"}
                    </button>
                  </form>
                )}

                {isAuthor && (
                  <form action={declineAction.bind(null, claim.id, post.id)}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.75} />
                      Decline
                    </button>
                  </form>
                )}

                {!isAuthor && isMe && (
                  <form action={withdrawAction.bind(null, claim.id, post.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                    >
                      Withdraw claim
                    </button>
                  </form>
                )}

                {canCounter && (
                  <form action={counterAction.bind(null, claim.id, post.id)} className="flex items-center gap-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <input
                        type="number"
                        name="amount"
                        min="0"
                        max="500"
                        step="1"
                        defaultValue={hasOffer ? Math.round(claim.offerAmountCents! / 100) : undefined}
                        placeholder="0"
                        required
                        className="w-20 rounded-full border border-border bg-background py-1.5 pl-5 pr-2 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/30"
                      />
                    </div>
                    <button
                      type="submit"
                      className="rounded-full border border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                    >
                      {hasOffer ? "Counter" : "Propose price"}
                    </button>
                  </form>
                )}
              </div>
            )}

            {viewerId && ACTIVE_STATUSES.has(claim.status) && (
              <ClaimChat claimId={claim.id} viewerId={viewerId} />
            )}
          </div>
        );
      })}
    </div>
  );
}
