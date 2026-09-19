import Link from "next/link";
import type { ProfileData } from "@/types";
import Masthead from "@/components/dashboard/Masthead";
import { parseWebsiteString } from "@/utils/formatters";
import Rail from "./Rail";
import { SECTIONS, type SectionId } from "./sectionList";

export { Rail, SECTIONS };
export type { SectionId };

export function fullName(p: ProfileData | null) {
  if (!p) return "Minh Nguyen";
  return [p.firstName, p.maidenName ? `(${p.maidenName})` : null, p.lastName].filter(Boolean).join(" ");
}

/** The name/headline/links block at the top of the CV, left-aligned to the content column. */
export function ProfileHeader({ profile, now }: { profile: ProfileData | null; now: Date }) {
  const sites = profile?.websites
    ? (Array.isArray(profile.websites) ? profile.websites : [profile.websites]).map(parseWebsiteString).filter((s): s is NonNullable<typeof s> => !!s)
    : [];
  const facts = [
    profile?.geoLocation,
    `Updated ${now.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "Australia/Sydney" })}`,
    `${SECTIONS.length} sections`,
  ].filter(Boolean) as string[];
  return (
    <div className="mb-10">
      <h1 className="font-display font-medium text-ink text-[2.75rem] leading-[1.05] md:text-[3.5rem]">{fullName(profile)}</h1>
      {profile?.headline && <p className="text-[1.125rem] leading-7 text-ink-2 mt-3">{profile.headline}</p>}
      <p className="stamp text-ink-3 mt-3">{facts.join(" · ")}</p>
      {(sites.length > 0 || profile?.twitterHandles) && (
        <p className="font-mono text-dense text-ink-2 mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {sites.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3 decoration-rule-strong hover:text-accent hover:decoration-accent transition-colors duration-120">
              {s.label}
            </a>
          ))}
          {profile?.twitterHandles && (
            <a href={`https://twitter.com/${profile.twitterHandles.replace("@", "")}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-3 decoration-rule-strong hover:text-accent transition-colors duration-120">
              {profile.twitterHandles}
            </a>
          )}
        </p>
      )}
    </div>
  );
}

export function Section({ id, folio, title, children }: { id: string; folio: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="cv-section scroll-mt-16 lg:scroll-mt-6 border-t border-rule pt-8 pb-12 first:border-t-0 first:pt-0">
      <p className="running-head stamp text-ink-3">
        {folio} · {title}
      </p>
      <h2 className="font-display font-medium text-h2 text-ink mt-1 mb-6">{title}</h2>
      {children}
    </section>
  );
}

/** Page frame shared by /about-me and its section pages. */
export function CvFrame({ now, title, rail, children }: { now: Date; title?: string; rail: React.ReactNode; children: React.ReactNode }) {
  return (
    <>
      <Masthead now={now} variant="cv" title={title} />
      <main className="mx-auto max-w-page px-4 md:px-6 py-8 md:py-10">
        <div className="lg:grid lg:grid-cols-[15rem_minmax(0,45rem)] lg:gap-16">
          {/* Below lg the index rides along under the top edge; at lg the nav inside is the sticky one. */}
          <div className="sticky top-0 z-10 -mx-4 px-4 md:-mx-6 md:px-6 py-2 mb-8 bg-bg border-b border-rule lg:static lg:z-auto lg:m-0 lg:p-0 lg:border-0">{rail}</div>
          <div className="min-w-0 max-w-measure">{children}</div>
        </div>
      </main>
    </>
  );
}

/** Shell for a section page: rail collapsed to an index link, a folio line, the h1. */
export default function SectionPageLayout({ id, now, children }: { id: SectionId; now: Date; children: React.ReactNode }) {
  const s = SECTIONS.find((x) => x.id === id)!;
  const index = SECTIONS.findIndex((x) => x.id === id) + 1;
  return (
    <CvFrame now={now} title={s.title} rail={<Rail current={id} />}>
      <p className="stamp text-ink-3">
        <Link href="/about-me" className="hover:text-accent transition-colors duration-120">
          <span aria-hidden>←</span> Index
        </Link>{" "}
        · Section {String(index).padStart(2, "0")} of {SECTIONS.length}
      </p>
      <div className="mt-6">{children}</div>
    </CvFrame>
  );
}
