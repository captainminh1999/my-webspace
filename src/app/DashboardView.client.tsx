"use client";
import DashboardGrid from './dashboard-grid';
import DashboardHeader from '@/components/DashboardHeader';
import HeroImage from '@/components/HeroImage';
import HeroSkeleton from '@/components/HeroSkeleton';
import { useEffect, Suspense } from 'react';
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
      <Suspense fallback={<HeroSkeleton />}>
        <HeroImage />
      </Suspense>
      <DashboardGrid />
    </main>
  );
}
