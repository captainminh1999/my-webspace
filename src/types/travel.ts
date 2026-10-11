/** One stop: a city in a month. A city visited in two different months is two stops. */
export interface TravelStop {
  city: string;
  /** ISO 3166-1 alpha-2, e.g. "JP". */
  country: string;
  year: number;
  /** 1-12, the month of arrival; absent when only the year is known. */
  month?: number;
  lat: number;
  lon: number;
}
