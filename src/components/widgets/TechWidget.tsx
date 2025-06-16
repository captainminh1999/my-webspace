"use client";
// src/components/widgets/TechWidget.tsx
import type { TechStory } from "@/types/tech";
import WidgetSection from "@/components/WidgetSection";
import { withWidgetData } from "./withWidgetData";

const TechCardBase: React.FC<{ data: TechStory[] }> = ({ data }) => {
  const stories = data.slice(0, 5);

  return (
    <article className="p-2 space-y-1 overflow-hidden">
      {stories.map((s) => (
        <a
          key={s.id}
          href={s.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <WidgetSection className="space-y-1 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
            <p
              className="text-xs font-medium text-black dark:text-white truncate"
              title={s.title}
            >
              {s.title}
            </p>
          </WidgetSection>
        </a>
      ))}
    </article>
  );
};

export const TechCard = withWidgetData<TechStory[]>("tech")(TechCardBase);

const TechModalBodyBase: React.FC<{ data: TechStory[] }> = ({ data: all }) => (
  <article className="p-4 space-y-2">
      {all.map((s) => (
        <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="block">
          <WidgetSection className="space-y-1 p-0 hover:bg-gray-100 dark:hover:bg-gray-700">
            <p className="text-sm font-medium text-black dark:text-white">{s.title}</p>
            <hr className="border-gray-200 dark:border-gray-700" />
          </WidgetSection>
        </a>
      ))}
    </article>
);

export const TechModalBody = withWidgetData<TechStory[]>("tech", {
  loadingHeight: "h-40",
  errorPadding: "p-4",
})(TechModalBodyBase);
