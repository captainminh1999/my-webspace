// src/app/page.tsx (Example)

interface RoleItem {
  title: string;
  startDate: string;
  endDate: string;
  duration: string;
  responsibilities: string[];
  skills: string[];
}

interface CompanyExperience {
  companyName: string;
  employmentType?: string; // Optional, as not all entries might have it (e.g., Dan Phuong Highschool)
  totalDurationAtCompany?: string; // Optional
  location?: string; // Optional
  roles: RoleItem[];
}

import profileDataFromFile from '@/data/profile.json';
import experienceDataFromFile from '@/data/experience.json';
import skillsDataFromFile from '@/data/skills.json';
// ... import other sections as needed

// Define interfaces for each section's data structure
interface ProfileData { name?: string; title?: string; summary?: string; /* ... */ }
interface ExperienceItem { company: string; role: string; period: string; description: string; }
interface SkillsData { skills_list: string[]; /* Example if skills.csv becomes {skills_list: [...]} */ }
// Or if skills.csv directly becomes an array of skill objects:
// interface Skill { name: string; proficiency?: string; }
// type SkillsData = Skill[];


const profileData = profileDataFromFile as ProfileData;
const experienceData = experienceDataFromFile as CompanyExperience[];
// Adjust how skillsData is typed and accessed based on its expected JSON structure from CSV
// For simplicity, let's assume skills.json will be an array of strings if CSV is just one column of skills
// Or an array of objects if CSV has headers like 'skillName', 'category'
const skillsData = skillsDataFromFile as string[]; // Example: if skills.json is ["JS", "React"]

export default function HomePage() {
  // Ensure data exists before trying to access properties
  const displayName = profileData?.name || "Your Name";
  const displayTitle = profileData?.title || "Your Title";

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-100 dark:bg-gray-900 p-8">
      <div className="w-full max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-2">
            {displayName}
          </h1>
          <p className="text-2xl text-indigo-600 dark:text-indigo-400">
            {displayTitle}
          </p>
        </header>

        {profileData?.summary && (
          <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-4">Summary</h2>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {profileData.summary}
            </p>
          </section>
        )}

{experienceData && experienceData.length > 0 && (
  <section className="mb-10 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
    <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-6">Experience</h2>
    {experienceData.map((companyExp, companyIndex) => (
      <div key={companyIndex} className="mb-8 last:mb-0">
        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{companyExp.companyName}</h3>
        {companyExp.location && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            {companyExp.location}
            {companyExp.employmentType && ` · ${companyExp.employmentType}`}
            {companyExp.totalDurationAtCompany && ` · ${companyExp.totalDurationAtCompany}`}
          </p>
        )}

        {companyExp.roles.map((role, roleIndex) => (
          <div key={roleIndex} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
            <h4 className="text-xl font-semibold text-gray-800 dark:text-white">{role.title}</h4>
            <p className="text-md text-indigo-500 dark:text-indigo-400 mb-1">
              {role.startDate} – {role.endDate} ({role.duration})
            </p>
            <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm space-y-1">
              {role.responsibilities.map((resp, respIndex) => (
                <li key={respIndex}>{resp}</li>
              ))}
            </ul>
            {role.skills && role.skills.length > 0 && (
              <div className="mt-3">
                <strong className="text-sm font-medium text-gray-700 dark:text-white">Skills: </strong>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {role.skills.join(' · ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    ))}
  </section>
)}

        {skillsData && skillsData.length > 0 && (
          <section className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-3xl font-semibold text-gray-700 dark:text-white mb-4">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {skillsData.map((skill, index) => (
                <span key={index} className="bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 px-3 py-1 rounded-full text-sm font-medium">
                  {typeof skill === 'string' ? skill : (skill as any).name /* Adjust if skill is object */}
                </span>
              ))}
            </div>
          </section>
        )}
        {/* Add other sections similarly */}
      </div>
    </main>
  );
}
