export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">
          [Your Name]
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
          Interactive CV - Coming Soon!
        </p>
        <a
          href="#about" // Example link
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 transition duration-300"
        >
          Learn More
        </a>
      </div>
    </main>
  );
}