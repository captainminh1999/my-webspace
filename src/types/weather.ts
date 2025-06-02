// src/types/weather.ts
// Type definitions for the trimmed OpenWeather One Call data we store in data/weather.json

export interface HourlyItem {
  dt: number;          // Unix timestamp (seconds)
  temp: number;        // °C
  icon: string;        // e.g. "10d"
}

export interface DailyItem {
  dt: number;          // Unix timestamp (seconds)
  min: number;         // min °C
  max: number;         // max °C
  icon: string;        // e.g. "04d"
}

export interface WeatherData {
  updated: number;                 // timestamp the fetch occurred
  current: { temp: number; icon: string };
  hourly: HourlyItem[];            // first 12 hourly entries
  daily: DailyItem[];              // first 7 daily entries
}

/*
Example JSON (data/weather.json) matching these types:
{
  "updated": 1717326600,
  "current": { "temp": 18, "icon": "04d" },
  "hourly": [
    { "dt": 1717329600, "temp": 17, "icon": "10d" },
    { "dt": 1717333200, "temp": 16, "icon": "10d" },
    … 10 more …
  ],
  "daily": [
    { "dt": 1717363200, "min": 15, "max": 22, "icon": "10d" },
    … 6 more …
  ]
}
*/
