import Image from "next/image";
import type { YouTubeRecData, YouTubeRecItem } from "@/types/youtubeRecs";
import { relativeAge, toDate } from "@/lib/time";

const url = (v: YouTubeRecItem) => `https://youtu.be/${v.videoId}`;
const thumb = (v: YouTubeRecItem) => v.thumbnail.replace(/\/(hq|sd|maxres)default/, "/mqdefault");

function Cell({ v, now }: { v: YouTubeRecItem; now: Date }) {
  const d = toDate(v.publishedAt);
  return (
    <a href={url(v)} target="_blank" rel="noopener noreferrer" className="group/cell block p-3">
      <span className="relative block aspect-video rounded-thumb overflow-hidden bg-surface-2 border border-rule">
        <Image src={thumb(v)} alt="" fill sizes="(max-width: 768px) 100vw, 33vw" quality={65} className="object-cover" />
      </span>
      <span className="block mt-2 text-item text-ink line-clamp-2 group-hover/cell:text-accent transition-colors duration-120">{v.title}</span>
      <span className="block mt-1 font-mono text-source text-ink-3 uppercase truncate">
        {v.channelTitle}
        {d ? ` · ${relativeAge(d, now)}` : ""}
      </span>
    </a>
  );
}

function Row({ v, now }: { v: YouTubeRecItem; now: Date }) {
  const d = toDate(v.publishedAt);
  return (
    <li className="py-2.5">
      <a href={url(v)} target="_blank" rel="noopener noreferrer" className="flex gap-3 items-start">
        <span className="relative w-[7.5rem] aspect-video shrink-0 rounded-thumb overflow-hidden bg-surface-2 border border-rule">
          <Image src={thumb(v)} alt="" fill sizes="120px" quality={65} className="object-cover" />
        </span>
        <span className="min-w-0">
          <span className="block text-item text-ink line-clamp-2">{v.title}</span>
          <span className="block mt-1 font-mono text-source text-ink-3 uppercase truncate">
            {v.channelTitle}
            {d ? ` · ${relativeAge(d, now)}` : ""}
          </span>
        </span>
      </a>
    </li>
  );
}

/** Nine channels: a 3×3 hairline grid at md+, a thumbnail list below. */
export function YouTubeCard({ data, now }: { data: YouTubeRecData | null; now: Date }) {
  const items = (data?.items ?? []).filter((v) => v.videoId && v.videoId !== "null");
  if (!items.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return (
    <>
      <div className="hidden md:grid raster grid-cols-3">
        {items.slice(0, 9).map((v) => (
          <Cell key={v.videoId} v={v} now={now} />
        ))}
      </div>
      <ul className="md:hidden divide-y divide-rule">
        {items.slice(0, 9).map((v) => (
          <Row key={v.videoId} v={v} now={now} />
        ))}
      </ul>
    </>
  );
}

export function YouTubeFull({ data, now }: { data: YouTubeRecData | null; now: Date }) {
  const items = (data?.items ?? []).filter((v) => v.videoId && v.videoId !== "null");
  if (!items.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return (
    <div className="max-w-2xl">
      <ul className="divide-y divide-rule">
        {items.map((v) => (
          <Row key={v.videoId} v={v} now={now} />
        ))}
      </ul>
      <p className="font-mono text-source text-ink-3 mt-6">Source: YouTube Data API · latest upload from each followed channel</p>
    </div>
  );
}
