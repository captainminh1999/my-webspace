// src/types/photography.ts

/** The trimmed shape we store in src/data/photography.json */
export interface PhotographyData {
  id: string;
  thumbnail: string;     // small version (~400px wide)
  full: string;          // full-resolution URL
  photographer: string;  // e.g. "John Doe"
  profile: string;       // link to photographer’s Unsplash profile
  alt: string;           // alt description (may be empty)
  createdAt: string;     // ISO string, e.g. "2023-10-07T12:34:56Z"
}
