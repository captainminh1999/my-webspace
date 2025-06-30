"use client";
import Image from "next/image";

export default function HeroImage() {
  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 mb-4 hero-image">
      <Image
        src="https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=1600&q=85&fm=webp"
        alt="Hero banner"
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
        className="object-cover rounded-lg transition-opacity duration-300"
        priority={true}
        fetchPriority="high"
        quality={85}
      />
    </div>
  );
}
