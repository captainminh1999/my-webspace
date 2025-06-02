// src/app/page.tsx
import { Suspense } from "react";
import Skeleton from "@/components/Skeleton";
import StaticDashboard from "@/components/StaticDashboard";
import DynamicGrid from "./dashboard-grid";

export default function Page() {
  return (
    <main className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <StaticDashboard />               {/* fully static markup */}
      <Suspense fallback={<Skeleton />}> {/* shows pulse overlay */}
        <DynamicGrid />                  {/* client-only hooks */}
      </Suspense>
    </main>
  );
}