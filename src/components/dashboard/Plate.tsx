import Image from "next/image";

// The hosts next.config.ts lets through the image optimizer (images.remotePatterns) — keep the two in step.
// Anything else (an APOD video thumbnail, NASA moving APOD to another host) is shown as it is rather than as a broken image.
const OPTIMIZED = [
  /^https:\/\/apod\.nasa\.gov\/apod\/image\//,
  /^https:\/\/epic\.gsfc\.nasa\.gov\/archive\//,
  /^https:\/\/images\.unsplash\.com\//,
  /^https:\/\/i\.ytimg\.com\/vi\//,
  /^https:\/\/media\.rawg\.io\/media\//,
];
export const canOptimize = (src: string) => OPTIMIZED.some((re) => re.test(src));

interface PlateProps {
  src: string;
  alt: string;
  /** Pixel size from the feed. Without it the frame starts at 16:9 and takes the picture's shape once it has loaded. */
  width?: number;
  height?: number;
  sizes: string;
  quality?: number;
}

/**
 * A dialog's photograph. The frame takes the picture's own shape, so there are no
 * letterbox bars and the picture starts on the same left edge as the text around it.
 * A measured picture is held to the height of the dialog so it can be seen whole —
 * for a wide one the limit is beyond the column and changes nothing.
 */
export function Plate({ src, alt, width, height, sizes, quality = 75 }: PlateProps) {
  const known = !!width && !!height;
  const w = known ? width : 1600;
  const h = known ? height : 900;
  return (
    <div
      className="overflow-hidden rounded-thumb bg-surface-2 border border-rule"
      // 14rem: the dialog's margins, header and padding plus the lines above the picture.
      style={known ? { maxWidth: `max(16rem, calc((100dvh - 14rem) * ${(w / h).toFixed(4)}))` } : undefined}
    >
      <Image src={src} alt={alt} width={w} height={h} sizes={sizes} quality={quality} unoptimized={!canOptimize(src)} className="block w-full h-auto" />
    </div>
  );
}
