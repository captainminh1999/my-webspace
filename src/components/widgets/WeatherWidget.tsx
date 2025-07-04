// src/components/widgets/WeatherWidget.tsx
"use client";
import React, { useEffect, useState } from "react";
import WidgetSection from "@/components/WidgetSection";
import type { WeatherData } from "@/types/weather";
import { withWidgetData } from "./withWidgetData";
import { format } from "date-fns";
import Image from "next/image";


/* -------------------------------------------------------------
 * Small dashboard cell – shows icon + current temp + updated time
 * ------------------------------------------------------------- */
const WeatherCardBase: React.FC<{ data: WeatherData }> = ({ data }) => {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const currentTemp = data.current.temp;
  const iconUrl = `https://openweathermap.org/img/wn/${data.current.icon}.png`;

  const timeString = now.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Australia/Sydney',
  });

  return (
  <div className="flex items-center justify-center gap-6 py-2 mx-auto">
    <div className="flex items-center space-x-1">
      <Image src={iconUrl} alt="" width={50} height={50} sizes="50px" />
      <div className="flex flex-col leading-tight">
        <span className="text-lg font-semibold">{Math.round(currentTemp)}°C</span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          {timeString}
        </span>
      </div>
    </div>

    <span className="text-xl font-semibold">Sydney</span>
  </div>
);
};

export const WeatherCard = withWidgetData<WeatherData>("weather")(WeatherCardBase);

/* -------------------------------------------------------------
 * Modal body – next‑12‑hour strip + 7‑day table
 * ------------------------------------------------------------- */
const WeatherModalBodyBase: React.FC<{ data: WeatherData }> = ({ data }) => (
  <article className="space-y-6 p-4">
    {/* 12‑hour forecast */}
    <WidgetSection className="grid grid-cols-4 gap-6 overflow-x-auto pb-4">
      {data.hourly.slice(0, 12).map((h) => (
        <div key={h.dt} className="flex flex-col items-center">
          <p className="text-xs mb-1">
            {format(new Date(h.dt * 1000), "ha").toLowerCase()}
          </p>
          <Image src={`https://openweathermap.org/img/wn/${h.icon}.png`}
            alt=""
            width={45} height={45} sizes="45px" />
          <p className="text-xl font-bold mt-0">
            {Math.round(h.temp)}°
          </p>
        </div>
      ))}
    </WidgetSection>

    {/* 7‑day min/max table */}
    <WidgetSection className="p-0">
      <table className="w-full text-sm">
        <tbody>
          {data.daily.slice(0, 7).map((d) => (
            <tr key={d.dt} className="border-t border-gray-300 dark:border-gray-700">
              <td className="py-1 pr-2 whitespace-nowrap">
                {format(new Date(d.dt * 1000), "EEE d")}
            </td>
            <td className="py-1">
              <Image src={`https://openweathermap.org/img/wn/${d.icon}.png`}
                alt=""
                width={28} height={28} sizes="28px" />
            </td>
            <td className="py-1 text-right text-md font-semibold text-red-500">
              {Math.round(d.max)}°
            </td>
            <td className="py-1 text-right text-md font-semibold text-blue-500">
              {Math.round(d.min)}°
            </td>
          </tr>
          ))}
        </tbody>
      </table>
    </WidgetSection>
  </article>
);

export const WeatherModalBody = withWidgetData<WeatherData>("weather", {
  loadingHeight: "h-40",
  errorPadding: "p-4",
})(WeatherModalBodyBase);

export default WeatherCard;
