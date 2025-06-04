// src/components/widgets/GamesWidget.tsx
import React from "react";
import raw from "@/data/games.json" assert { type: "json" };
import type { GameData, GameItem } from "@/types/games";
import WidgetSection from "@/components/WidgetSection";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

const data = raw as GameData;

// ─── 1. Grid Cell: show top 3 games ─────────────────────
export const GamesCard: React.FC = () => {
  const preview: GameItem[] = data.slice(0, 3);

  return (
    <div className="space-y-2 p-2">
      {preview.map((game) => (
        <Link
          key={game.id}
          href={`https://rawg.io/games/${game.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-1 py-1"
        >
          <Image
            src={game.thumbnail}
            width={80}
            height={45}
            alt={game.name}
            unoptimized
            className="rounded-sm"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
              {game.name}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Released: {format(new Date(game.released), "MMM d, yyyy")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

// ─── 2. Modal Body: list all 5 games ──────────────────
export const GamesModalBody: React.FC = () => (
  <article className="space-y-4 p-4">
    {data.map((game) => (
      <Link
        key={game.id}
        href={`https://rawg.io/games/${game.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <WidgetSection className="flex items-start space-x-4 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Image
            src={game.thumbnail}
            width={160}
            height={90}
            alt={game.name}
            unoptimized
            className="rounded-md shrink-0"
          />
          <div className="flex-1">
            <p className="text-base font-semibold text-indigo-600">
              {game.name}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Released: {format(new Date(game.released), "MMM d, yyyy")}
            </p>
          </div>
        </WidgetSection>
      </Link>
    ))}
  </article>
);

export default GamesCard;
