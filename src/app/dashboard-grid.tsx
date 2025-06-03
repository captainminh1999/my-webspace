"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";

import {
  widgets,
  breakpointsConfig,
  colsConfig,
  ORIGINAL_LAYOUTS,
} from "@/lib/widgetRegistry";
import ModalFrame from "@/components/ModalFrame";
import GenericWidgetContent from "@/components/widgets/GenericWidgetContent";
import ProfileWidget from "@/components/widgets/ProfileWidget";

const RGL = WidthProvider(Responsive);
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

export default function DynamicGrid() {
  /* ─────────────────── modal routing ─────────────────── */
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("w");
  const modalWidget = widgets.find((w) => w.id === openId);

  /* ─────────────────── grid state ─────────────────── */
  const [layouts, setLayouts] = useState<Layouts>(() => clone(ORIGINAL_LAYOUTS));
  /* ↙︎  add this line */
  const resetLayout = useCallback(() => setLayouts(clone(ORIGINAL_LAYOUTS)), []);
  const onLayoutChange = useCallback((_: Layout[], all: Layouts) => setLayouts(clone(all)), []);

  const isDragging = useRef(false);
  const gridEnabled = !modalWidget;

  /* ─────────────────── keyboard ESC close ─────────────────── */
  const closeModal = React.useCallback(() => router.back(), [router]);
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && modalWidget && closeModal();
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalWidget, closeModal]);

  /* ─────────────────── body scroll lock ─────────────────── */
  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", Boolean(modalWidget));
  }, [modalWidget]);

  return (
    <>
      {/* RESET BUTTON (live after hydration) */}
      <div className="flex justify-end mb-4">
        <button
          onClick={resetLayout}
          className="px-4 py-2 bg-red-500 text-white text-xs font-semibold
                     rounded-md shadow-sm hover:bg-red-600 transition"
        >
          Reset Layout
        </button>
      </div>

      {/* INTERACTIVE GRID ONLY */}
      <div className="mx-auto max-w-[1200px]">
        <RGL
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col duration-600 ease-in-out hover:scale-101"
            >
              {/* drag handle */}
              <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-move widget-drag-handle">
                <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
                  {w.title}
                </h2>
              </div>

              {/* cell content */}
              {w.disableModal ? (
                <div className="flex-grow p-2">
                  {w.id === "cvLink" ? <ProfileWidget /> : <GenericWidgetContent title={w.title} />}
                </div>
              ) : (
                <button
                  type="button"
                  className="flex-grow p-2 text-left w-full"
                  onClick={() => !isDragging.current && router.push(`?w=${w.id}`, { scroll: false })}
                >
                  {w.content ?? <GenericWidgetContent title={w.title} />}
                </button>
              )}
            </motion.div>
          ))}
        </RGL>
      </div>

      {/* MODAL */}
      {modalWidget && (
        <ModalFrame isOpen title={modalWidget.title} onClose={closeModal}>
          {modalWidget.modalContent ?? <GenericWidgetContent title={modalWidget.title} />}
        </ModalFrame>
      )}
    </>
  );
}
