// src/app/manifest.ts — /manifest.webmanifest: the name, colours and icons a browser uses
// when someone saves the site to a home screen. Built once; reads nothing, so the name is
// the fixed one.
import type { MetadataRoute } from "next";
import { COLORS, OWNER_NAME, dashDescription } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${OWNER_NAME} — Daily Dash`,
    short_name: "Daily Dash",
    description: dashDescription(OWNER_NAME),
    start_url: "/",
    // A website saved as a shortcut, not an app: nearly every link on the dash leaves the
    // site, and a standalone or minimal-ui window would hide the address bar those pages
    // need. "browser" opens it in a normal tab.
    display: "browser",
    background_color: COLORS.bg,
    theme_color: COLORS.bg,
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      // A raster for anything that will not take the SVG: apple-icon.tsx, opaque.
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
