// src/components/widgets/TechWidget.tsx
import raw from "@/data/tech.json" assert { type: "json" };
import type { TechStory } from "@/types/tech";
import WidgetSection from "@/components/WidgetSection";

const stories = (raw as TechStory[]).slice(0, 5);

export function TechCard() {
  return (
    <ul className="p-2 space-y-1 overflow-hidden">
      {stories.map((s) => (
        <li key={s.id} className="text-xs">
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            • {s.title.length > 40 ? s.title.slice(0, 37) + "…" : s.title}
          </a>
        </li>
      ))}
    </ul>
  );
}

export function TechModalBody() {
  const all = raw as TechStory[];
  return (
    <article className="p-4 space-y-2">
      {all.map((s) => (
        <WidgetSection key={s.id} className="space-y-1 p-0">
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:underline">
            {s.title}
          </a>
          <hr className="border-gray-200 dark:border-gray-700" />
        </WidgetSection>
      ))}
    </article>
  );
}
