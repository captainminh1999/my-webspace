/** One stop: a city in a year. A city visited in two different years is two stops. */
export interface TravelStop {
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "JP". */
  country: string;
  year: number;
  lat: number;
  lon: number;
}
