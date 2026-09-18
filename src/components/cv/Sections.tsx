// Renderers for every CV section, shared by /about-me (previews) and the
// eight section pages (full lists). Structure comes from hairline rules and
// the mono register, not from cards (docs/DESIGN-DIRECTION.md § About-me).
import Link from "next/link";
import type {
  AboutData,
  CompanyExperience,
  EducationEntry,
  HonorAwardEntry,
  LanguageEntry,
  LicenseCertificationEntry,
  ProjectEntry,
  RecommendationReceivedEntry,
  VolunteeringEntry,
} from "@/types";
import { normalizeSkillsArray } from "@/utils/cvData";
import { getDisplayCause } from "@/utils/formatters";
import { dateRange, isCurrent, splitBullets } from "@/utils/bullets";
import Clamp from "./Clamp";

/* ---------- primitives ---------- */

/** A text field rendered as a paragraph, or as a list when it holds bullets. */
export function Bullets({ text, className = "" }: { text?: string | null; className?: string }) {
  const parts = splitBullets(text);
  if (!parts.length) return null;
  if (parts.length === 1) return <p className={className}>{parts[0]}</p>;
  return (
    <ul className={`list-disc pl-5 marker:text-ink-3 space-y-1 ${className}`}>
      {parts.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
}

function ClampedBullets({ text, lines = 4 }: { text?: string | null; lines?: number }) {
  if (!text) return null;
  return (
    <Clamp chars={text.length} lines={lines} className="text-cv text-ink-2">
      <Bullets text={text} />
    </Clamp>
  );
}

export function AllLink({ count, noun, href }: { count: number; noun: string; href: string }) {
  return (
    <p className="mt-4">
      <Link href={href} className="stamp text-ink-2 hover:text-accent transition-colors duration-120">
        All {count} {noun} <span aria-hidden>→</span>
      </Link>
    </p>
  );
}

export function Empty({ what }: { what: string }) {
  return <p className="font-mono text-dense text-ink-3">No {what} on file.</p>;
}

/** A ledger row: mono date column left, content right; the current one gets the accent rule. */
function LedgerRow({ date, current = false, children }: { date: string; current?: boolean; children: React.ReactNode }) {
  return (
    <div className="grid md:grid-cols-[7.5rem_1fr] gap-x-6 gap-y-1 py-4 first:pt-0">
      <div className={`font-mono text-source text-ink-3 leading-5 md:pl-3 ${current ? "md:border-l-2 md:border-accent md:-ml-3" : ""}`}>
        {date}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/* ---------- sections ---------- */

export function About({ about }: { about: AboutData | null }) {
  if (!about) return <Empty what="summary" />;
  const intro = about.content ?? about.introduction;
  return (
    <div className="text-cv text-ink-2 space-y-4">
      {intro && <Bullets text={intro} className="text-ink" />}
      {about.topPrioritiesAndAchievements && about.topPrioritiesAndAchievements.length > 0 && (
        <ul className="space-y-3">
          {about.topPrioritiesAndAchievements.map((item, i) => (
            <li key={i} className="grid md:grid-cols-[7.5rem_1fr] gap-x-6">
              <span className="font-mono text-source text-ink-3 uppercase leading-5">{item.context}</span>
              <span>{item.description}</span>
            </li>
          ))}
        </ul>
      )}
      {about.additionalNotes && <Bullets text={about.additionalNotes} />}
    </div>
  );
}

export function Experience({ items, limit }: { items: CompanyExperience[]; limit?: number }) {
  if (!items.length) return <Empty what="experience" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="divide-y divide-rule">
      {shown.map((c, i) => (
        <div key={i} className="py-6 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 mb-3">
            <h3 className="text-body font-semibold text-ink">{c.companyName}</h3>
            <p className="font-mono text-source text-ink-3 uppercase">
              {[c.location, c.employmentType, c.totalDurationAtCompany].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="divide-y divide-rule">
            {(c.roles ?? []).map((r, j) => (
              <LedgerRow key={j} date={dateRange(r.startDate, r.endDate)} current={isCurrent(r.endDate)}>
                <p className="text-body text-ink">{r.title}</p>
                {(r.location || r.duration) && (
                  <p className="font-mono text-source text-ink-3 uppercase mt-0.5">{[r.location, r.duration].filter(Boolean).join(" · ")}</p>
                )}
                {r.responsibilities?.length > 0 && (
                  <div className="mt-2">
                    <ClampedBullets text={r.responsibilities.join("\n")} lines={4} />
                  </div>
                )}
                {r.skills?.length > 0 && (
                  <p className="font-mono text-source text-ink-3 mt-2">{normalizeSkillsArray(r.skills).join(" · ")}</p>
                )}
              </LedgerRow>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Education({ items, limit }: { items: EducationEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="education" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="divide-y divide-rule">
      {shown.map((e, i) => (
        <LedgerRow key={i} date={dateRange(e.startDate, e.endDate)}>
          <p className="text-body font-semibold text-ink">{e.schoolName}</p>
          {e.degreeName && <p className="text-body text-ink-2">{e.degreeName}</p>}
          {e.notes && (
            <div className="mt-2">
              <ClampedBullets text={e.notes} lines={3} />
            </div>
          )}
          {e.activities && (
            <p className="font-mono text-source text-ink-3 mt-2">
              <span className="uppercase">Activities · </span>
              {e.activities}
            </p>
          )}
        </LedgerRow>
      ))}
    </div>
  );
}

export function Licences({ items, limit }: { items: LicenseCertificationEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="licences" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="raster">
      <div className="hidden md:grid grid-cols-[1fr_12rem_8rem] gap-4 px-3 py-2 font-mono text-source text-ink-3 uppercase !bg-surface-2">
        <span>Credential</span>
        <span>Issuer</span>
        <span>Issued</span>
      </div>
      {shown.map((l, i) => (
        <div key={i} className="grid md:grid-cols-[1fr_12rem_8rem] gap-x-4 gap-y-1 px-3 py-3">
          <div className="min-w-0">
            <p className="text-item text-ink">
              {l.url ? (
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors duration-120">
                  {l.name} <span aria-hidden>↗</span>
                </a>
              ) : (
                l.name
              )}
            </p>
            {l.licenseNumber && <p className="font-mono text-source text-ink-3 mt-0.5">ID {l.licenseNumber}</p>}
          </div>
          <p className="text-dense text-ink-2">{l.authority}</p>
          <p className="font-mono text-source text-ink-3 uppercase">{[l.startedOn, l.finishedOn].filter(Boolean).join(" — ")}</p>
        </div>
      ))}
    </div>
  );
}

export function Projects({ items, limit }: { items: ProjectEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="projects" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="divide-y divide-rule">
      {shown.map((p, i) => (
        <LedgerRow key={i} date={dateRange(p.startedOn, p.finishedOn) || "—"}>
          <p className="text-body font-semibold text-ink">{p.title}</p>
          {p.description && (
            <div className="mt-1">
              <ClampedBullets text={p.description} lines={3} />
            </div>
          )}
          {p.url && (
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="stamp text-ink-3 hover:text-accent transition-colors duration-120 inline-block mt-2">
              Project <span aria-hidden>↗</span>
            </a>
          )}
        </LedgerRow>
      ))}
    </div>
  );
}

export function Volunteering({ items, limit }: { items: VolunteeringEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="volunteering" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="divide-y divide-rule">
      {shown.map((v, i) => (
        <LedgerRow key={i} date={dateRange(v.startedOn, v.finishedOn) || "—"}>
          <p className="text-body font-semibold text-ink">{v.role}</p>
          <p className="text-body text-ink-2">
            {v.companyName}
            {v.cause && <span className="font-mono text-source text-ink-3 uppercase"> · {getDisplayCause(v.cause)}</span>}
          </p>
          {v.description && (
            <div className="mt-1">
              <ClampedBullets text={v.description} lines={3} />
            </div>
          )}
        </LedgerRow>
      ))}
    </div>
  );
}

export function Skills({ skills }: { skills: unknown }) {
  const list = normalizeSkillsArray(skills).sort((a, b) => a.localeCompare(b));
  if (!list.length) return <Empty what="skills" />;
  return (
    <ul className="columns-2 lg:columns-3 gap-6 font-mono text-dense text-ink-2">
      {list.map((s) => (
        <li key={s} className="py-0.5 break-inside-avoid">
          {s}
        </li>
      ))}
    </ul>
  );
}

export function Recommendations({ items, limit }: { items: RecommendationReceivedEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="recommendations" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="space-y-6">
      {shown.map((r, i) => (
        <figure key={i} className="border-l-2 border-rule-strong pl-5">
          <blockquote className="text-cv text-ink">
            <Clamp chars={r.text?.length ?? 0} lines={5}>
              <Bullets text={r.text} />
            </Clamp>
          </blockquote>
          <figcaption className="font-mono text-source text-ink-3 mt-3 uppercase">
            {r.firstName} {r.lastName} · {r.jobTitle}, {r.company}
            {r.creationDate ? ` · ${r.creationDate}` : ""}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Honors({ items, limit }: { items: HonorAwardEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="honours" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="raster">
      {shown.map((h, i) => (
        <div key={i} className="grid md:grid-cols-[7.5rem_1fr] gap-x-4 gap-y-1 px-3 py-3">
          <p className="font-mono text-source text-ink-3 uppercase">{h.issuedOn}</p>
          <div>
            <p className="text-item text-ink">{h.title}</p>
            {h.description && <p className="text-dense text-ink-2 mt-1">{h.description}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function Languages({ items, limit }: { items: LanguageEntry[]; limit?: number }) {
  if (!items.length) return <Empty what="languages" />;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <div className="raster">
      {shown.map((l, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-3 py-2.5">
          <p className="text-item text-ink">{l.name}</p>
          <p className="font-mono text-source text-ink-3 uppercase">{l.proficiency}</p>
        </div>
      ))}
    </div>
  );
}
