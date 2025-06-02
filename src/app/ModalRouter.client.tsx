// src/app/ModalRouter.client.tsx
"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ModalFrame from "@/components/ModalFrame";
import {
  widgets,
} from "@/lib/widgetRegistry";

export default function ModalRouter() {
  const params = useSearchParams();
  const router = useRouter();
  const openId = params.get("w");
  const modalWidget = widgets.find((w) => w.id === openId);

  const close = React.useCallback(() => router.back(), [router]);

  if (!modalWidget) return null;

  return (
    <ModalFrame
      isOpen
      title={modalWidget.title}
      onClose={close}
    >
      {modalWidget.modalContent}
    </ModalFrame>
  );
}
