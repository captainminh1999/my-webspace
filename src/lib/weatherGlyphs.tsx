// OpenWeather icon code → one of eight inline glyphs + a condition word.
// Replaces the 50 px PNGs from openweathermap.org (docs/DESIGN-DIRECTION.md § Widget card).
export type Glyph = "sun" | "moon" | "cloud-sun" | "cloud" | "rain" | "thunder" | "snow" | "mist";

export function glyphFor(code: string): { glyph: Glyph; word: string } {
  const n = code.slice(0, 2);
  const night = code.endsWith("n");
  switch (n) {
    case "01":
      return night ? { glyph: "moon", word: "Clear" } : { glyph: "sun", word: "Sunny" };
    case "02":
      return { glyph: "cloud-sun", word: "Partly cloudy" };
    case "03":
      return { glyph: "cloud", word: "Cloudy" };
    case "04":
      return { glyph: "cloud", word: "Overcast" };
    case "09":
      return { glyph: "rain", word: "Showers" };
    case "10":
      return { glyph: "rain", word: "Rain" };
    case "11":
      return { glyph: "thunder", word: "Storms" };
    case "13":
      return { glyph: "snow", word: "Snow" };
    case "50":
      return { glyph: "mist", word: "Mist" };
    default:
      return { glyph: "cloud", word: "—" };
  }
}

const PATHS: Record<Glyph, React.ReactNode> = {
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  "cloud-sun": (
    <>
      <path d="M8 4v1.5M3.5 8.5H5M5.2 5.2l1 1M11 5.5a3.5 3.5 0 0 0-5.7 3.8" />
      <path d="M9 19h8.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 9 19z" />
    </>
  ),
  cloud: <path d="M7 19h10.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 7 19z" />,
  rain: (
    <>
      <path d="M7 15h10.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 7 15z" />
      <path d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
    </>
  ),
  thunder: (
    <>
      <path d="M7 14h10.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 7 14z" />
      <path d="M13 14l-2 4h3l-2 4" />
    </>
  ),
  snow: (
    <>
      <path d="M7 15h10.5a3.5 3.5 0 0 0 .5-7 5 5 0 0 0-9.6-1.3A4.2 4.2 0 0 0 7 15z" />
      <path d="M8 19h.01M12 19h.01M16 19h.01M10 22h.01M14 22h.01" />
    </>
  ),
  mist: <path d="M4 9h12M6 13h14M4 17h10M8 21h8" />,
};

export function WeatherGlyph({ code, size = 40, className = "" }: { code: string; size?: number; className?: string }) {
  const { glyph, word } = glyphFor(code);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role="img"
      aria-label={word}
    >
      {PATHS[glyph]}
    </svg>
  );
}
