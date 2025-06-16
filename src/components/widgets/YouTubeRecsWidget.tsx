"use client";
// src/components/widgets/YouTubeRecsWidget.tsx

import React from "react";
import type { YouTubeRecData, YouTubeRecItem } from "@/types/youtubeRecs";
import WidgetSection from "@/components/WidgetSection";
import { withWidgetData } from "./withWidgetData";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

const YouTubeRecsCardBase: React.FC<{ data: YouTubeRecData }> = ({ data }) => {
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
            sizes="80px"
            className="rounded-sm"
          />
          <div className="flex-1">
            <p className="text-xs font-medium text-black dark:text-white line-clamp-2">
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

export const YouTubeRecsCard = withWidgetData<YouTubeRecData>("youtube")(YouTubeRecsCardBase);

const YouTubeRecsModalBodyBase: React.FC<{ data: YouTubeRecData }> = ({ data }) => (
  <article className="space-y-4 p-4">
    {data.items.map((item) => (
      <Link
        key={item.videoId}
        href={`https://youtu.be/${item.videoId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <WidgetSection className="flex items-start space-x-4 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Image
            src={item.thumbnail}
            width={160}
            height={90}
            alt={item.title}
            sizes="160px"
            className="rounded-md shrink-0"
          />
          <div className="flex-1">
            <p className="text-base font-semibold text-black dark:text-white">
              {item.title}
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              {item.channelTitle} • {format(new Date(item.publishedAt), "MMM d, yyyy")}
            </p>
          </div>
        </WidgetSection>
      </Link>
    ))}
  </article>
  );
);

export const YouTubeRecsModalBody = withWidgetData<YouTubeRecData>("youtube", {
  loadingHeight: "h-40",
  errorPadding: "p-4",
})(YouTubeRecsModalBodyBase);

export default YouTubeRecsCard;
