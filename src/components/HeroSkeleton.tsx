// src/components/HeroSkeleton.tsx
export default function HeroSkeleton() {
  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 mb-4">
      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded-lg hero-image">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
      </div>
    </div>
  );
}
