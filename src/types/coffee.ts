// src/types/coffee.ts

export interface CoffeeArticle {
  title: string;
  url: string;
  image: string;       // "" when the publisher gave no picture
  publishedAt: string; // ISO string
  source?: string;     // the paper, e.g. "Sprudge"; absent on items stored before the feed read publishers directly
}

export type CoffeeData = CoffeeArticle[]; // array (length ≤ 8), different papers first
