// src/components/widgets/YouTubeRecsWidget.tsx

import React from "react";
import type { YouTubeRecData, YouTubeRecItem } from "@/types/youtubeRecs";
import raw from "@/data/youtubeRecs.json" assert { type: "json" };
import WidgetSection from "@/components/WidgetSection";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

const data = raw as YouTubeRecData;

export const YouTubeRecsCard: React.FC = () => {
  const preview: YouTubeRecItem[] = data.items.slice(0, 5);

  return (
    <div className="space-y-2 p-2">
      {preview.map((item) => (
        <Link
          key={item.videoId}
          href={`https://youtu.be/${item.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-1 py-1"
        >
          <Image
            src={item.thumbnail}
            alt={item.title}
            width={80}
            height={45}
            unoptimized
            className="rounded-sm"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
              {item.title}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {item.channelTitle} • {format(new Date(item.publishedAt), "MMM d")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export const YouTubeRecsModalBody: React.FC = () => (
  <article className="space-y-4 p-4">
    {data.items.map((item) => (
      <WidgetSection key={item.videoId} className="flex items-start space-x-4">
        <Link
          href={`https://youtu.be/${item.videoId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <Image
            src={item.thumbnail}
            width={160}
            height={90}
            alt={item.title}
            unoptimized
            className="rounded-md"
          />
        </Link>
        <div className="flex-1">
          <Link
            href={`https://youtu.be/${item.videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-indigo-600 hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">
            {item.channelTitle} • {format(new Date(item.publishedAt), "MMM d, yyyy")}
          </p>
        </div>
      </WidgetSection>
    ))}
  </article>
);

export default YouTubeRecsCard;
