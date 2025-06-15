"use client";
import DashboardGrid from './dashboard-grid';
import DashboardHeader from '@/components/DashboardHeader';


export default function DashboardView() {
  return (
    <main className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <DashboardHeader />
      <DashboardGrid />
    </main>
  );
}
