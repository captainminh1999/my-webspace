// src/types/games.ts

export interface GameItem {
  id: number;
  name: string;
  thumbnail: string;
  released: string; // YYYY-MM-DD
}

export type GameData = GameItem[];
