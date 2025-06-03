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
import newsRaw from "@/data/nasaNews.json";
import marsRaw from "@/data/marsPhoto.json";
import epicRaw from "@/data/epic.json";
import weatherRaw from "@/data/marsWeather.json";
import type { NasaNewsItem, MarsPhotoData, EpicData, MarsWeatherData } from "@/types/spaceExtra";

const space = raw as Apod;
const news = newsRaw as NasaNewsItem[];
const mars = marsRaw as MarsPhotoData;
const epic = epicRaw as EpicData;
const marsWeather = weatherRaw as MarsWeatherData;

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
export const SpaceModalBody: React.FC = () => {
  const [year, month, day] = epic.date.split(" ")[0].split("-");
  const epicUrl = `https://api.nasa.gov/EPIC/archive/natural/${year}/${month}/${day}/png/${epic.image}.png?api_key=${process.env.NASA_KEY ?? ''}`;

  return (
    <article className="p-4 space-y-[50px]">
      {/* Astronomy Picture of the Day */}
      <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
        <h3 className="text-lg font-semibold">{space.title}</h3>
        <Image
          src={space.url}
          alt={space.title}
          width={800}
          height={450}
          className="w-full rounded"
        />
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
          {space.explanation}
        </p>
        {space.hdurl && (
          <a
            className="underline text-indigo-600"
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
      </div>

      {/* NASA Breaking News */}
      <div className="space-y-1 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
        <h4 className="font-semibold">NASA Breaking News</h4>
        <ul className="list-disc pl-5 text-sm space-y-1">
          {news.slice(0, 5).map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener noreferrer" className="underline">
                {n.title}
              </a>
            </li>
          ))}
        </ul>
      </div>

      {/* Mars Rover Photo */}
      {mars.photos.length > 0 && (
        <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
          <h4 className="font-semibold">Mars Rover Photo</h4>
          {mars.photos.map((p) => (
            <div key={p.id} className="space-y-1">
              <Image src={p.img_src} alt={p.camera} width={800} height={450} className="w-full rounded" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {p.rover} – {p.camera}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* EPIC Earth image */}
      <div className="space-y-2 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
        <h4 className="font-semibold">Earth from EPIC</h4>
        <Image src={epicUrl} alt="EPIC Earth" width={512} height={512} className="w-full rounded" />
        <p className="text-sm text-gray-700 dark:text-gray-300">{epic.caption}</p>
        <p className="text-xs text-right italic text-gray-500">{epic.date.split(" ")[0]}</p>
      </div>

      {/* InSight Mars Weather */}
      <div className="space-y-1 p-4 rounded-lg bg-gray-50 dark:bg-gray-700">
        <h4 className="font-semibold">Mars Weather</h4>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Sol {marsWeather.latest.sol}: {marsWeather.latest.AT}°C, wind {marsWeather.latest.HWS} m/s, pressure {marsWeather.latest.PRE} Pa
        </p>
      </div>
    </article>
  );
};
