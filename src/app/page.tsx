// src/app/page.tsx
"use client";

import React, { useState, useCallback } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import Link from "next/link";

// Make sure these styles are added once globally (e.g., in globals.css):
// @import "react-grid-layout/css/styles.css";
// @import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

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

/***************************** Widgets *****************************/

const CVLinkWidget: React.FC = () => (
  <div className="flex flex-col items-center justify-center h-full p-4 text-center">
    <h3 className="text-lg font-semibold">Minh (Jose) Nguyen</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
      Data Management Specialist @ NEXTGEN oSpace
    </p>
    <Link
      href="/about-me"
      className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150"
    >
      View Full CV
    </Link>
  </div>
);

const GenericWidgetContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4 h-full flex flex-col items-center justify-center text-center">
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-500">
      Content for <span className="italic">{title}</span> widget will go here.
    </p>
  </div>
);

const initialWidgets: WidgetItem[] = [
  {
    id: "cvLink",
    title: "My Profile/CV",
    defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 1, maxH: 1 },
    content: <CVLinkWidget />,
  },
  { id: "coffee", title: "Coffee Corner", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "weather", title: "Weather", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 1 } },
  { id: "space", title: "Space News", defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "tech", title: "Tech Updates", defaultSize: { w: 1, h: 2, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "youtube", title: "YouTube Recs", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "drones", title: "Drones", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "camera", title: "Photography", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "games", title: "Gaming", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 2, maxH: 2 } },
  { id: "visitorEmotion", title: "How are you feeling?", defaultSize: { w: 1, h: 1, minW: 1, minH: 1, maxW: 1, maxH: 1 } },
];

/********************* Breakpoints & Column count ******************/

const breakpointsConfig = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const colsConfig = { lg: 3, md: 3, sm: 2, xs: 1, xxs: 1 } as const;
type BreakpointKey = keyof typeof breakpointsConfig;

/***************************** Helpers *****************************/

const isBrowser = typeof window !== "undefined";

const getDefaultLayoutForBreakpoint = (widgets: WidgetItem[], numCols: number): Layout[] => {
  const layout: Layout[] = [];
  let col = 0;
  let row = 0;

  widgets.forEach((w) => {
    const width = Math.min(w.defaultSize.w, numCols);
    if (col + width > numCols) {
      col = 0;
      row += 1;
    }

    layout.push({
      i: w.id,
      x: col,
      y: row,
      w: width,
      h: w.defaultSize.h,
      minW: w.defaultSize.minW ?? 1,
      minH: w.defaultSize.minH ?? 1,
      maxW: w.defaultSize.maxW ?? numCols,
      maxH: w.defaultSize.maxH ?? 2,
      isResizable: numCols > 1,
      isDraggable: true,
    });

    col += width;
  });

  return layout;
};

const generateAllDefaultLayouts = (): Layouts => {
  const layouts: Layouts = {} as Layouts;
  (Object.keys(breakpointsConfig) as BreakpointKey[]).forEach((bp) => {
    layouts[bp] = getDefaultLayoutForBreakpoint(initialWidgets, colsConfig[bp]);
  });
  return layouts;
};

const safeGetLayouts = (): Layouts => {
  if (!isBrowser) return generateAllDefaultLayouts();
  const saved = window.localStorage.getItem("dashboardLayouts");
  if (!saved) return generateAllDefaultLayouts();
  try {
    return JSON.parse(saved) as Layouts;
  } catch {
    return generateAllDefaultLayouts();
  }
};

const safeSetLayouts = (ls: Layouts) => {
  if (isBrowser) window.localStorage.setItem("dashboardLayouts", JSON.stringify(ls));
};

/*************************** Component *****************************/

export default function NewHomePage() {
  const [layouts, setLayouts] = useState<Layouts>(() => safeGetLayouts());

  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => {
    safeSetLayouts(all);
    setLayouts(all);
  }, []);

  const resetLayout = () => {
    if (isBrowser) window.localStorage.removeItem("dashboardLayouts");
    setLayouts(generateAllDefaultLayouts());
  };

  return (
    <main className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Dashboard</h1>
        <button onClick={resetLayout} className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-red-600 transition duration-150">
          Reset Layout
        </button>
      </div>

      {/* Grid */}
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
        {initialWidgets.map((w) => (
          <div key={w.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
            {/* Drag handle */}
            <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move widget-drag-handle">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{w.title}</h3>
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
