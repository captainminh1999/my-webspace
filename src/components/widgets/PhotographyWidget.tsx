"use client";
// src/components/widgets/PhotographyWidget.tsx
import React from "react";
import type { PhotographyData } from "@/types/photography";
import { withWidgetData } from "./withWidgetData";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";


/** ─────────────── Photo Card (grid cell) ────────────────── */
const PhotographyCardBase: React.FC<{ data: PhotographyData }> = ({ data: photo }) => (
  // We show the thumbnail, plus a small credit line underneath
  <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
    <Image
      src={photo.thumbnail}
      alt={photo.alt || "Unsplash photo"}
      width={300}
      height={300}
      sizes="300px"
      className="object-cover rounded-lg shadow-sm"
    />
    <p className="text-[10px] text-gray-600 dark:text-gray-400">
      Photo by{" "}
      <Link
        href={photo.profile}
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold hover:underline text-black dark:text-white"
      >
        {photo.photographer}
      </Link>{" "}
      on Unsplash
    </p>
  </div>
);

export const PhotographyCard = withWidgetData<PhotographyData>("camera")(PhotographyCardBase);
    <div className="h-full flex flex-col items-center justify-center p-2 space-y-2">
      <Image
        src={photo.thumbnail}
        alt={photo.alt || "Unsplash photo"}
        width={300}
        height={300}
        sizes="300px"
        className="object-cover rounded-lg shadow-sm"
      />
      <p className="text-[10px] text-gray-600 dark:text-gray-400">
        Photo by{" "}
        <Link
          href={photo.profile}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold hover:underline text-black dark:text-white"
        >
          {photo.photographer}
        </Link>{" "}
        on Unsplash
      </p>
    </div>
  );
};

/** ──────────── Photography Modal Body ───────────────────── */
const PhotographyModalBodyBase: React.FC<{ data: PhotographyData }> = ({ data: photo }) => (
  <article className="px-4 py-6 space-y-4">
      <div className="w-full">
        <Image
          src={photo.full}
          alt={photo.alt || "Unsplash photo"}
          width={1000}
          height={600}
          sizes="(max-width: 1000px) 100vw, 1000px"
          className="w-full h-auto rounded-xl shadow-lg"
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
            className="font-medium hover:underline text-black dark:text-white"
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

export const PhotographyModalBody = withWidgetData<PhotographyData>("camera", {
  loadingHeight: "h-40",
  errorPadding: "p-4",
})(PhotographyModalBodyBase);

export default PhotographyCard;
