import Link from "next/link";
import { auth, signOut } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { isPartnerEmail } from "@/lib/partner";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileNavMenu } from "@/components/mobile-nav-menu";
import { NotificationBell } from "@/components/notification-bell";
import { Avatar } from "@/components/avatar";
import { Logo } from "@/components/logo";

export async function Nav() {
  const session = await auth();

  return (
    // z-[1100]: Leaflet's own panes/controls go up to z-index 1000 (same
    // reason location-picker.tsx's address dropdown needs it) -- this
    // header is `sticky`, which puts it in the same root-level stacking
    // order as an in-page Leaflet map, not automatically above it. Without
    // this, scrolling a map's tile pane up under the sticky header (or its
    // notification/menu dropdowns) painted it over the header instead.
    <header className="sticky top-0 z-[1100] border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-foreground">
          <Logo />
        </Link>
        <nav className="relative flex items-center gap-1 text-sm sm:gap-2">
          <Link
            href="/requests/new"
            className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
          >
            Need a ride
          </Link>
          <Link
            href="/board"
            className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
          >
            Offer a ride
          </Link>
          {session?.user ? (
            <>
              <NotificationBell />
              <Link
                href="/dashboard"
                className="rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground"
              >
                My rides
              </Link>
              <Link
                href="/account"
                className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-flex"
              >
                <Avatar src={session.user.image} name={session.user.name} />
                Profile
              </Link>
              {isAdminEmail(session.user.email) && (
                <Link
                  href="/admin"
                  className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
                >
                  Admin
                </Link>
              )}
              {isPartnerEmail(session.user.email) && (
                <Link
                  href="/redeem"
                  className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
                >
                  Redeem
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-gradient-primary px-4 py-1.5 font-bold text-primary-foreground shadow-sm transition hover:shadow-glow"
            >
              Sign in
            </Link>
          )}
          <ThemeToggle />
          <MobileNavMenu isSignedIn={!!session?.user} isPartner={isPartnerEmail(session?.user?.email)} />
        </nav>
      </div>
    </header>
  );
}
