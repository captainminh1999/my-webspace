// src/components/widgets/TechWidget.tsx
import raw from "@/data/tech.json" assert { type: "json" };
import type { TechStory } from "@/types/tech";
import WidgetSection from "@/components/WidgetSection";

const stories = (raw as TechStory[]).slice(0, 5);

export function TechCard() {
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
            <p className="text-xs font-medium text-black dark:text-white">
              {s.title.length > 40 ? s.title.slice(0, 37) + "…" : s.title}
            </p>
          </WidgetSection>
        </a>
      ))}
    </article>
  );
}

export function TechModalBody() {
  const all = raw as TechStory[];
  return (
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
}
