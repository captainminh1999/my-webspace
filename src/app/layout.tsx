// src/app/layout.tsx
import "./globals.css"; // Keep this for Tailwind and other global styles
import type { Metadata, Viewport } from "next";
import Script from "next/script";
// Use system fonts to avoid build-time downloads

import { getCvSection } from '@/lib/getCvSection';


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
    <html lang="en">
      <head>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-N8S80ZDYP0"
          strategy="afterInteractive"
        />
        <Script id="google-tag" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('config', 'G-N8S80ZDYP0');
          `}
        </Script>
      </head>
      <body className="font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}