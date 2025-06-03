"use client";
import dynamic from 'next/dynamic';
import StaticDashboard from '@/components/StaticDashboard';
import DashboardHeader from '@/components/DashboardHeader';

// Lazy-load interactive grid and modal router only on the client
const DynamicGrid = dynamic(() => import('./dashboard-grid'), {
  ssr: false,
  loading: () => <StaticDashboard />,
});
const ModalRouter = dynamic(() => import('./ModalRouter.client'), { ssr: false });

export default function DashboardView() {
  return (
    <main className="min-h-screen p-4 bg-gray-100 dark:bg-gray-900">
      <DashboardHeader />
      <DynamicGrid />
      <ModalRouter />
    </main>
  );
}
