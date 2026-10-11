// src/app/apple-icon.tsx — the 180 px home-screen icon (iOS, and the manifest's PNG):
// icon.svg's drawing, rendered once at build. Opaque edge to edge, because iOS fills
// transparency with black and rounds the corners itself.
import { ImageResponse } from "next/og";
import { COLORS, MARK } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// 11 px a unit keeps every edge on a whole pixel; the 16-unit grid is 176 px, centred.
const UNIT = 11;
const INSET = (size.width - 16 * UNIT) / 2;

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: COLORS.bg }}>
        {MARK.map(([x, y, w, h, color]) => (
          <div
            key={`${x},${y}`}
            style={{ position: "absolute", left: INSET + x * UNIT, top: INSET + y * UNIT, width: w * UNIT, height: h * UNIT, background: color }}
          />
        ))}
      </div>
    ),
    size,
  );
}
