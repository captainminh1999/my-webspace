// src/app/page.tsx
"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

// Project‑level helpers
import {
  widgets,
  breakpointsConfig,
  colsConfig,
  ORIGINAL_LAYOUTS,
} from "../lib/widgetRegistry";
import ModalFrame from "../components/ModalFrame";

/**************************************************************
 * Setup                                                      *
 **************************************************************/
const ResponsiveGridLayout = WidthProvider(Responsive);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/**************************************************************
 * Fallback widget body                                       *
 **************************************************************/
const GenericWidgetContent: React.FC<{ title: string }> = ({ title }) => (
  <div className="p-4 h-full flex flex-col items-center justify-center text-center">
    <h3 className="font-bold text-lg mb-2">{title}</h3>
    <p className="text-sm text-gray-500">
      Content for <span className="italic">{title}</span> widget will go here.
    </p>
  </div>
);

/**************************************************************
 * Special Profile widget                                     *
 **************************************************************/
const ProfileWidget: React.FC = () => (
  <Link
    href="/about-me"
    className="flex flex-col items-center justify-center h-full p-4 text-center hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors duration-150"
  >
    <h3 className="text-lg font-semibold">Minh (Jose) Nguyen</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">Data Management Specialist @ NEXTGEN oSpace</p>
  </Link>
);

/**************************************************************
 * Page component                                             *
 **************************************************************/
export default function DynamicGrid() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("w");
  const modalWidget = widgets.find((w) => w.id === openId);

  // Grid layout state – no persistence so refresh resets to canonical
  const [layouts, setLayouts] = useState<Layouts>(() => clone(ORIGINAL_LAYOUTS));

  // Disable drag/resize when a modal is open
  const gridEnabled = !modalWidget;

  // Detect click vs drag to avoid opening modal on drop
  const isDragging = useRef(false);

  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => setLayouts(clone(all)), []);
  const resetLayout = () => setLayouts(clone(ORIGINAL_LAYOUTS));

  // Close modal helpers
  const closeModal = React.useCallback(() => router.back(), [router]);
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && modalWidget) closeModal();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalWidget, closeModal]);

  // Patch snippet for page.tsx – keep header+grid fixed but restore browser scrollbar
  // Place this helper effect **below** the existing one that sets wrapper position

  useEffect(() => {
  if (modalWidget) {
    document.body.classList.add("overflow-hidden");
  } else {
    document.body.classList.remove("overflow-hidden");
  }
  }, [modalWidget]);

  return (
    <main className="p-4 bg-gray-100 dark:bg-gray-900 min-h-screen">
      <div id="dashboard-wrapper" className="relative">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">My Dashboard</h1>
        <button
          onClick={resetLayout}
          className="px-4 py-2 bg-red-500 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-red-600 transition duration-150"
        >
          Reset Layout
        </button>
      </div>
      <div className="mx-auto max-w-[1200px]">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={breakpointsConfig}
          cols={colsConfig}
          rowHeight={175}
          draggableHandle=".widget-drag-handle"
          onDragStart={() => (isDragging.current = true)}
          onDragStop={() => setTimeout(() => (isDragging.current = false), 0)}
          onLayoutChange={onLayoutChange}
          isDraggable={gridEnabled}
          isResizable={gridEnabled}
          compactType="vertical"
          preventCollision={false}
        >
          {widgets.map((w) => (
            <motion.div
              key={w.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              {/* drag handle */}
              <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move widget-drag-handle">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">{w.title}</h3>
              </div>

              {/* content area (clickable if modal allowed) */}
              {w.disableModal ? (
                <div className="widget-content flex-grow p-2">
                  {w.id === "cvLink" ? <ProfileWidget /> : <GenericWidgetContent title={w.title} />}
                </div>
              ) : (
                <button
                  type="button"
                  className="widget-content flex-grow p-2 text-left w-full"
                  onClick={() => {
                    if (!isDragging.current) router.push(`?w=${w.id}`, { scroll: false });
                  }}
                >
                  {w.content ? (
                    w.content           // show SpaceCard thumbnail, etc.
                  ) : (
                    <GenericWidgetContent title={w.title} />
                  )}
                </button>
              )}
            </motion.div>
          ))}
        </ResponsiveGridLayout>
      </div>
      {/* Modal overlay */}
      {modalWidget && (
        <ModalFrame isOpen={Boolean(modalWidget)} title={modalWidget?.title ?? ''} onClose={closeModal}>
          {modalWidget.modalContent || <GenericWidgetContent title={modalWidget.title} />}
        </ModalFrame>
      )}
      </div>
    </main>
  );
}
