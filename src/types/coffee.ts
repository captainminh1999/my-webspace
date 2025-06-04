// src/types/coffee.ts

export interface CoffeeArticle {
  title: string;
  url: string;
  image: string;       // maybe empty if NewsAPI returned no image
  publishedAt: string; // ISO string
}

export type CoffeeData = CoffeeArticle[]; // array (length ≤ 5)
