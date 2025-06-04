// src/types/drone.ts

/** A single trimmed “drone news” article */
export interface DroneNewsItem {
  title: string;
  url: string;
  image: string;    // URL to thumbnail (may be empty string if none)
  publishedAt: string; // ISO timestamp, e.g. "2025-06-03T14:22:00Z"
}

/** The entire array returned in data/droneNews.json */
export type DroneNewsData = DroneNewsItem[];
