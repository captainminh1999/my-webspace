// What the space feed accepts from NASA's APOD API (api.nasa.gov/planetary/apod), which builds its answer by
// reading the apod.nasa.gov page. On 2026-10-10 it answered with the page's site header instead of the picture:
// title "NASA Science", url and hdurl the science.nasa.gov logo (121×102 px), and the next day's teaser stuck to
// the end of the explanation. Such an answer is refused, so the card keeps the last good picture and the run
// record says why (netlify/functions/feeds/sources.ts → space).

export type ApodPayload = Record<string, unknown>;

const hostOf = (url: unknown): string | null => {
  if (typeof url !== "string") return null;
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
};

/** Why this APOD answer must not be stored, or null when it can be. Never names a full URL (they can carry the key). */
export function apodProblem(apod: ApodPayload | null | undefined): string | null {
  if (!apod?.date) return "no date";
  const title = typeof apod.title === "string" ? apod.title.trim() : "";
  if (!title) return "no title";
  if (title === "NASA Science") return 'the title is the site\'s name ("NASA Science")';
  // A picture of the day is always served from apod.nasa.gov itself; videos come from YouTube or Vimeo and
  // "other" days (interactives) may have no picture at all, so only images are held to it.
  if (apod.media_type === "image") {
    for (const key of ["url", "hdurl"] as const) {
      if (key === "hdurl" && apod.hdurl == null) continue; // not every day has an HD version
      const host = hostOf(apod[key]);
      if (host !== "apod.nasa.gov") return `${key} is on ${host ?? "no host"}, not apod.nasa.gov`;
    }
  }
  return null;
}

/** The explanation without the teaser for the next day that the API can leave on its end. */
export function cleanExplanation(text: string): string {
  return text.replace(/\s*Tomorrow's picture:[\s\S]*$/, "").trim();
}
