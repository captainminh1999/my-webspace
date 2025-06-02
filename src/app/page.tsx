// src/app/page.tsx  – server component (no "use client")
import { Suspense } from "react";
import StaticDashboard from "@/components/StaticDashboard";
import DynamicGrid from "./dashboard-grid";        // client – drag / resize
import ModalRouter from "./ModalRouter.client";    // client – modal routing
import DashboardHeader from "@/components/DashboardHeader";

export default function Page() {
  return (
    <main className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <DashboardHeader />                {/* <── always visible */}

      <Suspense fallback={<StaticDashboard />}>
        <DynamicGrid />                  {/* holds live Reset button */}
      </Suspense>

      <Suspense fallback={null}>
        <ModalRouter />
      </Suspense>
    </main>
  );
}
