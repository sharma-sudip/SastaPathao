import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { MobileTabBar } from "@/components/mobile-tab-bar";

// Everything except the splash screen at "/" lives under this route group, so
// it gets the normal app chrome (nav + footer + centered content column). The
// splash itself renders straight off the root layout with none of this,
// since it's meant to be the only thing on screen.
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-8 sm:pb-8">{children}</main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
