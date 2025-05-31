import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Octokit } from "@octokit/rest";
import Papa from "papaparse";

// Configuration
const GITHUB_OWNER = "captainminh1999"; // Replace
const GITHUB_REPO = "my-interactive-cv";    // Replace
const DATA_BASE_PATH = "src/data";          // Base path for data files in your repo
const COMMIT_MESSAGE_PREFIX = "Update CV data for section: ";
const GITHUB_BRANCH = "main";

// Helper function to convert header to camelCase
const toCamelCase = (str: string): string => {
  // Remove special characters, trim, handle spaces/underscores/hyphens
  let s = str
    .replace(/[^a-zA-Z0-9\s_-]/g, "") // Remove non-alphanumeric except space, underscore, hyphen
    .trim()
    .replace(/[\s_-]+(.)?/g, (_, c) => (c ? c.toUpperCase() : '')); // Convert to camelCase
  // Ensure first character is lowercase
  return s.charAt(0).toLowerCase() + s.slice(1);
};

// Define a mapping from section identifiers to filenames
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
  sectionIdentifier: string; // e.g., "experience", "profile"
  fileContentBase64: string; // Base64 encoded content of the CSV file
  fileName: string;          // Original name of the uploaded CSV file
  secretKey?: string;
}

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
  if (!targetJsonFile) {
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid section identifier." }) };
  }
  const fullFilePathInRepo = `${DATA_BASE_PATH}/${targetJsonFile}`;

  // Decode CSV content
  let csvContent: string;
  try {
    csvContent = Buffer.from(payload.fileContentBase64, 'base64').toString('utf-8');
  } catch (error) {
    console.error("Error decoding base64 content:", error);
    return { statusCode: 400, body: JSON.stringify({ message: "Bad Request: Invalid file content encoding." }) };
  }

  // Parse CSV to JSON
  let jsonData: any;
  try {
    const parseResult = Papa.parse(csvContent, {
      header: true, // Assumes first row of CSV is header
      skipEmptyLines: true,
      dynamicTyping: true, // Automatically convert numbers, booleans
      transformHeader: (header) => toCamelCase(header), // ADDED/MODIFIED THIS LINE
    });

    if (parseResult.errors.length > 0) {
      console.error("CSV Parsing errors:", parseResult.errors);
      // Depending on severity, you might want to return an error
      // For now, we'll proceed with the data if any was parsed.
    }
    jsonData = parseResult.data;

    // Special handling for "profile" or "about" if they should be single objects, not arrays
    // This assumes the CSV for these sections has only one data row (plus header)
    if ((payload.sectionIdentifier === "profile" || payload.sectionIdentifier === "about") && Array.isArray(jsonData) && jsonData.length > 0) {
      jsonData = jsonData[0];
    }


  } catch (error) {
    console.error("Error parsing CSV:", error);
    return { statusCode: 500, body: JSON.stringify({ message: "Error processing CSV file." }) };
  }

  const octokit = new Octokit({ auth: githubToken });
  const jsonContentForCommit = JSON.stringify(jsonData, null, 2); // Pretty print JSON

  try {
    let existingFileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner: GITHUB_OWNER, repo: GITHUB_REPO, path: fullFilePathInRepo, ref: GITHUB_BRANCH,
      });
      if (!Array.isArray(existingFile) && existingFile.type === "file") {
        existingFileSha = existingFile.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) throw error;
    }

    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: fullFilePathInRepo,
      message: `${COMMIT_MESSAGE_PREFIX}${payload.sectionIdentifier}`,
      content: Buffer.from(jsonContentForCommit).toString('base64'),
      sha: existingFileSha,
      branch: GITHUB_BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully processed CSV for section '${payload.sectionIdentifier}' and committed ${targetJsonFile}. New build triggered.` }),
    };
  } catch (error: any) {
    console.error("GitHub API Error:", error.message, error.response?.data);
    return { statusCode: 500, body: JSON.stringify({ message: "Error committing file to GitHub.", error: error.message }) };
  }
};

export { handler };