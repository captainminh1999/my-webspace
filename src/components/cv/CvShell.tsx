import Link from "next/link";
import type { ProfileData } from "@/types";
import Masthead from "@/components/dashboard/Masthead";
import { parseWebsiteString } from "@/utils/formatters";

export const SECTIONS = [
  { id: "about", folio: "01", title: "About", href: null },
  { id: "experience", folio: "02", title: "Experience", href: "/about-me/experience" },
  { id: "education", folio: "03", title: "Education", href: "/about-me/education" },
  { id: "licenses", folio: "04", title: "Licences", href: "/about-me/licenses" },
  { id: "projects", folio: "05", title: "Projects", href: "/about-me/projects" },
  { id: "volunteering", folio: "06", title: "Volunteering", href: "/about-me/volunteering" },
  { id: "skills", folio: "07", title: "Skills", href: null },
  { id: "honors", folio: "08", title: "Honours", href: "/about-me/honors-awards" },
  { id: "languages", folio: "09", title: "Languages", href: "/about-me/languages" },
  { id: "recommendations", folio: "10", title: "Recommendations", href: "/about-me/recommendations" },
] as const;
export type SectionId = (typeof SECTIONS)[number]["id"];

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

/** Sticky left rail (lg) / horizontal index (below lg) listing the sections. */
export function Rail({ current }: { current?: SectionId }) {
  return (
    <nav aria-label="CV sections" className="lg:sticky lg:top-6 lg:self-start">
      <ol className="flex lg:flex-col gap-x-5 gap-y-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 -mx-4 px-4 lg:mx-0 lg:px-0">
        {SECTIONS.map((s) => {
          const active = s.id === current;
          const href = current ? (s.href ?? `/about-me#${s.id}`) : `#${s.id}`;
          return (
            <li key={s.id} className="shrink-0">
              <Link
                href={href}
                className={`stamp whitespace-nowrap transition-colors duration-120 lg:border-l-2 lg:pl-3 ${active ? "text-ink lg:border-accent" : "text-ink-3 hover:text-ink lg:border-transparent"}`}
              >
                <span className="text-ink-3">{s.folio}</span> {s.title}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function Section({ id, folio, title, children }: { id: string; folio: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="cv-section scroll-mt-6 border-t border-rule pt-8 pb-12 first:border-t-0 first:pt-0">
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
          <div className="mb-8 lg:mb-0">{rail}</div>
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
          ← Index
        </Link>{" "}
        · Section {String(index).padStart(2, "0")} of {SECTIONS.length}
      </p>
      <div className="mt-6">{children}</div>
    </CvFrame>
  );
}
