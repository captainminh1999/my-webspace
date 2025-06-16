import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable layout for "About Me" sub-pages.
 */
const SectionPageLayout: React.FC<Props> = ({ title, children }) => (
  <main className="min-h-screen bg-gray-50 dark:bg-gray-950 py-10 px-4 sm:px-6 lg:px-8">
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Link
          href="/about-me"
          className="inline-flex items-center text-black dark:text-white hover:underline transition-colors duration-150 group"
        >
          <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
          Back to Main CV
        </Link>
      </div>
      <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-xl shadow-xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8 pb-4 border-b-2 border-indigo-500">
          {title}
        </h1>
        {children}
      </section>
    </div>
  </main>
);

export default SectionPageLayout;
