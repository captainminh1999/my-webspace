// src/types/youtubeRecs.ts

export interface YouTubeRecItem {
  channelId: string;
  videoId: string;
  title: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

export interface YouTubeRecData {
  items: YouTubeRecItem[];
}
