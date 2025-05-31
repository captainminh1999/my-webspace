// netlify/functions/upload-cv-data.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Octokit } from "@octokit/rest";
import Papa from "papaparse";

// Configuration
const GITHUB_OWNER = "your-github-username"; // Replace
const GITHUB_REPO = "my-interactive-cv";    // Replace
const DATA_BASE_PATH = "src/data";          // Base path for data files in your repo
const GITHUB_BRANCH = "main";

// Define a mapping from section identifiers to filenames
const sectionFileMap: { [key: string]: string } = {
  profile: "profile.json", // Profile CSV will also populate about.json
  about: "about.json",     // Populated by profile.csv's summary
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

// Helper function to convert header to camelCase
const toCamelCase = (str: string): string => {
  if (!str) return "";
  // Remove special characters, trim, handle spaces/underscores/hyphens
  let s = str
    .replace(/[^a-zA-Z0-9\s_-]/g, "")
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ''));
  return s.charAt(0).toLowerCase() + s.slice(1);
};

// Helper to transform volunteering cause
const transformCause = (rawCause?: string | null): string | null => {
  if (!rawCause) return null;
  const causeMap: { [key: string]: string } = {
    economicEmpowerment: "Economic Empowerment",
    scienceAndTechnology: "Science and Technology",
    // Add more mappings from your cv_data_structures_v2
  };
  return causeMap[rawCause.toLowerCase().replace(/\s+/g, '')] || rawCause.replace(/([A-Z0-9])/g, ' $1').replace(/^./, (char) => char.toUpperCase()).trim();
};


// Helper to commit file to GitHub
const commitFileToGitHub = async (
  octokit: Octokit,
  filePathInRepo: string,
  commitMessage: string,
  jsonContentForCommit: string
) => {
  let existingFileSha: string | undefined;
  try {
    const { data: existingFile } = await octokit.repos.getContent({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: filePathInRepo,
      ref: GITHUB_BRANCH,
    });
    if (!Array.isArray(existingFile) && existingFile.type === "file") {
      existingFileSha = existingFile.sha;
    }
  } catch (error: any) {
    if (error.status !== 404) throw error; // If not "file not found", rethrow
  }

  await octokit.repos.createOrUpdateFileContents({
    owner: GITHUB_OWNER,
    repo: GITHUB_REPO,
    path: filePathInRepo,
    message: commitMessage,
    content: Buffer.from(jsonContentForCommit).toString('base64'),
    sha: existingFileSha,
    branch: GITHUB_BRANCH,
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

  const targetJsonFile = sectionFileMap[payload.sectionIdentifier];
  if (!targetJsonFile && payload.sectionIdentifier !== "profile") { // Profile is special
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
  let jsonDataToCommit: any;
  let commitMessage = `Update CV data for section: ${payload.sectionIdentifier}`;
  let filePathInRepo = `${DATA_BASE_PATH}/${targetJsonFile}`;

  try {
    const parseResult = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Be mindful of this for types like zipCode
      transformHeader: (header) => toCamelCase(header),
      transform: (value, header) => { // Handle empty strings as null for better type alignment
        const h = toCamelCase(header as string);
        if (value === "" && 
            (h !== 'firstName' && h !== 'lastName' && h !== 'headline' && h !== 'title' && h !== 'name' && h !== 'authority' && h !== 'schoolName' && h !== 'startDate' && h !== 'endDate' && h !== 'text' && h !== 'creationDate' && h !== 'issuedOn' && h !== 'proficiency' && h !== 'description' && h !== 'role' && h !== 'companyName' ) // list required string fields
        ) { 
          return null; 
        }
        return value;
      }
    });

    if (parseResult.errors.length > 0) {
      console.warn("CSV Parsing warnings/errors:", parseResult.errors);
      // Decide if any errors are critical enough to stop processing
    }
    let parsedData = parseResult.data as any[];

    // Section-specific processing
    if (payload.sectionIdentifier === "profile") {
      if (parsedData.length === 0) throw new Error("Profile CSV is empty or invalid.");
      let profileObject = { ...parsedData[0] }; // Assuming profile data is the first row

      // Extract summary for about.json
      const summaryForAbout = profileObject.summary || "";
      delete profileObject.summary; // Remove summary from profileObject as it goes to about.json

      // Process websites into an array
      if (profileObject.websites && typeof profileObject.websites === 'string') {
        profileObject.websites = profileObject.websites.split(/[,;]/) // Split by comma or semicolon
          .map((url: string) => url.trim())
          .filter((url: string) => url);
      } else if (!profileObject.websites) {
        profileObject.websites = [];
      }
      
      // Ensure zipCode is string if it was parsed as number and interface expects string or number
      if (profileObject.zipCode && typeof profileObject.zipCode === 'number') {
         // Keep as number if interface allows, or profileObject.zipCode = String(profileObject.zipCode);
      }


      jsonDataToCommit = profileObject; // This is for profile.json
      filePathInRepo = `${DATA_BASE_PATH}/${sectionFileMap.profile}`;
      commitMessage = `Update CV data for section: profile`;
      await commitFileToGitHub(octokit, filePathInRepo, commitMessage, JSON.stringify(jsonDataToCommit, null, 2));

      // Now handle about.json
      const aboutFilePath = `${DATA_BASE_PATH}/${sectionFileMap.about}`;
      const aboutCommitMessage = `Update CV data for section: about (from profile summary)`;
      const aboutJsonData = { content: summaryForAbout };
      await commitFileToGitHub(octokit, aboutFilePath, aboutCommitMessage, JSON.stringify(aboutJsonData, null, 2));

      return {
        statusCode: 200,
        body: JSON.stringify({ message: `Successfully processed Profile CSV. Updated profile.json and about.json. New build triggered.` }),
      };

    } else if (payload.sectionIdentifier === "skills") {
      // Assuming skills CSV has one column (e.g., "skillName") or multiple skills in one cell needs different logic
      jsonDataToCommit = parsedData.map(row => row.skillName || Object.values(row)[0]).filter(Boolean); // Takes value from 'skillName' or first column
    } else if (payload.sectionIdentifier === "volunteering") {
      jsonDataToCommit = parsedData.map(item => ({
        ...item,
        cause: transformCause(item.cause)
      }));
    } else if (payload.sectionIdentifier === "experience") {
        // Attempt to group roles by company for the nested structure
        const companies: { [key: string]: any } = {};
        parsedData.forEach(row => {
            const companyName = row.companyName;
            if (!companyName) return; // Skip rows without company name

            if (!companies[companyName]) {
                companies[companyName] = {
                    companyName: companyName,
                    employmentType: row.employmentType || null,
                    totalDurationAtCompany: row.companyTotalDuration || row.totalDurationAtCompany || null, // CSV might have companyTotalDuration
                    location: row.companyLocation || row.location || null, // CSV might have companyLocation
                    roles: []
                };
            }
            companies[companyName].roles.push({
                title: row.roleTitle || row.title, // CSV might have roleTitle
                startDate: row.roleStartDate || row.startDate,
                endDate: row.roleEndDate || row.endDate,
                duration: row.roleDuration || row.duration || null,
                responsibilities: Object.keys(row) // Simple way to get all resp. Needs better CSV structure
                                    .filter(key => key.startsWith('responsibility') && row[key])
                                    .map(key => row[key]),
                skills: (row.skills && typeof row.skills === 'string') ? row.skills.split(/[,;]/).map((s:string) => s.trim()).filter(Boolean) : [],
                location: row.roleLocation || null
            });
        });
        jsonDataToCommit = Object.values(companies);

    } else {
      // For most sections that are arrays of objects (Education, Licenses, Projects etc.)
      // or single objects if CSV has one data row (e.g. if 'about' was separate)
      if (parsedData.length === 1 && (payload.sectionIdentifier === "about" /* if 'about' was its own CSV */)) {
        jsonDataToCommit = parsedData[0];
      } else {
        jsonDataToCommit = parsedData;
      }
    }

    // Commit the main section file (for non-profile sections)
    const jsonContentForCommit = JSON.stringify(jsonDataToCommit, null, 2);
    await commitFileToGitHub(octokit, filePathInRepo, commitMessage, jsonContentForCommit);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully processed CSV for section '${payload.sectionIdentifier}' and committed ${targetJsonFile}. New build triggered.` }),
    };

  } catch (error: any) {
    console.error(`Error processing section ${payload.sectionIdentifier}:`, error.message, error.response?.data || error);
    return { statusCode: 500, body: JSON.stringify({ message: `Error processing CSV for section ${payload.sectionIdentifier}.`, error: error.message }) };
  }
};

export { handler };
