// src/components/widgets/DroneNewsWidget.tsx
import React from "react";
import type { DroneNewsItem, DroneNewsData } from "@/types/drone";
import raw from "@/data/droneNews.json" assert { type: "json" };
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";

// Parse our static JSON file
const data = raw as DroneNewsData;

/** ─── DroneNewsCard (grid-cell preview) ─────────────────── */
export const DroneNewsCard: React.FC = () => {
  // Show up to 3 items in the small widget
  const preview: DroneNewsItem[] = data.slice(0, 3);

  return (
    <div className="space-y-2 p-2 overflow-hidden">
      {preview.map((item) => (
        <Link
          key={item.url}
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md px-1 py-1"
        >
          {item.image ? (
            <Image
              src={item.image}
              width={64}
              height={36}
              alt={item.title}
              unoptimized
              className="rounded-sm object-cover"
            />
          ) : (
            <div className="w-16 h-9 bg-gray-200 dark:bg-gray-700 rounded-sm" />
          )}
          <div className="flex-1">
            <p className="text-xs font-medium text-black dark:text-white line-clamp-2">
              {item.title}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              {format(new Date(item.publishedAt), "MMM d")}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
};

/** ─── DroneNewsModalBody (full list in modal) ───────────── */
export const DroneNewsModalBody: React.FC = () => (
  <article className="space-y-4 p-4">
    {data.map((item) => (
      <div key={item.url} className="flex items-start space-x-4">
        {item.image ? (
          <Image
            src={item.image}
            width={160}
            height={90}
            alt={item.title}
            unoptimized
            className="rounded-md object-cover"
          />
        ) : (
          <div className="w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
        )}
        <div className="flex-1">
          <Link
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-black dark:text-white hover:underline"
          >
            {item.title}
          </Link>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
            {format(new Date(item.publishedAt), "MMM d, yyyy")}
          </p>
        </div>
      </div>
    ))}
  </article>
);

export default DroneNewsCard;
