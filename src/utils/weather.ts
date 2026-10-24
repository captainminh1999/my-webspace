// The weather feed runs every 3 hours and stores 15 hourly readings from the hour it ran; the page is rendered
// at any time between runs, so it shows the hours still to come, not the ones the reading started with.
import type { WeatherData } from "../types/weather.ts";

/** The hourly readings whose hour has not ended by `now`, at most `count` of them. */
export function upcomingHours(data: { hourly?: WeatherData["hourly"] }, now: Date, count = 12): WeatherData["hourly"] {
  return (data.hourly ?? []).filter((h) => h.dt * 1000 + 3_600_000 > now.getTime()).slice(0, count);
}
