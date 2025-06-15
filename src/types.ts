// src/types.ts

// Import React for icon type if needed, or define a more generic type
import type { ElementType } from 'react';

export interface ProfileData {
  firstName: string;
  lastName: string;
  maidenName?: string | null;
  address?: string | null;
  birthDate?: string | null; // Hidden
  headline: string;
  // summary is handled by AboutData
  industry?: string | null;   // Hidden
  zipCode?: string | number | null;
  geoLocation?: string | null;
  twitterHandles?: string | null;
  websites?: string | string[] | null; // Ideally string[] after function processing
  instantMessengers?: string | null;
}

export interface AboutData {
  /**
   * Legacy single-string summary used by older versions of the app.
   */
  content?: string | null;

  /**
   * New structured fields migrated from about.json
   */
  introduction?: string | null;
  topPrioritiesAndAchievements?: {
    context?: string | null;
    description: string;
  }[];
  additionalNotes?: string | null;
}

export interface RoleItem {
  title: string;
  startDate: string;
  endDate: string;
  duration?: string | null;
  responsibilities: string[];
  skills: string[];
  location?: string | null;
}

export interface CompanyExperience {
  companyName: string;
  employmentType?: string | null;
  totalDurationAtCompany?: string | null;
  location?: string | null;
  roles: RoleItem[];
}

export interface EducationEntry {
  schoolName: string;
  startDate: string | number; // Consider making this string after function ensures it
  endDate: string | number;   // Consider making this string after function ensures it
  degreeName?: string | null;
  notes?: string | null;
  activities?: string | null;
}

export interface LicenseCertificationEntry {
  name: string;
  authority: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  licenseNumber?: string | null;
  url?: string | null;
}

export interface ProjectEntry {
  title: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  description: string; // If can be empty, add | null
  url?: string | null;
}

export interface VolunteeringEntry {
  companyName: string;
  role: string;
  startedOn?: string | null;
  finishedOn?: string | null;
  cause?: string | null; // Stores transformed, display-friendly cause
  description?: string | null;
}

export type SkillsData = string[] | null;

export interface RecommendationReceivedEntry {
  firstName: string;
  lastName: string;
  jobTitle: string;
  company: string;
  text: string;
  creationDate: string;
}

export interface HonorAwardEntry {
  title: string;
  description?: string | null;
  issuedOn: string;
}

export interface LanguageEntry {
  name: string;
  proficiency: string;
}

export interface ParsedWebsite {
  label: string;
  url: string;
  icon?: ElementType; // Type for a React component (like an icon)
  siteName?: string; // Detected site name
}

export interface RecommendationGivenEntry {
  recipientFirstName: string;
  recipientLastName: string;
  recipientJobTitle: string;
  recipientCompany: string;
  text: string;
  creationDate: string;
}

export interface FullCvData {
  profile: ProfileData | null;
  about: AboutData | null;
  experience: CompanyExperience[];
  education: EducationEntry[];
  licenses: LicenseCertificationEntry[];
  projects: ProjectEntry[];
  volunteering: VolunteeringEntry[];
  skills: SkillsData;
  recommendationsGiven: RecommendationGivenEntry[];
  recommendationsReceived: RecommendationReceivedEntry[];
  honorsAwards: HonorAwardEntry[];
  languages: LanguageEntry[];
}
