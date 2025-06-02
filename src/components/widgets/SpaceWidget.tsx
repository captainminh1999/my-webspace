// src/components/widgets/SpaceWidget.tsx
import React from "react";
import Image from "next/image";

interface Apod {
  url: string;
  title: string;
  date: string;
  explanation: string;
  thumbnail_url?: string;
  hdurl?: string;
}

import raw from "@/data/space.json";
const space = raw as Apod;

/* Fallback to `url` if thumbnail is missing (image APODs). */
const thumb = space.thumbnail_url ?? space.url;
/**
 * Small preview for the dashboard grid – shows thumbnail with cover fit.
 */
export const SpaceCard: React.FC = () => (
  <div className="relative w-full h-full">
    <Image
      src={thumb}
      alt={space.title}
      fill
      sizes="(max-width: 768px) 100vw, 33vw"
      className="object-cover rounded"
      priority={false}
    />
  </div>
);

/**
 * Detailed content inside the modal.
 */
export const SpaceModalBody: React.FC = () => (
  <article className="p-4 space-y-4">
    <h3 className="text-lg font-semibold">{space.title}</h3>
    <Image
      src={(space).url}
      alt={space.title}
      width={800}
      height={450}
      className="w-full rounded"
    />
    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
      {space.explanation}
    </p>
    {(space).hdurl && (
      <a
        className="underline text-indigo-600"
        href={(space).hdurl}
        target="_blank"
        rel="noopener noreferrer"
      >
        View HD image
      </a>
    )}
    <p className="text-xs text-right italic text-gray-500 mt-4">
      Updated {space.date}
    </p>
  </article>
);
