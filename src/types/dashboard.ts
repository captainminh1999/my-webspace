// Shapes of the data the dashboard renders. The widget payloads are exactly
// what the ingestion jobs write to MongoDB (see docs/ARCHITECTURE.md §6).
import type { WeatherData } from "./weather";
import type { TechStory } from "./tech";
import type { CoffeeArticle } from "./coffee";
import type { DroneNewsItem } from "./drone";
import type { GameItem } from "./games";
import type { PhotographyData } from "./photography";
import type { YouTubeRecData } from "./youtubeRecs";
import type { EpicData, MarsPhotoData, MarsWeatherData } from "./spaceExtra";
import type { ProfileData } from "@/types";

export interface Apod {
  url: string;
  hdurl?: string;
  title: string;
  date: string; // YYYY-MM-DD
  explanation: string;
  media_type?: string; // "image" | "video" | "other"
  thumbnail_url?: string;
  copyright?: string;
}

export interface SpaceData {
  space: Apod | null;
  epic: EpicData | null;
  mars: MarsPhotoData | null;
  marsWeather: MarsWeatherData | null;
}

/** singletons/meta — written by every fetch job's "Record fetch time" step. */
export interface MetaData {
  fetchedAt?: Partial<Record<WidgetId, string>>;
}

export const WIDGET_IDS = [
  "weather",
  "tech",
  "space",
  "camera",
  "coffee",
  "drones",
  "games",
  "youtube",
] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export interface DashboardData {
  weather: WeatherData | null;
  tech: TechStory[];
  space: SpaceData | null;
  camera: PhotographyData | null;
  coffee: CoffeeArticle[];
  drones: DroneNewsItem[];
  games: GameItem[];
  youtube: YouTubeRecData | null;
  meta: MetaData | null;
  profile: ProfileData | null;
  /** When the server rendered this payload (ISO). */
  renderedAt: string;
}
