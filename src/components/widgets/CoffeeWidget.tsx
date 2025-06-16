"use client";
import React from "react";
import type { CoffeeData, CoffeeArticle } from "@/types/coffee";
import { withWidgetData } from "./withWidgetData";
import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import WidgetSection from "@/components/WidgetSection";

const CoffeeCardBase: React.FC<{ data: CoffeeData }> = ({ data }) => {
  const preview: CoffeeArticle[] = data.slice(0, 3);

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
              sizes="64px"
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

export const CoffeeCard = withWidgetData<CoffeeData>("coffee")(CoffeeCardBase);

const CoffeeModalBodyBase: React.FC<{ data: CoffeeData }> = ({ data }) => (
  <article className="space-y-4 p-4">
    {data.map((item) => (
      <Link
        key={item.url}
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <WidgetSection className="flex items-start space-x-4 hover:bg-gray-100 dark:hover:bg-gray-700">
          {item.image ? (
            <Image
              src={item.image}
              width={160}
              height={90}
              alt={item.title}
              sizes="160px"
              className="rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="w-40 h-24 bg-gray-200 dark:bg-gray-700 rounded-md" />
          )}
          <div className="flex-1">
            <p className="text-base font-semibold text-black dark:text-white">{item.title}</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
              {format(new Date(item.publishedAt), "MMM d, yyyy")}
            </p>
          </div>
        </WidgetSection>
      </Link>
    ))}
  </article>
);

export const CoffeeModalBody = withWidgetData<CoffeeData>("coffee", {
  loadingHeight: "h-40",
  errorPadding: "p-4",
})(CoffeeModalBodyBase);

export default CoffeeCard;
