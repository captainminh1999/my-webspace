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

import raw from "@/data/space.json" assert { type: "json" };
import marsRaw from "@/data/marsPhoto.json" assert { type: "json" };
import epicRaw from "@/data/epic.json" assert { type: "json" };
import weatherRaw from "@/data/marsWeather.json" assert { type: "json" };
import type { MarsPhotoData, EpicData, MarsWeatherData } from "@/types/spaceExtra";

const space = raw as Apod;
const mars = marsRaw as MarsPhotoData;
const epic = epicRaw as EpicData;
const marsWeather = weatherRaw as MarsWeatherData;

/* Fallback to `url` if thumbnail is missing (image APODs). */
const thumb = space.thumbnail_url ?? space.url;
/**
 * Small preview for the dashboard grid – shows thumbnail with cover fit.
 */
export const SpaceCard: React.FC = () => (
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
);

/**
 * Detailed content inside the modal.
 */
export const SpaceModalBody: React.FC = () => {
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
