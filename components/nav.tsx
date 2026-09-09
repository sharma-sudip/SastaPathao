import Link from "next/link";
import { Car } from "lucide-react";
import { auth, signOut } from "@/auth";
import { ThemeToggle } from "@/components/theme-toggle";

export async function Nav() {
  const session = await auth();

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-foreground">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-sm">
            <Car className="h-4 w-4" strokeWidth={2.5} />
          </span>
          Sasta Pathao
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
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
                className="rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground"
              >
                My rides
              </Link>
              <Link
                href="/account"
                className="hidden rounded-full px-3 py-1.5 font-semibold text-foreground/80 transition hover:bg-muted hover:text-foreground sm:inline-block"
              >
                Profile
              </Link>
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
        </nav>
      </div>
    </header>
  );
}
