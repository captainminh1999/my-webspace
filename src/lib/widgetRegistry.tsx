// src/lib/widgetRegistry.ts

import { Layout } from "react-grid-layout";
import { SpaceCard, SpaceModalBody } from "@/components/widgets/SpaceWidget";
import { WeatherCard, WeatherModalBody } from "@/components/widgets/WeatherWidget";
import { TechCard, TechModalBody } from "@/components/widgets/TechWidget";
import {YouTubeRecsCard, YouTubeRecsModalBody } from "@/components/widgets/YouTubeRecsWidget";


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
    modalContent: <p className="p-4">☕ It is always coffee oh clock!</p>,
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
    defaultSize: { w: 1, h: 2 },
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
    defaultSize: { w: 1, h: 2 },
    content: <YouTubeRecsCard />,
    modalContent: <YouTubeRecsModalBody />,
  },
  {
    id: "drones",
    title: "Drones",
    defaultSize: { w: 1, h: 1 },
    modalContent: <p className="p-4">Drone news feed…</p>,
  },
  {
    id: "camera",
    title: "Photography",
    defaultSize: { w: 1, h: 2 },
    modalContent: <p className="p-4">📸 Gallery coming soon.</p>,
  },
  {
    id: "games",
    title: "Gaming",
    defaultSize: { w: 1, h: 1 },
    modalContent: <p className="p-4">🎮 Steam deals etc.</p>,
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
const make1Col = (): Layout[] =>
  order1Col.map((id, y) => ({ i: id, x: 0, y, w: 1, h: widgets.find((w) => w.id === id)!.defaultSize.h }));

export const layoutSm: Layout[] = [
  { i: "weather", x: 0, y: 0, w: 1, h: 1 },
  { i: "coffee", x: 1, y: 0, w: 1, h: 1 },
  { i: "space", x: 0, y: 1, w: 1, h: 2 },
  { i: "tech", x: 1, y: 1, w: 1, h: 1 },
  { i: "youtube", x: 0, y: 3, w: 1, h: 2 },
  { i: "drones", x: 1, y: 3, w: 1, h: 1 },
  { i: "games", x: 0, y: 5, w: 1, h: 1 },
  { i: "camera", x: 1, y: 4, w: 1, h: 2 },
  { i: "cvLink", x: 1, y: 6, w: 1, h: 1 },
];

export const layoutMd: Layout[] = [
  { i: "weather", x: 0, y: 0, w: 1, h: 1 },
  { i: "tech", x: 1, y: 0, w: 1, h: 1 },
  { i: "coffee", x: 2, y: 0, w: 1, h: 1 },
  { i: "space", x: 0, y: 1, w: 1, h: 2 },
  { i: "youtube", x: 2, y: 1, w: 1, h: 2 },
  { i: "drones", x: 1, y: 2, w: 1, h: 1 },
  { i: "games", x: 0, y: 3, w: 1, h: 1 },
  { i: "camera", x: 1, y: 3, w: 1, h: 2 },
  { i: "cvLink", x: 2, y: 3, w: 1, h: 1 },
];

export const ORIGINAL_LAYOUTS: Record<BreakpointKey, Layout[]> = {
  md: layoutMd,
  lg: clone(layoutMd),
  sm: layoutSm,
  xs: make1Col(),
  xxs: make1Col(),
};
