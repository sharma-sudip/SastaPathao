import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const CANONICAL_ORIGIN = "https://sasta-pathao.vercel.app";
const REDIRECT_HOSTS = new Set(["sastapathao.dev", "www.sastapathao.dev"]);

// sastapathao.dev and sasta-pathao.vercel.app both point at the same
// deployment, but Auth.js's database-session cookie is host-scoped -- a
// visitor bouncing between the two mid-session (e.g. a magic-link email
// built from one domain while they're browsing the other) ends up with a
// valid session cookie on only one of them, which looks exactly like
// getting randomly signed out on the other. Until sastapathao.dev's
// DNS/SSL setup is fully sorted out, sasta-pathao.vercel.app is the one
// canonical place this app is served from -- redirect the custom domain
// here so there's only ever one live cookie jar. Preview deployments get
// their own unrelated *.vercel.app hostname and are deliberately left
// alone (REDIRECT_HOSTS only lists the custom domain, not a vercel.app
// pattern).
export function proxy(request: NextRequest) {
  const { hostname, pathname, search } = request.nextUrl;
  if (REDIRECT_HOSTS.has(hostname)) {
    return NextResponse.redirect(`${CANONICAL_ORIGIN}${pathname}${search}`, 307);
  }
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
