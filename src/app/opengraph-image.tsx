// src/app/opengraph-image.tsx — the 1200×630 share image for every page, set as the
// masthead is: the vermilion mark and stamp, the name where the dateline goes, the rule,
// the feed strip. Rendered once at build, so it reads nothing: the fixed name stands in
// for the profile's. The type is the site's, from src/fonts/ (Google Fonts' static WOFF
// cuts, OFL): next/font's copies sit in the build cache, not a path to rely on, and Satori
// reads neither WOFF2 nor a variable font. Fonts given here replace next/og's bundled
// Geist, so every line names its family; a glyph neither file has would be fetched from
// Google Fonts at build — the copy here stays in Latin.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { COLORS, OWNER_NAME, SITE_NAME } from "@/lib/site";

export const alt = `${OWNER_NAME} — Daily Dash: a daily page of live feeds, and a CV. ${SITE_NAME}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const FEEDS = ["WEATHER", "NEWS", "SPACE", "PHOTO", "COFFEE", "VERSE", "GAMES", "VIDEO"];

// The site's stamp register: Plex Mono 400, uppercase, tracked. Everything else is Fraunces 500, as the masthead's dateline.
const stamp = { display: "flex", fontFamily: "Plex Mono", fontWeight: 400, fontSize: 22, letterSpacing: 2, textTransform: "uppercase" } as const;

const font = (file: string) => readFile(join(process.cwd(), "src/fonts", file));

export default async function OpengraphImage() {
  const [fraunces, plexMono] = await Promise.all([font("Fraunces-Medium.woff"), font("IBMPlexMono-Regular.woff")]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px 56px",
          background: COLORS.bg,
          color: COLORS.ink,
          fontFamily: "Fraunces",
          fontWeight: 500,
        }}
      >
        <div style={{ ...stamp, justifyContent: "space-between", alignItems: "center", color: COLORS.ink2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 16, height: 16, background: COLORS.accent }} />
            {`Daily Dash · ${SITE_NAME}`}
          </div>
          <div style={{ display: "flex", color: COLORS.ink3 }}>Sydney</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          <div style={{ fontSize: 132, lineHeight: 1, letterSpacing: -3 }}>{OWNER_NAME}</div>
          <div style={{ fontSize: 40, lineHeight: 1.3, marginTop: 28, color: COLORS.ink2 }}>A daily page of live feeds, and a CV.</div>
        </div>

        <div style={{ height: 2, marginTop: 64, background: COLORS.ruleStrong }} />
        <div style={{ ...stamp, marginTop: 24, color: COLORS.ink3 }}>{FEEDS.join(" · ")}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Fraunces", data: fraunces, weight: 500, style: "normal" },
        { name: "Plex Mono", data: plexMono, weight: 400, style: "normal" },
      ],
    },
  );
}
