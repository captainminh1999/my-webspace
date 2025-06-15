// src/app/layout.tsx
import "./globals.css"; // Keep this for Tailwind and other global styles
import type { Metadata, Viewport } from "next";
// Use system fonts to avoid build-time downloads

import profileDataFromFile from '@/data/profile.json';


interface ProfileTitleData {
  firstName?: string | null;
  lastName?: string | null;
}
const profileDataForTitle = profileDataFromFile as ProfileTitleData;

export async function generateMetadata(): Promise<Metadata> {
  // ... (your existing generateMetadata function)
  const firstName = profileDataForTitle.firstName;
  const lastName = profileDataForTitle.lastName;
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
      <body className="font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}