"use client";

import React, { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  widgets,
  layoutMd,
} from "@/lib/widgetRegistry";
import ModalFrame from "@/components/ModalFrame";
import GenericWidgetContent from "@/components/widgets/GenericWidgetContent";
import ProfileWidget from "@/components/widgets/ProfileWidget";

export default function DashboardGrid() {
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("w");
  const modalWidget = widgets.find((w) => w.id === openId);

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
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
      >
        {layoutMd.map((item) => {
          const widget = widgets.find((w) => w.id === item.i)!;
          return (
            <div
              key={item.i}
              style={{ gridColumn: `span ${item.w}`, gridRow: `span ${item.h}` }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col"
            >
              <div className="p-2 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">
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
                  className="flex-grow p-2 text-left w-full"
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
