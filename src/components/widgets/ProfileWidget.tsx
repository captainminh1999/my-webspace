// src/components/widgets/ProfileWidget.tsx
import React from "react";
import Link from "next/link";

/** Simple static profile block used in the dashboard grid */
const ProfileWidget: React.FC = () => (
  <Link
    href="/about-me"
    className="flex flex-col items-center justify-center h-full p-4 text-center
               hover:bg-indigo-50 dark:hover:bg-indigo-900 transition-colors duration-150"
  >
    <h3 className="text-lg font-semibold">Minh (Jose) Nguyen</h3>
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Data Management Specialist @ NEXTGEN oSpace
    </p>
  </Link>
);

export default ProfileWidget;
