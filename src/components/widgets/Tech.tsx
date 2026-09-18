import type { TechStory } from "@/types/tech";

type Story = TechStory & { score?: number };

function Rows({ stories, all }: { stories: Story[]; all: Story[] }) {
  const max = Math.max(1, ...all.map((s) => s.score ?? 0));
  return (
    <ol className="divide-y divide-rule">
      {stories.map((s, i) => (
        <li key={s.id} className="py-2 grid grid-cols-[1.5rem_1fr] gap-3 items-start">
          <span className="font-mono text-dense text-ink-3 pt-0.5">{String(i + 1).padStart(2, "0")}</span>
          <div className="min-w-0">
            <a
              href={s.url || `https://news.ycombinator.com/item?id=${s.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-item text-ink line-clamp-2 hover:text-accent transition-colors duration-120"
            >
              {s.title}
            </a>
            {typeof s.score === "number" && (
              <div className="mt-1 flex items-center gap-2">
                <span className="h-0.5 flex-1 bg-rule rounded-full overflow-hidden">
                  <span className="block h-full bg-ink-3 grow" style={{ width: `${(s.score / max) * 100}%`, animationDelay: `${i * 40}ms` }} />
                </span>
                <span className="font-mono text-source text-ink-3 w-12 text-right"><span aria-hidden>▲</span> {s.score}</span>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

export function TechCard({ data }: { data: Story[] }) {
  if (!data.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return <Rows stories={data.slice(0, 5)} all={data} />;
}

export function TechFull({ data }: { data: Story[] }) {
  if (!data.length) return <p className="font-mono text-dense text-ink-3">No items</p>;
  return (
    <div className="max-w-2xl">
      <Rows stories={data} all={data} />
      <p className="font-mono text-source text-ink-3 mt-6">Source: Hacker News front page · hacker-news.firebaseio.com</p>
    </div>
  );
}
