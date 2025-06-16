"use client";
import Image from "next/image";

export default function HeroImage() {
  return (
    <div className="relative w-full h-48 sm:h-56 md:h-64 lg:h-72 mb-4">
      <Image
        src="https://images.unsplash.com/photo-1465101162946-4377e57745c3?auto=format&fit=crop&w=1600&q=80"
        alt="Hero banner"
        fill
        sizes="100vw"
        className="object-cover rounded-lg"
        priority
      />
    </div>
  );
}
