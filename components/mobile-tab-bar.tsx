import Link from "next/link";
import { Hand, Car, LogIn, LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";

// Small-screen bottom action bar. The equivalent links live in <Nav> too,
// but are hidden below `sm` there to keep the top bar from overflowing --
// this surfaces them (plus sign out/in) as a persistent bottom bar instead,
// the usual mobile-app pattern. Only rendered inside app/(site)/layout.tsx,
// so it never shows up over the splash screen.
export async function MobileTabBar() {
  const session = await auth();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex border-t-2 border-border bg-card/95 backdrop-blur-md sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        href="/requests/new"
        className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-foreground/80 transition active:bg-muted"
      >
        <Hand className="h-5 w-5" strokeWidth={2.25} />
        Need a ride
      </Link>
      <Link
        href="/board"
        className="flex flex-1 flex-col items-center gap-0.5 border-x-2 border-border py-2.5 text-[11px] font-bold uppercase tracking-wide text-foreground/80 transition active:bg-muted"
      >
        <Car className="h-5 w-5" strokeWidth={2.25} />
        Offer a ride
      </Link>
      {session?.user ? (
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
          className="flex flex-1"
        >
          <button
            type="submit"
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground transition active:bg-muted"
          >
            <LogOut className="h-5 w-5" strokeWidth={2.25} />
            Sign out
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-primary transition active:bg-muted"
        >
          <LogIn className="h-5 w-5" strokeWidth={2.25} />
          Sign in
        </Link>
      )}
    </nav>
  );
}
