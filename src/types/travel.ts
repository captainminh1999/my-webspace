/** One end of a journey: a city, where its centre is. */
export interface Place {
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "JP". */
  country: string;
  lat: number;
  lon: number;
}

/** How a journey was made. */
export type Mode = "air" | "land" | "sea";

/**
 * One journey: from a place stayed in to the next one. The connections on the way are not places:
 * Sydney to Hanoi with a night in Singapore's airport is one journey, Sydney to Hanoi.
 */
export interface Journey {
  from: Place;
  to: Place;
  year: number;
  /** 1-12, the month it set off; absent when only the year is known. */
  month?: number;
  /** Absent when only the stays at either end are known, not how the owner got between them. */
  by?: Mode;
}
