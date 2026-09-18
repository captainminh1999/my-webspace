// src/utils/formatters.ts
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

  // "[Label:url]" form, as written by the profile upload
  const formattedMatch = websiteStr.match(/^\[(.*?):(.*?)\]$/);
  if (formattedMatch && formattedMatch[1] && formattedMatch[2]) {
    explicitLabel = formattedMatch[1].trim();
    urlPart = formattedMatch[2].trim();
  }

  if (!urlPart.startsWith('http://') && !urlPart.startsWith('https://')) {
    urlPart = 'https://' + urlPart;
  }

  try {
    const hostname = new URL(urlPart).hostname.toLowerCase().replace(/^www\./, '');
    let detectedSiteName: string | undefined;
    if (hostname.includes('github.com')) detectedSiteName = 'GitHub';
    else if (hostname.includes('linkedin.com')) detectedSiteName = 'LinkedIn';
    else if (hostname.includes('twitter.com') || hostname.includes('x.com')) detectedSiteName = 'Twitter/X';

    const finalLabel = explicitLabel || detectedSiteName || hostname.charAt(0).toUpperCase() + hostname.slice(1);
    return { label: finalLabel, url: urlPart, siteName: detectedSiteName };
  } catch (e) {
    console.warn("Could not parse as URL:", websiteStr, e);
    return explicitLabel ? { label: explicitLabel, url: urlPart } : null;
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
