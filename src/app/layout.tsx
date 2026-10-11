// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";

import Analytics from "@/components/Analytics";
import { getProfile } from "@/lib/cv";
import { COLORS, OWNER_NAME, ROOT_OPEN_GRAPH, SITE_URL, dashDescription, ownerName } from "@/lib/site";

// Two self-hosted families (docs/DESIGN-DIRECTION.md § Typography). Body text
// uses the system stack, so these only carry the display and data registers.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  variable: "--font-fraunces",
  adjustFontFallback: true,
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-plex-mono",
  // next/font has no monospace default and would synthesise a fallback from
  // proportional Arial, which breaks tabular figures until the woff2 swaps in.
  adjustFontFallback: false,
  fallback: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
});

// Runs before any stylesheet applies so the first paint is already in the
// right theme. Dark is the default; the OS preference wins on a first visit;
// an explicit choice in localStorage wins after that. It is inline and has no
// nonce here on purpose: the page is cached, so the nonce is stamped on it at the
// edge (netlify/edge-functions/csp.ts), per response.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}`;


// Everything here is also `/`'s metadata, which page.tsx does not set. Pages below
// set their own title, description, canonical URL and og:url through pageMetadata()
// in src/lib/site.ts; one that does not inherits `/` for both — a claim that it is a
// copy of the home page. Icons, og:image and the manifest come from the file
// conventions in this directory.
export async function generateMetadata(): Promise<Metadata> {
  let name = OWNER_NAME;
  try {
    name = ownerName(await getProfile());
  } catch (err) {
    console.error("Failed to fetch profile data for metadata", err);
  }
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${name} — Daily Dash`, template: `%s — ${name}` },
    description: dashDescription(name),
    alternates: { canonical: "/" },
    openGraph: ROOT_OPEN_GRAPH,
    // Title, description and image are filled in from the Open Graph fields.
    twitter: { card: "summary_large_image" },
  };
}

// The browser's chrome follows the OS, by the first-visit rule in themeScript: light
// only when the OS asks for it, dark otherwise (the entry without a media query).
// It does not follow the toggle: that would take script in two places — before paint
// for a stored choice, and in the toggle — and a guard against Next rendering these
// tags again on navigation, for a tint. colorScheme lists dark first for the same
// rule (a UA picks the OS's scheme if listed, else the first); globals.css sets the
// scheme the page actually uses once data-theme is known.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: COLORS.bgLight },
    { color: COLORS.bg },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: data-theme is written by the inline script
    // before React hydrates, so the server and client attributes differ on purpose.
    <html lang="en" data-scroll-behavior="smooth" className={`${fraunces.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans bg-bg text-ink">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
