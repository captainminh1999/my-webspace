// src/app/page.tsx (New Homepage Placeholder)
import Link from 'next/link';

export default function NewHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-6">
          Welcome to My New Homepage!
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          This will soon be a dynamic dashboard with cool widgets.
        </p>
        <Link href="/about-me" className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300">
          View My Full CV (/about-me)
        </Link>
      </div>
    </main>
  );
}