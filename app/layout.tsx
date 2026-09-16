import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

// Neutral geometric sans, closer to Uber's own (unlicensed-for-web) "Uber
// Move" than Quicksand's rounded, friendly look was.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Sasta Pathao",
  description:
    "Sasta Pathao — a free, open-source ride board for the Youngstown, Ohio area. Post a ride request or offer. No app, no payments, just neighbors.",
};

// Just the shell (fonts, theme, global CSS) -- the splash screen at "/" and
// the rest of the app (under the "(site)" route group) both render inside
// this, but only "(site)" adds the nav/footer chrome. See app/(site)/layout.tsx.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
