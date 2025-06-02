// src/components/DashboardHeader.tsx
export default function DashboardHeader() {
  return (
    <div className="mb-4 flex justify-between items-center">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
        My Dashboard
      </h1>
      {/* Reset button lives in DynamicGrid; this spacer keeps layout aligned */}
      <div className="w-[86px]" />   {/* width ≈ reset button */}
    </div>
  );
}
