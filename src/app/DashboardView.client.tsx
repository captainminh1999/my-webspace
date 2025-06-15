"use client";
import DashboardGrid from './dashboard-grid';
import DashboardHeader from '@/components/DashboardHeader';
import { useEffect } from 'react';
import { hydrateWidgetCache } from '@/lib/widgetData';

interface Props {
  initialData?: Record<string, unknown>;
}

export default function DashboardView({ initialData }: Props) {
  useEffect(() => {
    if (initialData) hydrateWidgetCache(initialData);
  }, [initialData]);
  return (
    <main className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <DashboardHeader />
      <DashboardGrid />
    </main>
  );
}
