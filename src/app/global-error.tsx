"use client";

// src/app/global-error.tsx — stands in for the root layout when the layout itself
// throws, so it brings its own <html>, <body> and stylesheet. No theme script (no
// inline script may exist outside layout.tsx — see csp.ts): without data-theme the
// tokens in globals.css are dark, and light when the OS prefers it. A visitor's saved
// toggle choice is not read here; this page is rare and must not flash.
import "./globals.css";
import { useEffect, type CSSProperties } from "react";
import ErrorFrame from "@/components/ErrorFrame";

// The next/font variables live on the layout's <html> class, which is not rendered
// here; without them var(--font-fraunces) voids the whole font stack. These are the
// fallbacks layout.tsx and globals.css already name, so the display and data
// registers still read as such, at zero bytes.
const FONTS = {
  "--font-fraunces": "Georgia",
  "--font-plex-mono": "ui-monospace, SFMono-Regular, Menlo, Consolas",
} as CSSProperties;

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" style={FONTS}>
      <body className="font-sans bg-bg text-ink">
        {/* No metadata export in an error boundary; React hoists this into <head>. */}
        <title>Error — Minh Nguyen</title>
        <ErrorFrame kicker="ERROR" head="SITE ERROR" reference={error.digest} title="The site failed to load." onRetry={retry}>
          <p>
            The frame every page is drawn in threw an error, so there is nothing to show. Trying again asks for a fresh copy; if
            that fails too, try again in a few minutes.
          </p>
        </ErrorFrame>
      </body>
    </html>
  );
}
