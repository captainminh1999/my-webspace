// src/components/StaticDashboard.tsx (server component – no hooks)
import React from "react";
import {
  widgets,
  ORIGINAL_LAYOUTS,
} from "@/lib/widgetRegistry";
import GenericWidgetContent from "@/components/widgets/GenericWidgetContent";
import { SpaceCard } from "@/components/widgets/SpaceWidget";

// Map widget id → static content (no routing, no interactivity)
const staticContent: Record<string, React.ReactNode> = {
  space: <SpaceCard />,
  // add more widget‑specific static previews here if needed
};

/**
 * Renders the header + RGL grid using the **canonical md layout**
 * entirely on the server side—no browser hooks.
 * Grid items have `pointer-events-none` so they don’t interfere with
 * the interactive layer that mounts later.
 */
export default function StaticDashboard() {
  const layout = ORIGINAL_LAYOUTS.md; // 3‑col reference layout

  return (
    <div>
      {/* Header (static) */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
          Daily Dash
        </h1>
        {/* button inert until client JS mounts; it’s just visual for now */}
        <button
          className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm opacity-50 cursor-default"
          disabled
        >
          Reset Layout
        </button>
      </div>

      {/* Simple CSS Grid to approximate positions without JS */}
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        {layout.map((item) => {
          const widget = widgets.find((w) => w.id === item.i)!;
          return (
            <div
              key={item.i}
              style={{ gridColumn: `span ${item.w}` }}
              className="pointer-events-none select-none bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {widget.title}
                </h3>
              </div>
              <div className="flex-grow p-2">
                {staticContent[widget.id] || (
                  <GenericWidgetContent title={widget.title} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
