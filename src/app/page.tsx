// src/app/page.tsx — the Daily Dash. A server component end to end: data is
// read once here and passed down; the only client code on the route is the
// theme toggle, the once-a-minute freshness ticker and the dialog controller.
import { getDashboardData } from "@/lib/dashboard";
import { allFreshness } from "@/lib/freshness";
import Masthead from "@/components/dashboard/Masthead";
import { Card, WidgetDialog } from "@/components/dashboard/Card";
import DialogController from "@/components/dashboard/DialogController";
import { WeatherCard, WeatherFull } from "@/components/widgets/Weather";
import { SpaceCard, SpaceFull } from "@/components/widgets/Space";
import { TechCard, TechFull } from "@/components/widgets/Tech";
import { PhotographyCard, PhotographyFull } from "@/components/widgets/Photography";
import { ProfileCard } from "@/components/widgets/Profile";
import { NewsList } from "@/components/widgets/NewsList";
import { GamesCard, GamesFull } from "@/components/widgets/Games";
import { YouTubeCard, YouTubeFull } from "@/components/widgets/YouTube";

export const revalidate = 60;

const NO_ITEMS = <p className="font-mono text-dense text-ink-3">No items</p>;

export default async function Page() {
  const data = await getDashboardData();
  const now = new Date(data.renderedAt);
  const f = allFreshness(data, now);

  // DOM order is the phone order (text first, so the LCP is text); md+ reorders with `order-*`.
  const cards = [
    {
      id: "weather", folio: "01", title: "WEATHER", span: "md:col-span-3 lg:col-span-4 md:order-1", stamp: "dot",
      footer: data.weather ? <span>Source: OpenWeather</span> : null,
      card: data.weather ? <WeatherCard data={data.weather} /> : NO_ITEMS,
      full: data.weather ? <WeatherFull data={data.weather} /> : NO_ITEMS,
    },
    {
      id: "tech", folio: "03", title: "HACKER NEWS", span: "md:col-span-3 lg:col-span-4 md:order-3",
      footer: <span>Source: news.ycombinator.com</span>,
      card: <TechCard data={data.tech} />, full: <TechFull data={data.tech} />,
    },
    {
      id: "space", folio: "02", title: "SPACE", span: "md:col-span-3 lg:col-span-8 md:order-2", width: "wide",
      footer: <span>Source: NASA APOD · EPIC</span>,
      card: <SpaceCard data={data.space} />, full: <SpaceFull data={data.space} />,
    },
    {
      id: "profile", folio: "05", title: "PROFILE", span: "md:col-span-3 lg:col-span-4 md:order-5", opens: false,
      card: <ProfileCard data={data.profile} />, full: null,
    },
    {
      id: "camera", folio: "04", title: "PHOTOGRAPHY", span: "md:col-span-3 lg:col-span-4 md:order-4", width: "wide",
      footer: data.camera ? (
        <span className="truncate">
          Photo by{" "}
          <a href={data.camera.profile} target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-accent">
            {data.camera.photographer}
          </a>{" "}
          on Unsplash
        </span>
      ) : null,
      card: <PhotographyCard data={data.camera} />, full: <PhotographyFull data={data.camera} />,
    },
    {
      id: "coffee", folio: "06", title: "COFFEE", span: "md:col-span-3 lg:col-span-4 md:order-6",
      footer: <span>Source: NewsAPI</span>,
      card: <NewsList items={data.coffee} limit={3} now={now} />, full: <NewsList items={data.coffee} now={now} source="NewsAPI · titles matching coffee, espresso, barista…" />,
    },
    {
      id: "drones", folio: "07", title: "DRONES", span: "md:col-span-3 lg:col-span-4 md:order-7",
      footer: <span>Source: NewsAPI</span>,
      card: <NewsList items={data.drones} limit={3} now={now} />, full: <NewsList items={data.drones} now={now} source="NewsAPI · titles matching drone, FPV, DJI…" />,
    },
    {
      id: "games", folio: "08", title: "GAMES", span: "md:col-span-3 lg:col-span-4 md:order-8",
      footer: <span>Source: RAWG</span>,
      card: <GamesCard data={data.games} now={now} />, full: <GamesFull data={data.games} now={now} />,
    },
    {
      id: "youtube", folio: "09", title: "YOUTUBE", span: "md:col-span-6 lg:col-span-12 md:order-9",
      footer: <span>Source: YouTube Data API</span>,
      card: <YouTubeCard data={data.youtube} now={now} />, full: <YouTubeFull data={data.youtube} now={now} />,
    },
  ] as const;

  return (
    <>
      <Masthead now={now} freshness={f} />
      <main className="mx-auto max-w-page px-4 md:px-6 py-6 md:py-8">
        {/* Rows are equal height (grid default); each body lets one element absorb the difference. */}
        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 md:gap-6">
          {cards.map((c) => (
            <Card
              key={c.id}
              id={c.id}
              folio={c.folio}
              title={c.title}
              freshness={c.id in f ? f[c.id as keyof typeof f] : undefined}
              footer={"footer" in c ? c.footer : undefined}
              opens={"opens" in c ? c.opens : true}
              stamp={"stamp" in c ? c.stamp : "text"}
              className={c.span}
            >
              {c.card}
            </Card>
          ))}
        </div>
      </main>
      {cards.map(
        (c) =>
          c.full && (
            <WidgetDialog
              key={c.id}
              id={c.id}
              folio={c.folio}
              title={c.title}
              freshness={c.id in f ? f[c.id as keyof typeof f] : undefined}
              stamp={"stamp" in c ? c.stamp : "text"}
              width={"width" in c ? c.width : "narrow"}
            >
              {c.full}
            </WidgetDialog>
          ),
      )}
      <DialogController />
    </>
  );
}
