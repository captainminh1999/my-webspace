// src/app/page.tsx
import React from 'react';
// Import icons from lucide-react
import { Github, Linkedin, Twitter, Facebook, Instagram, Dribbble, Link as LinkIcon, ExternalLink } from 'lucide-react';

// Import data from JSON files
import profileDataFromFile from '@/data/profile.json';
import aboutDataFromFile from '@/data/about.json';
import experienceDataFromFile from '@/data/experience.json';
import educationDataFromFile from '@/data/education.json';
import licensesDataFromFile from '@/data/licenses.json';
import projectsDataFromFile from '@/data/projects.json';
import volunteeringDataFromFile from '@/data/volunteering.json';
import skillsDataFromFile from '@/data/skills.json';
import recommendationsReceivedDataFromFile from '@/data/recommendationsReceived.json';
// Recommendations: Given is hidden for now
import honorsAwardsDataFromFile from '@/data/honorsAwards.json';
import languagesDataFromFile from '@/data/languages.json';

// --- TypeScript Interfaces ---
interface ProfileData {
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  address?: string | null;
  birthDate?: string | null; // Hidden
  headline: string;
  summary?: string | null;    // This populates about.json
  industry?: string | null;   // Hidden
  zipCode?: string | number | null;
  geoLocation?: string | null;
  twitterHandles?: string | null;
  websites?: string | string[] | null;
  instantMessengers?: string | null;
}

interface AboutData {
  content?: string | null;
}

interface RoleItem {
  title: string;
  startDate: string;
  endDate: string;
  duration?: string | null;
  responsibilities: string[];
  skills: string[];
  location?: string | null;
}

interface CompanyExperience {
  companyName: string;
  employmentType?: string | null;
  totalDurationAtCompany?: string | null;
  location?: string | null;
  roles: RoleItem[];
}

interface EducationEntry {
  schoolName: string;
  startDate: string | number;
  endDate: string | number;
  degreeName?: string | null;
  notes?: string | null;
  activities?: string | null;
}

interface LicenseCertificationEntry {
  name: string;
  authority: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  licenseNumber?: string | null;
  url?: string | null;
}

interface ProjectEntry {
  title: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  description: string;
  url?: string | null;
}

interface VolunteeringEntry {
  companyName: string;
  role: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  cause?: string | null;
  description?: string | null;
}

type SkillsData = string[] | null;

interface RecommendationReceivedEntry {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  text: string;
  creationDate: string;
}

interface HonorAwardEntry {
  title: string;
  description?: string | null;
  issuedOn: string;
}

interface LanguageEntry {
  name: string;
  proficiency: string;
}

// --- Helper functions ---
const getDisplayCause = (rawCause?: string | null): string => {
  if (!rawCause) return "N/A";
  const causeMap: { [key: string]: string } = {
    economicempowerment: "Economic Empowerment",
    scienceandtechnology: "Science and Technology",
  };
  const saneKey = rawCause.toLowerCase().replace(/[^a-z0-9]/g, '');
  return causeMap[saneKey] || rawCause.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

interface ParsedWebsite {
  label: string;
  url: string;
  icon?: React.ElementType; // Type for a React component (like an icon)
  siteName?: string; // Detected site name
}

const parseWebsiteString = (websiteStr?: string | null): ParsedWebsite | null => {
  if (typeof websiteStr !== 'string' || !websiteStr.trim()) return null;

  let explicitLabel: string | null = null;
  let urlPart = websiteStr.trim();

  const formattedMatch = websiteStr.match(/^\[(.*?):(.*?)\]$/);
  if (formattedMatch && formattedMatch[1] && formattedMatch[2]) {
    explicitLabel = formattedMatch[1].trim();
    urlPart = formattedMatch[2].trim();
  }

  if (!urlPart.startsWith('http://') && !urlPart.startsWith('https://')) {
    urlPart = 'https://' + urlPart;
  }

  try {
    const urlObj = new URL(urlPart);
    const hostname = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    let detectedSiteName: string | undefined;
    let icon: React.ElementType | undefined;

    if (hostname.includes('github.com')) {
      detectedSiteName = 'GitHub';
      icon = Github;
    } else if (hostname.includes('linkedin.com')) {
      detectedSiteName = 'LinkedIn';
      icon = Linkedin;
    } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      detectedSiteName = 'Twitter/X';
      icon = Twitter;
    } else if (hostname.includes('facebook.com')) {
      detectedSiteName = 'Facebook';
      icon = Facebook;
    } else if (hostname.includes('instagram.com')) {
      detectedSiteName = 'Instagram';
      icon = Instagram;
    } else if (hostname.includes('dribbble.com')) {
      detectedSiteName = 'Dribbble';
      icon = Dribbble;
    } else {
      icon = LinkIcon; // Default link icon
    }

    const finalLabel = explicitLabel || detectedSiteName || hostname.charAt(0).toUpperCase() + hostname.slice(1);

    return { label: finalLabel, url: urlPart, icon, siteName: detectedSiteName };

  } catch (e) {
    console.warn("Could not parse as URL:", websiteStr, e);
    // If it's not a valid URL but was explicitly labeled, maybe still show it?
    if (explicitLabel) {
        return { label: explicitLabel, url: urlPart, icon: LinkIcon };
    }
    return null;
  }
};


// --- Main Page Component ---
export default function HomePage() {
  const profileData = profileDataFromFile as ProfileData || {} as ProfileData;
  const aboutData = aboutDataFromFile as AboutData || {} as AboutData;
  const experienceData = experienceDataFromFile as CompanyExperience[] || [];
  const educationData = educationDataFromFile as EducationEntry[] || [];
  const licensesData = licensesDataFromFile as LicenseCertificationEntry[] || [];
  const projectsData = projectsDataFromFile as ProjectEntry[] || [];
  const volunteeringData = volunteeringDataFromFile as VolunteeringEntry[] || [];
  const skillsData = skillsDataFromFile as SkillsData || [];
  const recommendationsReceivedData = recommendationsReceivedDataFromFile as RecommendationReceivedEntry[] || [];
  const honorsAwardsData = honorsAwardsDataFromFile as HonorAwardEntry[] || [];
  const languagesData = languagesDataFromFile as LanguageEntry[] || [];

  const getFullName = () => {
    if (!profileData.firstName && !profileData.lastName) return "Your Name";
    let name = profileData.firstName || "";
    if (profileData.maidenName) {
      name += ` (${profileData.maidenName})`;
    }
    if (profileData.lastName) {
      name += ` ${profileData.lastName}`;
    }
    return name.trim();
  };
  const fullName = getFullName();

  const websiteEntries = React.useMemo(() => {
    if (!profileData.websites) {
      return [];
    }
    const websitesArray = Array.isArray(profileData.websites) ? profileData.websites : [profileData.websites];
    
    return websitesArray
      .map(siteStr => parseWebsiteString(siteStr))
      .filter(parsedSite => parsedSite !== null) as ParsedWebsite[];
  }, [profileData.websites]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-gray-100 dark:bg-gray-900 p-4 sm:p-8">
      <div className="w-full max-w-4xl space-y-12">
        {/* 1. Profile Section */}
        <header className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-800 dark:text-white mb-2">
            {fullName}
          </h1>
          {profileData.headline && (
            <p className="text-xl sm:text-2xl text-indigo-600 dark:text-indigo-400 mb-4">
              {profileData.headline}
            </p>
          )}
          <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1 px-4">
            {profileData.address && <p>{profileData.address}</p>}
            {(profileData.geoLocation || profileData.zipCode) && (
                <p>
                    {profileData.geoLocation}
                    {profileData.geoLocation && profileData.zipCode && `, `}
                    {profileData.zipCode}
                </p>
            )}
            {profileData.twitterHandles && <p>Twitter: <a href={`https://twitter.com/${profileData.twitterHandles.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline">{profileData.twitterHandles}</a></p>}
            
            {/* MODIFIED WEBSITES DISPLAY with ICONS */}
            {websiteEntries.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Links:</span>
                {websiteEntries.map((site, index) => {
                  const IconComponent = site.icon || LinkIcon; // Fallback to generic LinkIcon
                  return (
                    <a
                      key={index}
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150 transform hover:scale-105"
                      title={site.url} // Show full URL on hover
                    >
                      <IconComponent size={14} /> 
                      {site.label}
                    </a>
                  );
                })}
              </div>
            )}

            {profileData.instantMessengers && <p className="mt-2">{profileData.instantMessengers}</p>}
          </div>
        </header>

        {/* 2. About Section */}
        {aboutData?.content && (
          <Section title="About">
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-line">
              {aboutData.content}
            </p>
          </Section>
        )}

        {/* 3. Experience Section */}
        {experienceData && experienceData.length > 0 && (
          <Section title="Experience">
            {experienceData.map((companyExp, companyIndex) => (
              <div key={companyIndex} className="mb-8 last:mb-0">
                <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">{companyExp.companyName}</h3>
                {(companyExp.location || companyExp.employmentType || companyExp.totalDurationAtCompany) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    {companyExp.location}
                    {companyExp.employmentType && ` · ${companyExp.employmentType}`}
                    {companyExp.totalDurationAtCompany && ` · ${companyExp.totalDurationAtCompany}`}
                  </p>
                )}
                {companyExp.roles && companyExp.roles.map((role, roleIndex) => (
                  <div key={roleIndex} className="ml-4 mt-2 pb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                    <h4 className="text-xl font-medium text-gray-700 dark:text-white">{role.title}</h4>
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">
                      {String(role.startDate)} – {String(role.endDate)} {role.duration && `(${role.duration})`}
                    </p>
                    {role.location && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{role.location}</p>}
                    {role.responsibilities && role.responsibilities.length > 0 && (
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm space-y-1 mt-2">
                        {role.responsibilities.map((resp, respIndex) => (
                            <li key={respIndex}>{resp}</li>
                        ))}
                        </ul>
                    )}
                    {role.skills && role.skills.length > 0 && (
                      <div className="mt-3">
                        <strong className="text-xs font-semibold text-gray-700 dark:text-white uppercase">Skills: </strong>
                        <span className="text-xs text-gray-600 dark:text-gray-300">
                          {role.skills.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </Section>
        )}

        {/* 4. Education Section */}
        {educationData && educationData.length > 0 && (
          <Section title="Education">
            {educationData.map((edu, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{edu.schoolName}</h3>
                {edu.degreeName && <p className="text-md text-gray-700 dark:text-gray-300">{edu.degreeName}</p>}
                <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">{String(edu.startDate)} – {String(edu.endDate)}</p>
                {edu.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{edu.notes}</p>}
                {edu.activities && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1"><em>Activities:</em> {edu.activities}</p>}
              </div>
            ))}
          </Section>
        )}
        
        {/* 5. Licenses & Certifications Section */}
        {licensesData && licensesData.length > 0 && (
          <Section title="Licenses & Certifications">
            {licensesData.map((lic, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{lic.name}</h3>
                <p className="text-md text-gray-700 dark:text-gray-300">{lic.authority}</p>
                {(lic.startedOn || lic.finishedOn) && (
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">
                        Issued: {lic.startedOn}{lic.finishedOn && lic.startedOn ? ` - ${lic.finishedOn}` : lic.finishedOn || ''}
                    </p>
                )}
                {lic.licenseNumber && <p className="text-sm text-gray-600 dark:text-gray-300">Credential ID: {lic.licenseNumber}</p>}
                {lic.url && (
                  <a
                    href={lic.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-md shadow-sm hover:bg-indigo-700 transition duration-150"
                  >
                    <ExternalLink size={14} /> Show Credential
                  </a>
                )}
              </div>
            ))}
          </Section>
        )}

        {/* 6. Projects Section */}
        {projectsData && projectsData.length > 0 && (
          <Section title="Projects">
            {projectsData.map((proj, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{proj.title}</h3>
                {(proj.startedOn || proj.finishedOn) && (
                    <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">
                        {proj.startedOn}{proj.finishedOn && proj.startedOn ? ` - ${proj.finishedOn}` : proj.finishedOn || ''}
                    </p>
                )}
                {proj.description && <p className="text-sm text-gray-600 dark:text-gray-300 my-2 whitespace-pre-line">{proj.description}</p>}
                {proj.url && 
                  <a 
                    href={proj.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="inline-flex items-center gap-1 text-indigo-500 hover:underline text-sm"
                  >
                    <ExternalLink size={14} /> View Project
                  </a>
                }
              </div>
            ))}
          </Section>
        )}

        {/* 7. Volunteering Section */}
        {volunteeringData && volunteeringData.length > 0 && (
          <Section title="Volunteering">
            {volunteeringData.map((vol, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{vol.role}</h3>
                <p className="text-md text-gray-700 dark:text-gray-300">{vol.companyName}</p>
                {(vol.startedOn || vol.finishedOn) && (
                     <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">
                        {vol.startedOn}{vol.finishedOn && vol.startedOn ? ` - ${vol.finishedOn}` : vol.finishedOn || ''}
                    </p>
                )}
                {vol.cause && <p className="text-sm text-gray-600 dark:text-gray-300">Cause: {getDisplayCause(vol.cause)}</p>}
                {vol.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">{vol.description}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* 8. Skills Section */}
        {skillsData && skillsData.length > 0 && (
          <Section title="Skills">
            <div className="flex flex-wrap gap-2">
              {skillsData.map((skill, index) => (
                <span key={index} className="bg-indigo-100 dark:bg-indigo-700 text-indigo-700 dark:text-indigo-100 px-3 py-1 rounded-full text-sm font-medium">
                  {skill}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* 9. Recommendations: Received Section */}
        {recommendationsReceivedData && recommendationsReceivedData.length > 0 && (
          <Section title="Recommendations Received">
            {recommendationsReceivedData.map((rec, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <p className="text-gray-700 dark:text-gray-300 italic mb-2 whitespace-pre-line">&quot;{rec.text}&quot;</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-white">
                  {rec.firstName} {rec.lastName}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {rec.jobTitle} at {rec.company}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Received: {rec.creationDate}</p>
              </div>
            ))}
          </Section>
        )}

        {/* 10. Recommendations: Given - HIDDEN */}

        {/* 11. Honors & Awards Section */}
        {honorsAwardsData && honorsAwardsData.length > 0 && (
          <Section title="Honors & Awards">
            {honorsAwardsData.map((honor, index) => (
              <div key={index} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:pb-0">
                <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{honor.title}</h3>
                <p className="text-sm text-indigo-500 dark:text-indigo-400 mb-1">Issued: {honor.issuedOn}</p>
                {honor.description && <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-line">{honor.description}</p>}
              </div>
            ))}
          </Section>
        )}

        {/* 12. Languages Section */}
        {languagesData && languagesData.length > 0 && (
          <Section title="Languages">
            {languagesData.map((lang, index) => (
              <div key={index} className="mb-4 last:mb-0">
                <p className="text-md font-semibold text-gray-800 dark:text-white">{lang.name}: <span className="font-normal text-gray-700 dark:text-gray-300">{lang.proficiency}</span></p>
              </div>
            ))}
          </Section>
        )}

      </div>
    </main>
  );
}

// --- Reusable Section Component ---
interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ title, children }) => {
  return (
    <section className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-lg shadow-lg">
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-6 pb-2 border-b-2 border-indigo-500">
        {title}
      </h2>
      {children}
    </section>
  );
};
