import Link from "next/link";
import type { ProfileData } from "@/types";

/** The one card that is a link into the CV, not a dialog: name, headline, the summary, and the way in. */
export function ProfileCard({ data }: { data: ProfileData | null }) {
  const name = data ? [data.firstName, data.maidenName ? `(${data.maidenName})` : null, data.lastName].filter(Boolean).join(" ") : "Minh Nguyen";
  const facts = [data?.geoLocation, data?.headline?.split(" @ ")[1] ? `@ ${data.headline.split(" @ ")[1]}` : null].filter(Boolean) as string[];
  const summary = data?.summary?.replace(/\s+/g, " ").trim();
  return (
    <div className="flex flex-col grow gap-5">
      <div>
        <Link href="/about-me" className="font-display font-medium text-h2 text-ink leading-tight hover:text-accent transition-colors duration-120">
          {name}
        </Link>
        {data?.headline && <p className="mt-2 text-item text-ink-2">{data.headline.split(" @ ")[0]}</p>}
        {facts.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 font-mono text-source text-ink-3 uppercase">
            {facts.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </div>
      {summary && <p className="text-item text-ink-2 line-clamp-4 md:line-clamp-6">{summary}</p>}
      <Link href="/about-me" className="stamp text-ink-2 hover:text-accent transition-colors duration-120 mt-auto self-start">
        Read the CV <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
