"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  widgets,
  ORIGINAL_LAYOUTS,
  breakpointsConfig,
  colsConfig,
  BreakpointKey,
} from "@/lib/widgetRegistry";
import ModalFrame from "@/components/ModalFrame";
import GenericWidgetContent from "@/components/widgets/GenericWidgetContent";
import ProfileWidget from "@/components/widgets/ProfileWidget";

function useResponsiveLayout() {
  const [layoutKey, setLayoutKey] = useState<BreakpointKey>("md");
  const updateLayout = () => {
    const w = window.innerWidth;
    let key: BreakpointKey = "xxs";
    if (w >= breakpointsConfig.lg) key = "lg";
    else if (w >= breakpointsConfig.md) key = "md";
    else if (w >= breakpointsConfig.sm) key = "sm";
    else if (w >= breakpointsConfig.xs) key = "xs";
    setLayoutKey(key);
  };

  useEffect(() => {
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  return {
    layout: ORIGINAL_LAYOUTS[layoutKey],
    cols: colsConfig[layoutKey],
  };
}

export default function DashboardGrid() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("w");
  const modalWidget = widgets.find((w) => w.id === openId);

  const { layout, cols } = useResponsiveLayout();

  const closeModal = React.useCallback(() => router.back(), [router]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && modalWidget) closeModal();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [modalWidget, closeModal]);

  useEffect(() => {
    document.body.classList.toggle("overflow-hidden", Boolean(modalWidget));
  }, [modalWidget]);

  return (
    <>
      <div
        className="mx-auto max-w-[1200px] grid gap-4"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {layout.map((item) => {
          const widget = widgets.find((w) => w.id === item.i)!;
          return (
            <div
              key={item.i}
              style={{ gridColumn: `span ${item.w}`, gridRow: `span ${item.h}` }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col transform transition-transform duration-[300ms] ease-in-out hover:scale-[1.02]"
            >
              <div
                className="p-2.5 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 cursor-pointer"
                onClick={() => {
                  if (!widget.disableModal) {
                    router.push(`?w=${widget.id}`, { scroll: false });
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate pl-2">
                  {widget.title}
                </h2>
              </div>
              {widget.disableModal ? (
                <div className="flex-grow p-2">
                  {widget.id === "cvLink" ? (
                    <ProfileWidget />
                  ) : (
                    <GenericWidgetContent title={widget.title} />
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  className="flex-grow text-left w-full"
                  onClick={() => router.push(`?w=${widget.id}`, { scroll: false })}
                >
                  {widget.content ?? <GenericWidgetContent title={widget.title} />}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {modalWidget && (
        <ModalFrame isOpen title={modalWidget.title} onClose={closeModal}>
          {modalWidget.modalContent ?? (
            <GenericWidgetContent title={modalWidget.title} />
          )}
        </ModalFrame>
      )}
    </>
  );
}
