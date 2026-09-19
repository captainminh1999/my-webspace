import Image from "next/image";
import type { PhotographyData } from "@/types/photography";
import { Plate } from "@/components/dashboard/Plate";
import { monthDay, toDate } from "@/lib/time";

export function PhotographyCard({ data }: { data: PhotographyData | null }) {
  if (!data) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return (
    <div className="relative aspect-[4/3] grow overflow-hidden rounded-thumb bg-surface-2 border border-rule">
      <Image
        src={data.thumbnail}
        alt={data.alt || "Photograph from Unsplash"}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        quality={70}
        className="object-cover"
      />
    </div>
  );
}

export function PhotographyFull({ data }: { data: PhotographyData | null }) {
  if (!data) return <p className="font-mono text-dense text-ink-3">No items</p>;
  const d = toDate(data.createdAt);
  return (
    <div>
      <Plate src={data.full} alt={data.alt || "Photograph from Unsplash"} width={data.width} height={data.height} sizes="(max-width: 960px) 100vw, 900px" quality={80} />
      {data.alt && <p className="font-display font-medium text-headline text-ink mt-4">{data.alt}</p>}
      <p className="font-mono text-source text-ink-3 mt-2">
        Photo by{" "}
        <a href={data.profile} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent underline underline-offset-3">
          {data.photographer}
        </a>{" "}
        on Unsplash{d ? ` · ${monthDay(d).toUpperCase()}` : ""}
      </p>
    </div>
  );
}
