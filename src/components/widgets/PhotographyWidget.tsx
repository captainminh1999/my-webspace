// src/components/widgets/PhotographyWidget.tsx
import React from "react";
import type { PhotographyData } from "@/types/photography";
import raw from "../../../data/photography.json" assert { type: "json" };
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";

// Cast imported JSON to our type
const photo = raw as PhotographyData;

/** ─────────────── Photo Card (grid cell) ────────────────── */
export const PhotographyCard: React.FC = () => {
  // We show the thumbnail, plus a small credit line underneath
  return (
    <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
      <Image
        src={photo.thumbnail}
        alt={photo.alt || "Unsplash photo"}
        width={300}
        height={300}
        className="object-cover rounded-lg shadow-sm"
        unoptimized
      />
      <p className="text-[10px] text-gray-600 dark:text-gray-400">
        Photo by{" "}
        <Link
          href={photo.profile}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:underline"
        >
          {photo.photographer}
        </Link>{" "}
        on Unsplash
      </p>
    </div>
  );
};

/** ──────────── Photography Modal Body ───────────────────── */
export const PhotographyModalBody: React.FC = () => {
  return (
    <article className="px-4 py-6 space-y-4">
      <div className="w-full">
        <Image
          src={photo.full}
          alt={photo.alt || "Unsplash photo"}
          width={1000}
          height={600}
          className="w-full h-auto rounded-xl shadow-lg"
          unoptimized
        />
      </div>
      <div className="prose prose-lg dark:prose-invert">
        <h2 className="text-xl font-semibold">{photo.alt || "Untitled Photo"}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          By{" "}
          <Link
            href={photo.profile}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:underline"
          >
            {photo.photographer}
          </Link>{" "}
          on Unsplash •{" "}
          {format(new Date(photo.createdAt), "MMMM d, yyyy")}
        </p>
        <p className="mt-4 text-base text-gray-700 dark:text-gray-200">
          {/* You could add a placeholder description here, or leave it blank if Unsplash alt text is used */}
          {photo.alt
            ? `“${photo.alt}."`
            : "A stunning photograph from Unsplash."}
        </p>
      </div>
    </article>
  );
};

export default PhotographyCard;
