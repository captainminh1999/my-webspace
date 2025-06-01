// src/app/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import Link from "next/link";

// Ensure these styles are imported once globally (e.g., in globals.css)
// @import "react-grid-layout/css/styles.css";
// @import "react-resizable/css/styles.css";

/*****************************************************************
 *                             Setup                             *
 *****************************************************************/
const ResponsiveGridLayout = WidthProvider(Responsive);

// Utility: deep‑clone a Layouts object so RGL mutations never touch the source
const cloneLayouts = (ls: Layouts): Layouts =>
  JSON.parse(JSON.stringify(ls)) as Layouts;

/*****************************************************************
 *                             Types                             *
 *****************************************************************/
interface WidgetItem {
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
}

/*****************************************************************
 *                           Widgets                             *
 *****************************************************************/
const CVLinkWidget: React.FC = () => (
  <Link href="/about-me" className="flex flex-col items-center justify-center h-full p-4 text-center hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors duration-150">
    <h3 className="text-lg font-semibold">Minh (Jose) Nguyen</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">Data Management Specialist @ NEXTGEN oSpace</p>
  </Link>
);

const GenericWidgetContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4 h-full flex flex-col items-center justify-center text-center">
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-500">
      Content for <span className="italic">{title}</span> widget will go here.
    </p>
  </div>
);

/*****************************************************************
 *                      Widget Definitions                       *
 *****************************************************************/
const widgets: WidgetItem[] = [
  {
    id: "coffee",
    title: "Coffee Corner",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "weather",
    title: "Weather",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 1 },
  },
  {
    id: "space",
    title: "Space News",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "tech",
    title: "Tech Updates",
    defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "youtube",
    title: "YouTube Recs",
    defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "drones",
    title: "Drones",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "camera",
    title: "Photography",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "games",
    title: "Gaming",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 },
  },
  {
    id: "visitorEmotion",
    title: "How are you feeling?",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 1, maxH: 1 },
  },
  {
    id: "cvLink",
    title: "My Profile",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 1, maxH: 1 },
    content: <CVLinkWidget />,
  },
];

/*****************************************************************
 *                     Breakpoints & Columns                     *
 *****************************************************************/
const breakpointsConfig = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
} as const;

const colsConfig = {
  lg: 3,
  md: 3,
  sm: 2,
  xs: 1,
  xxs: 1,
} as const;

/*****************************************************************
 *                      Original Layouts                         *
 *****************************************************************/
const getCfg = (id: string) => widgets.find((w) => w.id === id)!;

const buildItem = (
  id: string,
  x: number,
  y: number,
  w = 1,
  h?: number,
): Layout => {
  const cfg = getCfg(id);
  return {
    i: id,
    x,
    y,
    w,
    h: h ?? cfg.defaultSize.h,
    minW: cfg.defaultSize.minW ?? 1,
    minH: cfg.defaultSize.minH ?? 1,
    maxW: cfg.defaultSize.maxW ?? colsConfig.lg,
    maxH: cfg.defaultSize.maxH ?? 2,
    isResizable: true,
    isDraggable: true,
  };
};

// --- 3‑column (md / lg) --------------------------------------
const layoutMd: Layout[] = [
  buildItem("weather", 0, 0),
  buildItem("tech", 1, 0, 1, 2),
  buildItem("coffee", 2, 0),
  buildItem("space", 0, 1),
  buildItem("youtube", 2, 1, 1, 2),
  buildItem("games", 0, 2),
  buildItem("drones", 1, 2),
  buildItem("visitorEmotion", 0, 3),
  buildItem("camera", 1, 3),
  buildItem("cvLink", 2, 3),
];

// --- 2‑column (sm) ------------------------------------------
const layoutSm: Layout[] = [
  buildItem("weather", 0, 0),
  buildItem("coffee", 1, 0),
  buildItem("space", 0, 1),
  buildItem("tech", 1, 1, 1, 2),
  buildItem("youtube", 0, 2, 1, 2),
  buildItem("drones", 1, 3),
  buildItem("games", 0, 4),
  buildItem("camera", 1, 4),
  buildItem("visitorEmotion", 0, 5),
  buildItem("cvLink", 1, 5),
];

// --- 1‑column (xs / xxs) -------------------------------------
const singleColumnOrder = [
  "coffee",
  "weather",
  "space",
  "tech",
  "youtube",
  "drones",
  "camera",
  "games",
  "visitorEmotion",
  "cvLink",
];

const makeSingleColumn = (): Layout[] =>
  singleColumnOrder.map((id, idx) => buildItem(id, 0, idx));

const ORIGINAL_LAYOUTS: Layouts = {
  md: layoutMd,
  lg: cloneLayouts({ md: layoutMd }).md, // copy of md
  sm: layoutSm,
  xs: makeSingleColumn(),
  xxs: makeSingleColumn(),
};

/*****************************************************************
 *                         Component                             *
 *****************************************************************/
export default function NewHomePage() {
  // Always start with a fresh clone of the original layout
  const [layouts, setLayouts] = useState<Layouts>(() => cloneLayouts(ORIGINAL_LAYOUTS));

  // Track user moves only for this session
  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => {
    setLayouts(cloneLayouts(all));
  }, []);

  const reset = () => setLayouts(cloneLayouts(ORIGINAL_LAYOUTS));

  return (
    <main className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Dashboard</h1>
        <button
          onClick={reset}
          className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-red-600 transition duration-150"
        >
          Reset Layout
        </button>
      </div>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={breakpointsConfig}
        cols={colsConfig}
        rowHeight={150}
        draggableHandle=".widget-drag-handle"
        onLayoutChange={onLayoutChange}
        compactType="vertical"
        preventCollision={false}
      >
        {widgets.map((w) => (
          <div
            key={w.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
          >
            {/* drag handle */}
            <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move widget-drag-handle">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                {w.title}
              </h3>
            </div>
            <div className="widget-content flex-grow p-2">
              {w.content || <GenericWidgetContent title={w.title} />}
            </div>
          </div>
        ))}
      </ResponsiveGridLayout>
    </main>
  );
}
