import Image from "next/image";
import type { SpaceData } from "@/types/dashboard";
import { monthDay, toDate } from "@/lib/time";

function apodImage(s: SpaceData["space"]) {
  if (!s) return null;
  if (s.media_type === "video" || s.media_type === "other") return s.thumbnail_url ?? null;
  return s.url ?? null;
}

/** The daily lead photograph: NASA's picture of the day, with Earth from EPIC in the footer. */
export function SpaceCard({ data }: { data: SpaceData | null }) {
  const apod = data?.space ?? null;
  const epic = data?.epic ?? null;
  const lead = apodImage(apod) ?? epic?.url ?? null;
  if (!lead) {
    return <p className="font-mono text-dense text-ink-3">No items</p>;
  }
  const epicDate = toDate(epic?.date?.replace(" ", "T") ?? null);
  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-video overflow-hidden rounded-thumb bg-surface-2 border border-rule">
        <Image
          src={lead}
          alt={apod?.title ?? "Earth from NASA's EPIC camera"}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 60vw"
          quality={70}
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <h3 className="font-display font-medium text-headline text-ink">{apod?.title ?? "Earth"}</h3>
        {apod?.explanation && <p className="mt-1 text-item text-ink-2 line-clamp-3">{apod.explanation}</p>}
      </div>
      {epic?.url && lead !== epic.url && (
        <div className="flex items-center gap-3 pt-3 border-t border-rule">
          <div className="size-12 shrink-0 rounded-thumb overflow-hidden bg-surface-2 border border-rule">
            <Image src={epic.url} alt="" width={48} height={48} quality={60} className="size-full object-cover" />
          </div>
          <div className="font-mono text-source text-ink-3 leading-4">
            <div className="text-ink-2">EARTH · EPIC / DSCOVR</div>
            <div>{epicDate ? monthDay(epicDate).toUpperCase() : ""}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SpaceFull({ data }: { data: SpaceData | null }) {
  const apod = data?.space ?? null;
  const epic = data?.epic ?? null;
  const lead = apodImage(apod);
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      {apod && (
        <section>
          <p className="stamp text-ink-3">Astronomy picture of the day · {apod.date}</p>
          <h3 className="font-display font-medium text-h2 text-ink mt-1">{apod.title}</h3>
          {lead && (
            <div className="relative aspect-video overflow-hidden rounded-thumb bg-surface-2 border border-rule mt-4">
              <Image src={lead} alt={apod.title} fill sizes="(max-width: 960px) 100vw, 900px" quality={75} className="object-contain" />
            </div>
          )}
          <p className="text-body text-ink-2 mt-4 whitespace-pre-line">{apod.explanation}</p>
          <p className="font-mono text-source text-ink-3 mt-3">
            {apod.copyright ? `© ${apod.copyright.trim()} · ` : ""}
            {apod.hdurl && (
              <a href={apod.hdurl} target="_blank" rel="noopener noreferrer" className="hover:text-accent underline underline-offset-3">
                HD image <span aria-hidden>↗</span>
              </a>
            )}
          </p>
        </section>
      )}
      {epic?.url && (
        <section>
          <p className="stamp text-ink-3">Earth · EPIC on DSCOVR · {epic.date.split(" ")[0]}</p>
          <div className="relative w-full max-w-md aspect-square overflow-hidden rounded-thumb bg-surface-2 border border-rule mt-3">
            <Image src={epic.url} alt="Earth from the DSCOVR spacecraft" fill sizes="(max-width: 640px) 100vw, 448px" quality={70} className="object-cover" />
          </div>
          <p className="text-item text-ink-2 mt-3">{epic.caption}</p>
        </section>
      )}
      {!apod && !epic && <p className="font-mono text-dense text-ink-3">No items</p>}
      <p className="font-mono text-source text-ink-3">Source: api.nasa.gov · epic.gsfc.nasa.gov</p>
    </div>
  );
}
