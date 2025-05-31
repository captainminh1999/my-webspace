// src/app/layout.tsx
import type { Metadata, Viewport } from "next"; // Added Viewport for completeness
import { Inter } from "next/font/google";
import "./globals.css";

// Import your profile data
// Ensure the path is correct relative to your layout.tsx file
// and your tsconfig.json paths alias for @/* is set up.
import profileDataFromFile from '@/data/profile.json'; 

const inter = Inter({ subsets: ["latin"] });

// Define a simple interface for the part of profileData we need for the title
interface ProfileTitleData {
  firstName?: string | null;
  lastName?: string | null;
}

// Type assertion for the imported data
const profileDataForTitle = profileDataFromFile as ProfileTitleData;

// Dynamically generate metadata
export async function generateMetadata(): Promise<Metadata> {
  const firstName = profileDataForTitle.firstName;
  const lastName = profileDataForTitle.lastName;

  let siteTitle = "My Space - Interactive CV"; // Default/fallback title
  if (firstName && lastName) {
    siteTitle = `${firstName} ${lastName} - My Space`;
  } else if (firstName) {
    siteTitle = `${firstName} - My Space`;
  } else if (lastName) {
    siteTitle = `${lastName} - My Space`;
  }

  return {
    title: siteTitle,
    description: "My interactive online curriculum vitae and personal space.", // You can customize this
    // You can add other metadata fields here too, e.g., openGraph, icons
    // icons: {
    //   icon: '/favicon.ico', // Make sure favicon.ico is in your public folder
    // },
  };
}

// Optional: Define viewport settings
export const viewport: Viewport = {
  themeColor: '#ffffff', // Example theme color
  // width: 'device-width', // Usually default
  // initialScale: 1, // Usually default
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100`}>
        {/* You might want a global header/navbar here outside the main page content,
          or a footer. For a single-page CV feel, often the main content takes the whole space.
        */}
        {children}
      </body>
    </html>
  );
}
