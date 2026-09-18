import Link from "next/link";
import type { ProfileData } from "@/types";

/** The one card that is a link, not a dialog: it points at the CV. */
export function ProfileCard({ data }: { data: ProfileData | null }) {
  const name = data ? [data.firstName, data.maidenName ? `(${data.maidenName})` : null, data.lastName].filter(Boolean).join(" ") : "Minh Nguyen";
  const facts = [data?.geoLocation, data?.headline?.split(" @ ")[1] ? `@ ${data.headline.split(" @ ")[1]}` : null].filter(Boolean) as string[];
  return (
    <Link href="/about-me" className="flex flex-col h-full justify-between gap-6 group/link">
      <div>
        <p className="font-display font-medium text-h2 text-ink leading-tight">{name}</p>
        {data?.headline && <p className="mt-2 text-item text-ink-2">{data.headline.split(" @ ")[0]}</p>}
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 font-mono text-source text-ink-3 uppercase">
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </div>
      <span className="stamp text-ink-2 group-hover/link:text-accent transition-colors duration-120">Read the CV <span aria-hidden>→</span></span>
    </Link>
  );
}
