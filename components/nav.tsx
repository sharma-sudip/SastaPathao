import Link from "next/link";
import { LogOut } from "lucide-react";
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
    // z-[1100]: high enough to stay above ordinary page content (this
    // header is `sticky`) and above its own notification/menu dropdowns'
    // siblings -- see photo-lightbox.tsx for why it in turn needs to sit
    // above this.
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
              <Link
                href="/dashboard"
                className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
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
                className="hidden sm:block"
              >
                <button
                  type="submit"
                  className="rounded-full px-3 py-1.5 font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
              {/* Icon-only below `sm` -- the bar there only ever shows the
                  hamburger, notification bell, and this, everything else
                  (My rides, Profile, Admin, Redeem, theme) lives in
                  <MobileNavMenu> instead. */}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
                className="sm:hidden"
              >
                <button
                  type="submit"
                  aria-label="Sign out"
                  title="Sign out"
                  className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" strokeWidth={2.25} />
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
          {session?.user && <NotificationBell />}
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
          <MobileNavMenu
            isSignedIn={!!session?.user}
            isAdmin={isAdminEmail(session?.user?.email)}
            isPartner={isPartnerEmail(session?.user?.email)}
          />
        </nav>
      </div>
    </header>
  );
}
