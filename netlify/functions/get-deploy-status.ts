// netlify/functions/get-deploy-status.ts
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// If you installed node-fetch because your Node version for functions might be older:
// import fetch from 'node-fetch'; 
// Otherwise, global fetch should be available in modern Node.js environments used by Netlify.

const NETLIFY_API_PAT = process.env.NETLIFY_API_PAT;
const NETLIFY_SITE_ID = process.env.SITE_ID; // Automatically available in Netlify build/functions

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== "GET") {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    };
  }

  if (!NETLIFY_API_PAT) {
    console.error("Netlify API PAT (NETLIFY_API_PAT) not configured in environment variables.");
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: "Server configuration error: Missing Netlify API token." }),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    };
  }

  if (!NETLIFY_SITE_ID) {
    console.error("Netlify Site ID (SITE_ID) not available in environment variables.");
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: "Server configuration error: Missing Netlify Site ID." }),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    };
  }

  // Fetch only the latest deploy to be efficient
  const url = `https://api.netlify.com/api/v1/sites/${NETLIFY_SITE_ID}/deploys?per_page=1`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${NETLIFY_API_PAT}`,
        'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60'
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to fetch deploys from Netlify API:", response.status, response.statusText, errorText);
      return { 
        statusCode: response.status, 
        body: JSON.stringify({ message: "Failed to fetch deploy status from Netlify.", errorDetails: errorText }),
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      };
    }

    const deploys = await response.json() as any[]; // Consider defining a more specific type for the deploy object
    
    if (deploys && deploys.length > 0) {
      const latestDeploy = deploys[0]; // Assumes deploys are sorted newest first by the API
      return {
        statusCode: 200,
        body: JSON.stringify({
          deployId: latestDeploy.id,
          status: latestDeploy.state, // e.g., "building", "ready", "error", "current"
          createdAt: latestDeploy.created_at,
          publishedAt: latestDeploy.published_at,
          commitRef: latestDeploy.commit_ref, 
          context: latestDeploy.context, // e.g., "production"
        }),
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      };
    } else {
      return { 
        statusCode: 404, 
        body: JSON.stringify({ message: "No deploys found for this site." }),
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
      };
    }
  } catch (error: any) {
    console.error("Error fetching deploy status:", error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ message: "Internal server error while fetching deploy status.", error: error.message }),
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' }
    };
  }
};

export { handler };
