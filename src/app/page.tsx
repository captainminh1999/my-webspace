// src/app/page.tsx (Example of how to use the data)
import cvDataFromFile from '@/data/cv-data.json'; // Assuming your tsconfig paths are set up for @/*
                                            // or use relative path: '../../data/cv-data.json'

// Define an interface for your CV data structure for type safety
interface CVData {
  name: string;
  title: string;
  summary: string;
  experience: Array<{
    company: string;
    role: string;
    period: string;
    description: string;
  }>;
  skills: string[];
}

// Type assertion if you are sure about the structure
const cvData = cvDataFromFile as CVData;

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-100 dark:bg-gray-900 p-8">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-2">
            {cvData.name}
          </h1>
          <p className="text-2xl text-indigo-600 dark:text-indigo-400">
            {cvData.title}
          </p>
        </header>

        <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-4">Summary</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {cvData.summary}
          </p>
        </section>

        <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-6">Experience</h2>
          {cvData.experience.map((exp, index) => (
            <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{exp.role}</h3>
              <p className="text-md text-indigo-500 dark:text-indigo-400 mb-1">{exp.company} | {exp.period}</p>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {exp.description}
              </p>
            </div>
          ))}
        </section>

        <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2">
            {cvData.skills.map((skill, index) => (
              <span key={index} className="bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 px-3 py-1 rounded-full text-sm font-medium">
                {skill}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}