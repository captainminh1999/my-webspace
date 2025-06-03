// src/app/page.tsx  – server component (no "use client")
import DashboardView from "./DashboardView.client";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}

