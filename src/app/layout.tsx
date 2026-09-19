// src/app/layout.tsx
import "./globals.css";
import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";

import { getCvSection } from "@/lib/cv";

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
// an explicit choice in localStorage wins after that.
const themeScript = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='dark';}`;


interface ProfileTitleData {
  firstName?: string | null;
  lastName?: string | null;
}


export async function generateMetadata(): Promise<Metadata> {
  let profileDataForTitle: ProfileTitleData | null = null;
  try {
    profileDataForTitle = (await getCvSection('profile')) as ProfileTitleData | null;
  } catch (err) {
    console.error('Failed to fetch profile data for metadata', err);
  }
  const firstName = profileDataForTitle?.firstName;
  const lastName = profileDataForTitle?.lastName;
  let siteTitle = "My Space - Interactive CV";
  if (firstName && lastName) {
    siteTitle = `${firstName} ${lastName} - My Space`;
  } else if (firstName) {
    siteTitle = `${firstName} - My Space`;
  } else if (lastName) {
    siteTitle = `${lastName} - My Space`;
  }
  return {
    title: siteTitle,
    description: "My interactive online curriculum vitae and personal space.",
  };
}

export const viewport: Viewport = { /* ... (your viewport settings) ... */ }

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
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N8S80ZDYP0"
          strategy="lazyOnload"
        />
        <Script id="google-tag" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-N8S80ZDYP0');
          `}
        </Script>
      </head>
      <body className="font-sans bg-bg text-ink">
        {children}
      </body>
    </html>
  );
}
