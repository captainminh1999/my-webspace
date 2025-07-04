// src/lib/widgetRegistry.ts


/** Simplified layout type so we can drop the react-grid-layout dependency */
export interface Layout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  maxW?: number;
  minH?: number;
  maxH?: number;
}
import dynamic from "next/dynamic";

const CoffeeCard = dynamic(() => import("@/components/widgets/CoffeeWidget").then(m => m.default));
const CoffeeModalBody = dynamic(() => import("@/components/widgets/CoffeeWidget").then(m => m.CoffeeModalBody));
const WeatherCard = dynamic(() => import("@/components/widgets/WeatherWidget").then(m => m.WeatherCard));
const WeatherModalBody = dynamic(() => import("@/components/widgets/WeatherWidget").then(m => m.WeatherModalBody));
const SpaceCard = dynamic(() => import("@/components/widgets/SpaceWidget").then(m => m.SpaceCard));
const SpaceModalBody = dynamic(() => import("@/components/widgets/SpaceWidget").then(m => m.SpaceModalBody));
const TechCard = dynamic(() => import("@/components/widgets/TechWidget").then(m => m.TechCard));
const TechModalBody = dynamic(() => import("@/components/widgets/TechWidget").then(m => m.TechModalBody));
const YouTubeRecsCard = dynamic(() => import("@/components/widgets/YouTubeRecsWidget").then(m => m.YouTubeRecsCard));
const YouTubeRecsModalBody = dynamic(() => import("@/components/widgets/YouTubeRecsWidget").then(m => m.YouTubeRecsModalBody));
const GamesCard = dynamic(() => import("@/components/widgets/GamesWidget").then(m => m.default));
const GamesModalBody = dynamic(() => import("@/components/widgets/GamesWidget").then(m => m.GamesModalBody));
const DroneNewsCard = dynamic(() => import("@/components/widgets/DroneNewsWidget").then(m => m.default));
const DroneNewsModalBody = dynamic(() => import("@/components/widgets/DroneNewsWidget").then(m => m.DroneNewsModalBody));
const PhotographyCard = dynamic(() => import("@/components/widgets/PhotographyWidget").then(m => m.default));
const PhotographyModalBody = dynamic(() => import("@/components/widgets/PhotographyWidget").then(m => m.PhotographyModalBody));


/**************************************************************
 * Public exports                                             *
 *   • widgets – metadata & content placeholders              *
 *   • breakpointsConfig / colsConfig – grid breakpoints     *
 *   • ORIGINAL_LAYOUTS – canonical starting layouts          *
 **************************************************************/

export interface WidgetItem {
  id: string;
  title: string;
  defaultSize: {
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  content?: React.ReactNode;
  modalContent?: React.ReactNode;
  disableModal?: boolean;
}

// Helper
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/**************************************************************
 * 1 · Widget definitions                                     *
 **************************************************************/
export const widgets: WidgetItem[] = [
  {
    id: "coffee",
    title: "Coffee Corner",
    defaultSize: { w: 1, h: 1 },
    content: <CoffeeCard />,
    modalContent: <CoffeeModalBody />,
  },
  {
    id: "weather",
    title: "Weather",
    defaultSize: { w: 1, h: 1 },
    content: <WeatherCard />,
    modalContent: <WeatherModalBody />,
  },
  {
    id: "space",
    title: "Space News",
    defaultSize: { w: 1, h: 1 },
    modalContent: <SpaceModalBody />,
    content: <SpaceCard />,
  },
  {
    id: "tech",
    title: "Tech Updates",
    defaultSize: { w: 1, h: 1 },
    content: <TechCard />,
    modalContent: <TechModalBody />,
  },
  {
    id: "youtube",
    title: "YouTube Recs",
    defaultSize: { w: 1, h: 1 },
    content: <YouTubeRecsCard />,
    modalContent: <YouTubeRecsModalBody />,
  },
  {
    id: "drones",
    title: "Drones",
    defaultSize: { w: 1, h: 1 },
    content: <DroneNewsCard />,
    modalContent: <DroneNewsModalBody />,
  },
  {
    id: "camera",
    title: "Photography",
    defaultSize: { w: 1, h: 1 },
    content: <PhotographyCard />,
    modalContent: <PhotographyModalBody />,
  },
  {
    id: "games",
    title: "Gaming",
    defaultSize: { w: 1, h: 1 },
    content: <GamesCard />,
    modalContent: <GamesModalBody />,
  },
  // Profile widget: links away, so modal disabled
  {
    id: "cvLink",
    title: "My Profile",
    defaultSize: { w: 1, h: 1 },
    disableModal: true,
  },
];

/**************************************************************
 * 2 · Grid breakpoints & columns                             *
 **************************************************************/
export const breakpointsConfig = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
} as const;

export type BreakpointKey = keyof typeof breakpointsConfig;

export const colsConfig: Record<BreakpointKey, number> = {
  lg: 3,
  md: 3,
  sm: 2,
  xs: 1,
  xxs: 1,
} as const;

/**************************************************************
 * 3 · Canonical starting layouts                             *
 **************************************************************/
const order1Col = [
  "coffee",
  "weather",
  "space",
  "tech",
  "youtube",
  "drones",
  "camera",
  "games",
  "cvLink",
];
const make1Col = (): Layout[] => {
  let y = 0;
  return order1Col.map((id) => {
    const h = widgets.find((w) => w.id === id)!.defaultSize.h;
    const item = { i: id, x: 0, y, w: 1, h } as Layout;
    y += h;
    return item;
  });
};

export const layoutSm: Layout[] = [
  { i: "weather", x: 0, y: 0, w: 1, h: 1 },
  { i: "coffee", x: 1, y: 0, w: 1, h: 1 },
  { i: "space", x: 0, y: 1, w: 1, h: 1 },
  { i: "tech", x: 1, y: 1, w: 1, h: 1 },
  { i: "youtube", x: 0, y: 2, w: 1, h: 1 },
  { i: "drones", x: 1, y: 2, w: 1, h: 1 },
  { i: "games", x: 0, y: 3, w: 1, h: 1 },
  { i: "camera", x: 1, y: 3, w: 1, h: 1 },
  { i: "cvLink", x: 1, y: 4, w: 1, h: 1 },
];

export const layoutMd: Layout[] = [
  { i: "weather", x: 0, y: 0, w: 1, h: 1 },
  { i: "drones", x: 0, y: 1, w: 1, h: 1 },
  { i: "space", x: 0, y: 2, w: 1, h: 1 },

  { i: "tech", x: 1, y: 0, w: 1, h: 1 },
  { i: "camera", x: 1, y: 1, w: 1, h: 1 },
  { i: "games", x: 1, y: 2, w: 1, h: 1 },

  { i: "coffee", x: 2, y: 0, w: 1, h: 1 },
  { i: "youtube", x: 2, y: 1, w: 1, h: 1 },
  { i: "cvLink", x: 2, y: 2, w: 1, h: 1 },
];

export const ORIGINAL_LAYOUTS: Record<BreakpointKey, Layout[]> = {
  md: layoutMd,
  lg: clone(layoutMd),
  sm: layoutSm,
  xs: make1Col(),
  xxs: make1Col(),
};
