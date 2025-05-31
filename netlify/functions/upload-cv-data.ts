// netlify/functions/upload-cv-data.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Octokit } from "@octokit/rest";
import Papa from "papaparse";

// Configuration
const GITHUB_OWNER = "captainminh1999"; // CORRECTED
const GITHUB_REPO = "my-interactive-cv";    // CORRECTED
const DATA_BASE_PATH = "src/data";
const GITHUB_BRANCH = "main";

const sectionFileMap: { [key: string]: string } = {
  profile: "profile.json",
  about: "about.json",
  experience: "experience.json",
  education: "education.json",
  licenses: "licenses.json",
  projects: "projects.json",
  volunteering: "volunteering.json",
  skills: "skills.json",
  recommendationsGiven: "recommendationsGiven.json",
  recommendationsReceived: "recommendationsReceived.json",
  honorsAwards: "honorsAwards.json",
  languages: "languages.json",
};

interface UploadPayload {
  sectionIdentifier: string;
  fileContentBase64: string;
  fileName: string;
  secretKey?: string;
}

const toCamelCase = (str: string): string => {
  if (!str) return "";
  let s = str
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return s.charAt(0).toLowerCase() + s.slice(1);
};

const transformCause = (rawCause?: string | null): string | null => {
  if (!rawCause) return null;
  const causeMap: { [key: string]: string } = {
    economicempowerment: "Economic Empowerment", // a bit more robust to spacing/casing
    scienceandtechnology: "Science and Technology",
    // Add more mappings
  };
  const SANE_KEY = rawCause.toLowerCase().replace(/[^a-z0-9]/g, '');
  return causeMap[SANE_KEY] || rawCause.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim();
};

// Recursive function to convert non-null, non-array, non-object primitives to strings
const convertPrimitivesToStrings = (data: any): any => {
  if (Array.isArray(data)) {
    return data.map(item => convertPrimitivesToStrings(item));
  } else if (typeof data === 'object' && data !== null) {
    const newData: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        newData[key] = convertPrimitivesToStrings(data[key]);
      }
    }
    return newData;
  } else if (data !== null && typeof data !== 'undefined') {
    // Convert numbers and booleans to strings. Strings remain strings.
    // Null and undefined are preserved.
    return String(data);
  }
  return data; // Preserve null and undefined
};


const commitFileToGitHub = async (
  octokit: Octokit,
  filePathInRepo: string,
  commitMessage: string,
  jsonContentForCommit: string
) => {
  let existingFileSha: string | undefined;
  try {
    const { data: existingFile } = await octokit.repos.getContent({
      owner: GITHUB_OWNER, repo: GITHUB_REPO, path: filePathInRepo, ref: GITHUB_BRANCH,
    });
    if (!Array.isArray(existingFile) && existingFile.type === "file") {
      existingFileSha = existingFile.sha;
    }
  } catch (error: any) {
    if (error.status !== 404) throw error;
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER, repo: GITHUB_REPO, path: filePathInRepo, message: commitMessage,
    content: Buffer.from(jsonContentForCommit).toString('base64'),
    sha: existingFileSha, branch: GITHUB_BRANCH,
  });
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ message: "Method Not Allowed" }) };
  }

  const githubToken = process.env.GITHUB_PAT;
  if (!githubToken) {
    console.error("GitHub PAT not configured.");
    return { statusCode: 500, body: JSON.stringify({ message: "Server configuration error: Missing GitHub token." }) };
  }

  let payload: UploadPayload;
  try {
    if (!event.body) throw new Error("Request body is empty.");
    payload = JSON.parse(event.body) as UploadPayload;
  } catch (error) {
    console.error("Error parsing request body:", error);
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid JSON payload." }) };
  }

  const UPLOAD_SECRET_KEY = process.env.UPLOAD_SECRET_KEY;
  if (UPLOAD_SECRET_KEY && payload.secretKey !== UPLOAD_SECRET_KEY) {
    return { statusCode: 403, body: JSON.stringify({ message: "Forbidden: Invalid secret key." }) };
  }

  if (!payload.sectionIdentifier || !payload.fileContentBase64 || !payload.fileName) {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Missing section, file name, or content." }) };
  }

  const targetJsonFileKey = sectionFileMap[payload.sectionIdentifier];
  if (!targetJsonFileKey && payload.sectionIdentifier !== "profile") {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid section identifier." }) };
  }

  let csvContent: string;
  try {
    csvContent = Buffer.from(payload.fileContentBase64, 'base64').toString('utf-8');
  } catch (error) {
    console.error("Error decoding base64 content:", error);
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid file content encoding." }) };
  }

  const octokit = new Octokit({ auth: githubToken });
  let finalJsonData: any;

  try {
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Still useful for initial type detection (esp. nulls, booleans)
      transformHeader: (header) => toCamelCase(header),
      transform: (value, header) => {
        // Convert empty strings to null for optional fields, but not for required ones.
        // This helps ensure `null` is used consistently for absence of optional data.
        const h = toCamelCase(header as string);
        const requiredStringFields = ['firstName', 'lastName', 'headline', 'title', 'name', 'authority', 'schoolName', 'startDate', 'endDate', 'text', 'creationDate', 'issuedOn', 'proficiency', 'description', 'role', 'companyName'];
        if (value === "" && !requiredStringFields.includes(h)) {
          return null;
        }
        return value;
      }
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV Parsing warnings/errors:", parseResult.errors);
    }
    let parsedData = parseResult.data as any[];

    // Apply universal primitive-to-string conversion AFTER initial parsing and specific transformations
    let processedData = convertPrimitivesToStrings(parsedData);


    if (payload.sectionIdentifier === "profile") {
      if (processedData.length === 0) throw new Error("Profile CSV is empty or invalid.");
      let profileObject = { ...processedData[0] };

      const summaryForAbout = profileObject.summary || ""; // summary is now string or null
      delete profileObject.summary;

      if (profileObject.websites && typeof profileObject.websites === 'string') {
        profileObject.websites = profileObject.websites.split(/[,;]/)
          .map((url: string) => url.trim())
          .filter((url: string) => url);
      } else if (!profileObject.websites) {
        profileObject.websites = []; // Ensure it's an array
      }
      // If websites elements are not strings after convertPrimitivesToStrings, they should be now.

      finalJsonData = profileObject;
      const profileFilePath = `${DATA_BASE_PATH}/${sectionFileMap.profile}`;
      const profileCommitMessage = `Update CV data for section: profile`;
      await commitFileToGitHub(octokit, profileFilePath, profileCommitMessage, JSON.stringify(finalJsonData, null, 2));

      const aboutFilePath = `${DATA_BASE_PATH}/${sectionFileMap.about}`;
      const aboutCommitMessage = `Update CV data for section: about (from profile summary)`;
      const aboutJsonData = { content: String(summaryForAbout) }; // Ensure content is string
      await commitFileToGitHub(octokit, aboutFilePath, aboutCommitMessage, JSON.stringify(aboutJsonData, null, 2));

      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Successfully processed Profile CSV. Updated profile.json and about.json. New build triggered.` }),
      };

    } else if (payload.sectionIdentifier === "skills") {
      finalJsonData = processedData.map((row: any) => String(row.skillName || Object.values(row)[0] || "")).filter(Boolean);
    } else if (payload.sectionIdentifier === "volunteering") {
      finalJsonData = processedData.map((item: any) => ({
        ...item,
        cause: transformCause(item.cause) // cause is already string or null from convertPrimitivesToStrings
      }));
    } else if (payload.sectionIdentifier === "experience") {
        const companies: { [key: string]: any } = {};
        processedData.forEach((row: any) => {
            const companyName = row.companyName; // Should be string from convertPrimitivesToStrings
            if (!companyName) return;

            if (!companies[companyName]) {
                companies[companyName] = {
                    companyName: companyName,
                    employmentType: row.employmentType || null,
                    totalDurationAtCompany: row.companyTotalDuration || row.totalDurationAtCompany || null,
                    location: row.companyLocation || row.location || null,
                    roles: []
                };
            }
            // Ensure responsibilities and skills within roles are arrays of strings
            let responsibilitiesArray = [];
            if (row.responsibilities) { // if responsibilities was a single string from CSV
                responsibilitiesArray = typeof row.responsibilities === 'string' ? 
                                        row.responsibilities.split(/[,;]/).map((s:string) => s.trim()).filter(Boolean) : 
                                        (Array.isArray(row.responsibilities) ? row.responsibilities.map(String) : []);
            } else { // if responsibilities were in columns like responsibility1, responsibility2
                 responsibilitiesArray = Object.keys(row)
                                    .filter(key => key.startsWith('responsibility') && row[key])
                                    .map(key => String(row[key]));
            }


            let skillsArray = [];
            if (row.skills && typeof row.skills === 'string') {
                skillsArray = row.skills.split(/[,;]/).map((s:string) => s.trim()).filter(Boolean);
            } else if (Array.isArray(row.skills)) {
                skillsArray = row.skills.map(String);
            }


            companies[companyName].roles.push({
                title: row.roleTitle || row.title,
                startDate: row.roleStartDate || row.startDate,
                endDate: row.roleEndDate || row.endDate,
                duration: row.roleDuration || row.duration || null,
                responsibilities: responsibilitiesArray,
                skills: skillsArray,
                location: row.roleLocation || null
            });
        });
        finalJsonData = Object.values(companies);
    } else {
      // For most sections that are arrays of objects or single objects
      if (processedData.length === 1 && (payload.sectionIdentifier === "about" /* if 'about' was its own CSV, not used now */)) {
        finalJsonData = processedData[0];
      } else {
        finalJsonData = processedData;
      }
    }

    const filePathInRepo = `${DATA_BASE_PATH}/${targetJsonFileKey}`;
    const commitMessage = `Update CV data for section: ${payload.sectionIdentifier}`;
    const jsonContentForCommit = JSON.stringify(finalJsonData, null, 2);
    await commitFileToGitHub(octokit, filePathInRepo, commitMessage, jsonContentForCommit);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully processed CSV for section '${payload.sectionIdentifier}' and committed ${targetJsonFileKey}. New build triggered.` }),
    };

  } catch (error: any) {
    console.error(`Error processing section ${payload.sectionIdentifier}:`, error.message, error.response?.data || error);
    return { statusCode: 500, body: JSON.stringify({ message: `Error processing CSV for section ${payload.sectionIdentifier}.`, error: error.message }) };
  }
};

export { handler };
