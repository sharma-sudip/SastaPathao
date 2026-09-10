import { Check, X } from "lucide-react";
import type { PostDetail } from "@/lib/db/queries";
import { confirmAction, declineAction, withdrawAction } from "@/app/(site)/posts/[id]/actions";
import { ClaimChat } from "@/components/claim-chat";

const ACTIVE_STATUSES = new Set(["PROPOSED", "CONFIRMED"]);

const STATUS_STYLE: Record<string, string> = {
  PROPOSED: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  CONFIRMED: "bg-primary/15 text-primary",
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
      {visibleClaims.map((claim) => (
        <div key={claim.id} className="rounded-xl border-2 border-border bg-card p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-card-foreground">
              {isAuthor ? claim.claimant?.name ?? "A neighbor" : "You"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS_STYLE[claim.status]}`}>
              {claim.status.charAt(0) + claim.status.slice(1).toLowerCase()}
            </span>
          </div>
          {claim.message && (
            <p className="mt-1 text-sm text-muted-foreground">&ldquo;{claim.message}&rdquo;</p>
          )}

          {isAuthor && claim.status === "PROPOSED" && (
            <div className="mt-2 flex gap-2">
              <form action={confirmAction.bind(null, claim.id, post.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-full bg-gradient-primary px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                  Confirm
                </button>
              </form>
              <form action={declineAction.bind(null, claim.id, post.id)}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1 rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.75} />
                  Decline
                </button>
              </form>
            </div>
          )}

          {!isAuthor && claim.claimantId === viewerId && claim.status === "PROPOSED" && (
            <form action={withdrawAction.bind(null, claim.id, post.id)} className="mt-2">
              <button
                type="submit"
                className="rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold text-foreground transition hover:bg-muted"
              >
                Withdraw claim
              </button>
            </form>
          )}

          {viewerId && ACTIVE_STATUSES.has(claim.status) && (
            <ClaimChat claimId={claim.id} viewerId={viewerId} />
          )}
        </div>
      ))}
    </div>
  );
}
