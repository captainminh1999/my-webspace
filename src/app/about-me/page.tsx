// src/app/about-me/page.tsx
import React from 'react';
import Link from 'next/link';
// Import icons from lucide-react that are used directly in this page's JSX
import { Link as LinkIcon, ExternalLink, ArrowLeft } from 'lucide-react';
// Note: Github, Linkedin, Twitter etc. are now imported in formatters.ts for parseWebsiteString

// Import shared types
import type {
  ProfileData, AboutData, CompanyExperience, EducationEntry,
  LicenseCertificationEntry, ProjectEntry, VolunteeringEntry,
  RecommendationReceivedEntry, HonorAwardEntry, LanguageEntry, ParsedWebsite
} from '@/types';

// Import shared helper functions
import {
  getDisplayCause,
  parseWebsiteString,
  formatTextWithLineBreaks
} from '@/utils/formatters';
import { normalizeSkillsArray } from '@/utils/cvData';

// Import the ExpandableText component
import ExpandableText from '@/components/ExpandableText'; // Assuming path is correct

// Import data from JSON files
import { getFullCv } from '@/lib/getFullCv';
import type { FullCvData } from '@/types';

// Predefined styles for the skill cloud for variety
const skillCloudStyles = [
  "text-base font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-4 py-2 rounded-2xl shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-default",
  "text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-3 py-1.5 rounded-md shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-default",
  "text-xs font-normal text-sky-700 dark:text-sky-300 bg-sky-100 dark:bg-sky-900/60 px-3 py-1 rounded-md shadow-sm hover:shadow transform hover:scale-105 transition-all duration-200 cursor-default",
  "text-sm font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-3.5 py-1.5 rounded-2xl shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-default",
  "text-base font-medium text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-4 py-1.5 rounded-md shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200 cursor-default",
  "text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-1 rounded-2xl shadow-sm hover:shadow transform hover:scale-105 transition-all duration-200 cursor-default",
];


// --- Main Page Component (Now for /about-me route) ---
export default async function AboutMePage() { // Renamed component for clarity
  const fullCv: FullCvData = await getFullCv();

  const profileData = fullCv.profile as ProfileData || ({} as ProfileData);
  const aboutData = fullCv.about as AboutData || ({} as AboutData);
  const experienceData = fullCv.experience as CompanyExperience[] || [];
  const educationData = fullCv.education as EducationEntry[] || [];
  const licensesData = fullCv.licenses as LicenseCertificationEntry[] || [];
  const projectsData = fullCv.projects as ProjectEntry[] || [];
  const volunteeringData = fullCv.volunteering as VolunteeringEntry[] || [];
  const skillsData: string[] = normalizeSkillsArray(fullCv.skills);
  const recommendationsReceivedData = fullCv.recommendationsReceived as RecommendationReceivedEntry[] || [];
  const honorsAwardsData = fullCv.honorsAwards as HonorAwardEntry[] || [];
  const languagesData = fullCv.languages as LanguageEntry[] || [];

  const getFullName = () => { 
    if (!profileData.firstName && !profileData.lastName) return "Your Name";
    let name = profileData.firstName || "";
    if (profileData.maidenName) { name += ` (${profileData.maidenName})`; }
    if (profileData.lastName) { name += ` ${profileData.lastName}`; }
    return name.trim();
  };
  const fullName = getFullName();

  const websiteEntries = profileData.websites
    ? (Array.isArray(profileData.websites) ? profileData.websites : [profileData.websites])
        .map(siteStr => parseWebsiteString(siteStr))
        .filter((parsedSite): parsedSite is ParsedWebsite => parsedSite !== null)
    : [];

  const MAX_ITEMS_MAIN_PAGE = 3;
  const DESCRIPTION_LINE_CLAMP = 2; 

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-12">
        {/* Back to Daily Dash Link */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-black dark:text-white hover:underline transition-colors duration-150 group"
          >
            <ArrowLeft size={20} className="mr-2 transition-transform duration-150 group-hover:-translate-x-1" />
            Back to Daily Dash
          </Link>
        </div>
        {/* 1. Profile Section (Fully displayed) */}
        <header className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-white mb-2">{fullName}</h1>
          {profileData.headline && <p className="text-xl sm:text-2xl text-indigo-600 dark:text-indigo-400 mb-4">{profileData.headline}</p>}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 px-4">
            {profileData.address && <p>{profileData.address}</p>}
            {(profileData.geoLocation || profileData.zipCode) && <p>{profileData.geoLocation}{profileData.geoLocation && profileData.zipCode && `, `}{profileData.zipCode}</p>}
            {profileData.twitterHandles && <p>Twitter: <a href={`https://twitter.com/${profileData.twitterHandles.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-black dark:text-white hover:underline">{profileData.twitterHandles}</a></p>}
            {websiteEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Links:</span>
                {websiteEntries.map((site, index) => {
                  const IconComponent = site.icon || LinkIcon; 
                  return (<a key={index} href={site.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-black dark:text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-600 transition duration-150 transform hover:scale-105" title={site.url}><IconComponent size={14} />{site.label}</a>);
                })}
              </div>
            )}
            {profileData.instantMessengers && <p className="mt-2">{profileData.instantMessengers}</p>}
          </div>
        </header>

        {/* 2. About Section (Fully displayed, uses ExpandableText) */}
        {aboutData?.content && (
          <Section title="About">
            <ExpandableText text={formatTextWithLineBreaks(aboutData.content)} lineClamp={5} className="text-gray-700 dark:text-gray-300 leading-relaxed" />
          </Section>
        )}

        {/* 3. Experience Section (Top 3 + Show All Button) */}
        {experienceData && experienceData.length > 0 && (
          <Section title="Experience">
            {experienceData.slice(0, MAX_ITEMS_MAIN_PAGE).map((companyExp, companyIndex) => (
              <div key={companyIndex} className="mb-8 last:mb-0">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">{companyExp.companyName}</h3>
                {(companyExp.location || companyExp.employmentType || companyExp.totalDurationAtCompany) && <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{companyExp.location}{companyExp.employmentType && ` · ${companyExp.employmentType}`}{companyExp.totalDurationAtCompany && ` · ${companyExp.totalDurationAtCompany}`}</p>}
                {companyExp.roles && companyExp.roles.map((role, roleIndex) => (
                  <div key={roleIndex} className="ml-4 mt-2 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h4 className="text-xl font-medium text-gray-700 dark:text-white">{role.title}</h4>
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">{String(role.startDate)} – {String(role.endDate)} {role.duration && `(${role.duration})`}</p>
                    {role.location && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{role.location}</p>}
                    {role.responsibilities && role.responsibilities.length > 0 && (
                        <div className="text-gray-600 dark:text-gray-300 text-sm space-y-0 mt-2">
                        {role.responsibilities.map((resp, respIndex) => (
                            <ExpandableText key={respIndex} text={formatTextWithLineBreaks(resp)} lineClamp={DESCRIPTION_LINE_CLAMP} className="mb-1"/>
                        ))}
                        </div>
                    )}
                    {role.skills && role.skills.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-xs font-semibold text-gray-700 dark:text-white uppercase">Skills: </strong>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {normalizeSkillsArray(role.skills).join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
            {experienceData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={experienceData.length} sectionName="Experiences" sectionPath="/about-me/experience" /> 
            )}
          </Section>
        )}

        {/* 4. Education Section (Top 3 + Show All Button) */}
        {educationData && educationData.length > 0 && (
          <Section title="Education">
            {educationData.slice(0, MAX_ITEMS_MAIN_PAGE).map((edu, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{edu.schoolName}</h3>
                {edu.degreeName && <p className="text-md text-gray-700 dark:text-gray-300">{edu.degreeName}</p>}
                <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">{String(edu.startDate)} – {String(edu.endDate)}</p>
                {edu.notes && <ExpandableText text={formatTextWithLineBreaks(edu.notes)} lineClamp={DESCRIPTION_LINE_CLAMP} className="text-sm text-gray-600 dark:text-gray-300 mt-1"/>}
                {edu.activities && <div className="mt-1"><em className="text-sm text-gray-500 dark:text-gray-400">Activities: </em><ExpandableText text={formatTextWithLineBreaks(edu.activities)} lineClamp={DESCRIPTION_LINE_CLAMP} className="text-sm text-gray-600 dark:text-gray-300 inline"/></div>}
              </div>
            ))}
            {educationData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={educationData.length} sectionName="Education Entries" sectionPath="/about-me/education" /> 
            )}
          </Section>
        )}

        {/* 5. Licenses & Certifications (Top 3 + Show All Button) */}
        {licensesData && licensesData.length > 0 && (
          <Section title="Licenses & Certifications">
            {licensesData.slice(0, MAX_ITEMS_MAIN_PAGE).map((lic, index) => (
                 <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{lic.name}</h3>
                    <p className="text-md text-gray-700 dark:text-gray-300">{lic.authority}</p>
                    {(lic.startedOn || lic.finishedOn) && <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">Issued: {lic.startedOn}{lic.finishedOn && lic.startedOn ? ` - ${lic.finishedOn}` : lic.finishedOn || ''}</p>}
                    {lic.licenseNumber && <p className="text-sm text-gray-600 dark:text-gray-300">Credential ID: {lic.licenseNumber}</p>}
                    {lic.url && <a href={lic.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-black dark:text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150"><ExternalLink size={14} /> Show Credential</a>}
                </div>
            ))}
            {licensesData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={licensesData.length} sectionName="Licenses & Certifications" sectionPath="/about-me/licenses" /> 
            )}
          </Section>
        )}

        {/* 6. Projects (Top 3 + Show All Button) */}
        {projectsData && projectsData.length > 0 && (
          <Section title="Projects">
            {projectsData.slice(0, MAX_ITEMS_MAIN_PAGE).map((proj, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{proj.title}</h3>
                    {(proj.startedOn || proj.finishedOn) && <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">{proj.startedOn}{proj.finishedOn && proj.startedOn ? ` - ${proj.finishedOn}` : proj.finishedOn || ''}</p>}
                    {proj.description && <ExpandableText text={formatTextWithLineBreaks(proj.description)} lineClamp={DESCRIPTION_LINE_CLAMP} className="text-sm text-gray-600 dark:text-gray-300 my-2"/>}
                    {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-black dark:text-white hover:underline text-sm mt-2"><ExternalLink size={14} /> View Project</a>}
                </div>
            ))}
            {projectsData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={projectsData.length} sectionName="Projects" sectionPath="/about-me/projects" /> 
            )}
          </Section>
        )}

        {/* 7. Volunteering (Top 3 + Show All Button) */}
        {volunteeringData && volunteeringData.length > 0 && (
          <Section title="Volunteering">
            {volunteeringData.slice(0, MAX_ITEMS_MAIN_PAGE).map((vol, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{vol.role}</h3>
                    <p className="text-md text-gray-700 dark:text-gray-300">{vol.companyName}</p>
                    {(vol.startedOn || vol.finishedOn) && <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">{vol.startedOn}{vol.finishedOn && vol.startedOn ? ` - ${vol.finishedOn}` : vol.finishedOn || ''}</p>}
                    {vol.cause && <p className="text-sm text-gray-600 dark:text-gray-300">{getDisplayCause(vol.cause)}</p>}
                    {vol.description && <ExpandableText text={formatTextWithLineBreaks(vol.description)} lineClamp={DESCRIPTION_LINE_CLAMP} className="text-sm text-gray-600 dark:text-gray-300 mt-1"/>}
                </div>
            ))}
            {volunteeringData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={volunteeringData.length} sectionName="Volunteering Activities" sectionPath="/about-me/volunteering" /> 
            )}
          </Section>
        )}

        {/* 8. Skills Section (Skill Cloud) */}
        {skillsData && skillsData.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap justify-center items-center gap-x-3 gap-y-4 p-4 -m-2"> 
              {skillsData.map((skill, index) => (
                <span 
                  key={index} 
                  className={skillCloudStyles[index % skillCloudStyles.length]} 
                >
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* 9. Recommendations: Received (Top 3 + Show All Button) */}
        {recommendationsReceivedData && recommendationsReceivedData.length > 0 && (
          <Section title="Recommendations Received">
            {recommendationsReceivedData.slice(0, MAX_ITEMS_MAIN_PAGE).map((rec, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <ExpandableText text={`"${formatTextWithLineBreaks(rec.text)}"`} lineClamp={DESCRIPTION_LINE_CLAMP + 1} className="text-gray-700 dark:text-gray-300 italic mb-2"/>
                    <p className="text-sm font-semibold text-gray-800 dark:text-white mt-2">{rec.firstName} {rec.lastName}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{rec.jobTitle} at {rec.company}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Received: {rec.creationDate}</p>
                </div>
            ))}
            {recommendationsReceivedData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={recommendationsReceivedData.length} sectionName="Recommendations" sectionPath="/about-me/recommendations" /> 
            )}
          </Section>
        )}

        {/* 10. Recommendations: Given - HIDDEN */}

        {/* 11. Honors & Awards (Top 3 + Show All Button) */}
        {honorsAwardsData && honorsAwardsData.length > 0 && (
          <Section title="Honors & Awards">
            {honorsAwardsData.slice(0, MAX_ITEMS_MAIN_PAGE).map((honor, index) => (
                <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{honor.title}</h3>
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">Issued: {honor.issuedOn}</p>
                    {honor.description && <ExpandableText text={formatTextWithLineBreaks(honor.description)} lineClamp={DESCRIPTION_LINE_CLAMP} className="text-sm text-gray-600 dark:text-gray-300 mt-1"/>}
                </div>
            ))}
            {honorsAwardsData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={honorsAwardsData.length} sectionName="Honors & Awards" sectionPath="/about-me/honors-awards" /> 
            )}
          </Section>
        )}

        {/* 12. Languages (Top 3 + Show All Button) */}
        {languagesData && languagesData.length > 0 && (
          <Section title="Languages">
            {languagesData.slice(0, MAX_ITEMS_MAIN_PAGE).map((lang, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <p className="text-md font-semibold text-gray-800 dark:text-white">{lang.name}: <span className="font-normal text-gray-700 dark:text-gray-300">{lang.proficiency}</span></p>
              </div>
            ))}
            {languagesData.length > MAX_ITEMS_MAIN_PAGE && (
              <ShowAllButton count={languagesData.length} sectionName="Languages" sectionPath="/about-me/languages" /> 
            )}
          </Section>
        )}

      </div>
    </main>
  );
}

// --- Reusable Section Component ---
interface SectionProps { title: string; children: React.ReactNode; }
const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 pb-2 border-b-2 border-indigo-500">{title}</h2>
      {children}
    </section>
  );
};

// --- Reusable ShowAllButton Component ---
interface ShowAllButtonProps {
  count: number;
  sectionName: string;
  sectionPath: string;
}
const ShowAllButton: React.FC<ShowAllButtonProps> = ({ count, sectionName, sectionPath }) => {
  return (
    <div className="mt-6 text-center">
      <Link
        href={sectionPath}
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 dark:text-indigo-300 dark:bg-indigo-800 dark:hover:bg-indigo-700 transition-colors duration-150"
      >
        Show all {count} {sectionName.toLowerCase()}
      </Link>
    </div>
  );
};
