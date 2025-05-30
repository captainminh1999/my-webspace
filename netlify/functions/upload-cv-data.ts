import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { Octokit } from "@octokit/rest";

// Configuration for your repository and the file path
const GITHUB_OWNER = "captainminh1999"; // Replace with your GitHub username
const GITHUB_REPO = "my-interactive-cv";    // Replace with your repository name
const FILE_PATH = "src/data/cv-data.json";  // Path in your repo where CV data will be stored
const COMMIT_MESSAGE = "Update CV data via upload";
const GITHUB_BRANCH = "main"; // Or your default branch

interface UploadPayload {
  fileName: string;
  fileContentBase64: string; // Base64 encoded content of the JSON file
  secretKey?: string; // Optional: for basic protection
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
    };
  }

  const githubToken = process.env.GITHUB_PAT;
  if (!githubToken) {
    console.error("GitHub PAT not configured.");
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Server configuration error: Missing GitHub token." }),
    };
  }

  let payload: UploadPayload;
  try {
    if (!event.body) {
      throw new Error("Request body is empty.");
    }
    payload = JSON.parse(event.body) as UploadPayload;
  } catch (error) {
    console.error("Error parsing request body:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Invalid JSON payload." }),
    };
  }

  // Basic secret key protection (optional but recommended)
  const UPLOAD_SECRET_KEY = process.env.UPLOAD_SECRET_KEY;
  if (UPLOAD_SECRET_KEY && payload.secretKey !== UPLOAD_SECRET_KEY) {
    return {
      statusCode: 403,
      body: JSON.stringify({ message: "Forbidden: Invalid secret key." }),
    };
  }
  // If using a secret key, add UPLOAD_SECRET_KEY to your Netlify environment variables.


  if (!payload.fileContentBase64 || !payload.fileName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Bad Request: Missing file name or content." }),
    };
  }

  // Ensure the uploaded file is what we expect (e.g., cv-data.json)
  // You might want more robust validation based on fileName or content type
  if (payload.fileName !== "cv-data.json") {
       return {
           statusCode: 400,
           body: JSON.stringify({ message: "Bad Request: Invalid file name. Expected 'cv-data.json'." }),
       };
   }

  const octokit = new Octokit({ auth: githubToken });
  const fileContent = Buffer.from(payload.fileContentBase64, 'base64').toString('utf-8');

  try {
    // Try to get the existing file to get its SHA (required for updates)
    let existingFileSha: string | undefined;
    try {
      const { data: existingFile } = await octokit.repos.getContent({
        owner: GITHUB_OWNER,
        repo: GITHUB_REPO,
        path: FILE_PATH,
        ref: GITHUB_BRANCH,
      });
      if (!Array.isArray(existingFile) && existingFile.type === "file") {
        existingFileSha = existingFile.sha;
      }
    } catch (error: any) {
      if (error.status !== 404) { // If it's not a "file not found" error, rethrow
        throw error;
      }
      // File doesn't exist yet, that's fine, we'll create it.
    }

    // Create or update the file
    await octokit.repos.createOrUpdateFileContents({
      owner: GITHUB_OWNER,
      repo: GITHUB_REPO,
      path: FILE_PATH,
      message: COMMIT_MESSAGE,
      content: Buffer.from(fileContent).toString('base64'), // Content must be base64 encoded
      sha: existingFileSha, // Provide SHA if updating an existing file
      branch: GITHUB_BRANCH,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Successfully uploaded and committed ${payload.fileName}. A new build should be triggered.` }),
    };
  } catch (error: any) {
    console.error("GitHub API Error:", error.message);
    console.error("Error details:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error committing file to GitHub.", error: error.message }),
    };
  }
};

export { handler };
