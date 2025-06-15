"use client";
// src/components/widgets/SpaceWidget.tsx
import React from "react";
import Image from "next/image";
import WidgetSection from "@/components/WidgetSection";

interface Apod {
  url: string;
  title: string;
  date: string;
  explanation: string;
  thumbnail_url?: string;
  hdurl?: string;
}

import type { MarsPhotoData, EpicData, MarsWeatherData } from "@/types/spaceExtra";
import { useWidgetData } from "@/lib/widgetData";

interface SpaceWidgetData {
  space: Apod;
  mars: MarsPhotoData;
  epic: EpicData;
  marsWeather: MarsWeatherData;
}

/**
 * Small preview for the dashboard grid – shows thumbnail with cover fit.
 */
export const SpaceCard: React.FC = () => {
  const data = useWidgetData<SpaceWidgetData>("space");
  if (!data) return <div className="p-2 text-sm">Loading…</div>;
  const { space } = data;
  const thumb = space.thumbnail_url ?? space.url;
  return (
  <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
    <div className="relative w-full aspect-video">
      <Image
        src={thumb}
        alt={space.title}
        fill
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover rounded"
        priority={false}
        unoptimized
      />
    </div>
    <p className="text-[10px] text-gray-600 dark:text-gray-400 text-center line-clamp-2">
      {space.title}
    </p>
  </div>
  );
};

/**
 * Detailed content inside the modal.
 */
export const SpaceModalBody: React.FC = () => {
  const data = useWidgetData<SpaceWidgetData>("space");
  if (!data) return <div className="p-4 text-sm">Loading…</div>;
  const { space, mars, epic, marsWeather } = data;
  const epicUrl = epic.url;

  return (
    <article className="p-4 space-y-[10px]">
      {/* Astronomy Picture of the Day */}
      <WidgetSection className="space-y-2">
        <h3 className="text-lg font-semibold">{space.title}</h3>
        <Image
          src={space.url}
          alt={space.title}
          width={800}
          height={450}
          className="w-full rounded"
          unoptimized
        />
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {space.explanation}
        </p>
        {space.hdurl && (
          <a
            className="underline text-black dark:text-white"
            href={space.hdurl}
            target="_blank"
            rel="noopener noreferrer"
          >
            View HD image
          </a>
        )}
        <p className="text-xs text-right italic text-gray-500 mt-2">
          Updated {space.date}
        </p>
      </WidgetSection>


      {/* Mars Rover Photo */}
      {mars.photos.length > 0 && (
        <WidgetSection className="space-y-2">
          <h4 className="font-semibold">Mars Rover Photo</h4>
          {mars.photos.map((p) => (
            <div key={p.id} className="space-y-1">
              <Image src={p.img_src} alt={p.camera} width={800} height={450} className="w-full rounded" unoptimized />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {p.rover} – {p.camera}
              </p>
            </div>
          ))}
        </WidgetSection>
      )}

      {/* EPIC Earth image */}
      <WidgetSection className="space-y-2">
        <h4 className="font-semibold">Earth from EPIC</h4>
        <Image src={epicUrl} alt="EPIC Earth" width={512} height={512} className="w-full rounded" unoptimized />
        <p className="text-sm text-gray-700 dark:text-gray-300">{epic.caption}</p>
        <p className="text-xs text-right italic text-gray-500">{epic.date.split(" ")[0]}</p>
      </WidgetSection>

      {/* InSight Mars Weather */}
      <WidgetSection className="space-y-1">
        <h4 className="font-semibold">Mars Weather</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Sol {marsWeather.latest.sol}: {marsWeather.latest.AT}°C, wind {marsWeather.latest.HWS} m/s, pressure {marsWeather.latest.PRE} Pa
        </p>
      </WidgetSection>
    </article>
  );
};
