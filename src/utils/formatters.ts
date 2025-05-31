// src/utils/formatters.ts
import { Github, Linkedin, Twitter, Link as LinkIcon } from 'lucide-react';
import type { ElementType } from 'react'; // For ParsedWebsite icon type
import type { ParsedWebsite } from '@/types'; // Import ParsedWebsite interface

export const getDisplayCause = (rawCause?: string | null): string => {
  if (!rawCause) return "N/A";
  const causeMap: { [key: string]: string } = {
    economicempowerment: "Economic Empowerment",
    scienceandtechnology: "Science and Technology",
    // Add more mappings as needed
  };
  const saneKey = rawCause.toLowerCase().replace(/[^a-z0-9]/g, '');
  return causeMap[saneKey] || rawCause.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (str) => str.toUpperCase()).trim();
};

export const parseWebsiteString = (websiteStr?: string | null): ParsedWebsite | null => {
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
    let icon: ElementType | undefined;

    if (hostname.includes('github.com')) {
      detectedSiteName = 'GitHub';
      icon = Github;
    } else if (hostname.includes('linkedin.com')) {
      detectedSiteName = 'LinkedIn';
      icon = Linkedin;
    } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      detectedSiteName = 'Twitter/X';
      icon = Twitter;
    } else {
      // For other known sites, you can add more else if blocks here
      // e.g., Facebook, Instagram, Behance, Dribbble if you re-add those icons
      icon = LinkIcon; // Default link icon
    }

    const finalLabel = explicitLabel || detectedSiteName || hostname.charAt(0).toUpperCase() + hostname.slice(1);

    return { label: finalLabel, url: urlPart, icon, siteName: detectedSiteName };

  } catch (e) {
    console.warn("Could not parse as URL:", websiteStr, e);
    if (explicitLabel) {
        return { label: explicitLabel, url: urlPart, icon: LinkIcon };
    }
    return null;
  }
};

export const formatTextWithLineBreaks = (text?: string | null): string => {
  if (!text) return "";
  const parts = text.split(/â€¢|•/g);
  if (parts.length > 1) {
    return parts.map((part, index) => {
      const trimmedPart = part.trim();
      if (index === 0 && trimmedPart === "") { 
        return ""; 
      }
      if (trimmedPart === "") return ""; 
      return (index === 0 && !text.match(/^\s*[â€¢•]/) ? "" : "• ") + trimmedPart;
    }).filter(Boolean).join('\n');
  }
  return text.trim();
};
