// Sample stops for the Travel card mock-up — invented, not a record of real trips.
// Replace with the real list (or move it into MongoDB behind the admin upload) before calling it done.
// Newest first within a year: that is the order the board shows them in.
import type { TravelStop } from "@/types/travel";

export const SAMPLE_STOPS: TravelStop[] = [
  { city: "Tokyo", country: "JP", year: 2026, lat: 35.6762, lon: 139.6503 },
  { city: "Kyoto", country: "JP", year: 2026, lat: 35.0116, lon: 135.7681 },
  { city: "Hobart", country: "AU", year: 2026, lat: -42.8821, lon: 147.3272 },
  { city: "Hanoi", country: "VN", year: 2025, lat: 21.0278, lon: 105.8342 },
  { city: "Da Nang", country: "VN", year: 2025, lat: 16.0544, lon: 108.2022 },
  { city: "Auckland", country: "NZ", year: 2025, lat: -36.8485, lon: 174.7633 },
  { city: "London", country: "GB", year: 2024, lat: 51.5072, lon: -0.1276 },
  { city: "Edinburgh", country: "GB", year: 2024, lat: 55.9533, lon: -3.1883 },
  { city: "Paris", country: "FR", year: 2024, lat: 48.8566, lon: 2.3522 },
  { city: "Amsterdam", country: "NL", year: 2024, lat: 52.3676, lon: 4.9041 },
  { city: "Ho Chi Minh City", country: "VN", year: 2023, lat: 10.8231, lon: 106.6297 },
  { city: "Singapore", country: "SG", year: 2023, lat: 1.3521, lon: 103.8198 },
  { city: "Seoul", country: "KR", year: 2023, lat: 37.5665, lon: 126.978 },
  { city: "Queenstown", country: "NZ", year: 2022, lat: -45.0312, lon: 168.6626 },
  { city: "Melbourne", country: "AU", year: 2022, lat: -37.8136, lon: 144.9631 },
  { city: "Tokyo", country: "JP", year: 2019, lat: 35.6762, lon: 139.6503 },
  { city: "Osaka", country: "JP", year: 2019, lat: 34.6937, lon: 135.5023 },
  { city: "Taipei", country: "TW", year: 2019, lat: 25.033, lon: 121.5654 },
  { city: "San Francisco", country: "US", year: 2018, lat: 37.7749, lon: -122.4194 },
  { city: "New York", country: "US", year: 2018, lat: 40.7128, lon: -74.006 },
  { city: "Vancouver", country: "CA", year: 2018, lat: 49.2827, lon: -123.1207 },
  { city: "Bangkok", country: "TH", year: 2016, lat: 13.7563, lon: 100.5018 },
  { city: "Kuala Lumpur", country: "MY", year: 2016, lat: 3.139, lon: 101.6869 },
  { city: "Hong Kong", country: "HK", year: 2014, lat: 22.3193, lon: 114.1694 },
  { city: "Denpasar", country: "ID", year: 2014, lat: -8.65, lon: 115.2167 },
  { city: "Ho Chi Minh City", country: "VN", year: 2012, lat: 10.8231, lon: 106.6297 },
];
