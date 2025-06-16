// src/app/page.tsx  – server component (no "use client")
import DashboardView from "./DashboardView";

export const revalidate = 60;

import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense>
      <DashboardView />
    </Suspense>
  );
}

