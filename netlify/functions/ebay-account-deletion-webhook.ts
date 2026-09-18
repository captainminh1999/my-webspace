import type { Handler, HandlerEvent } from "@netlify/functions";
import crypto from "crypto";

interface EBayNotificationPayload {
  metadata?: {
    topic?: string;
    schemaVersion?: string;
    deprecated?: boolean;
  };
  notification?: {
    notificationId?: string;
    eventDate?: string;
    publishDate?: string;
    publishAttemptCount?: number;
    data?: {
      username?: string;
      userId?: string;
      eiasToken?: string;
    };
  };
}

const JSON_HEADERS = { "Content-Type": "application/json" };

/**
 * Handles eBay marketplace account deletion webhook verification challenge
 * eBay requires hashing: challengeCode + verificationToken + endpoint
 */
const handleVerificationChallenge = (
  challengeCode: string,
  verificationToken: string,
  endpoint: string
): string => {
  const hash = crypto.createHash("sha256");
  hash.update(challengeCode);
  hash.update(verificationToken);
  hash.update(endpoint);
  return hash.digest("hex");
};

/**
 * Handles eBay marketplace account deletion webhook notifications.
 *
 * eBay sends one of these for every account deleted on the marketplace, not
 * just accounts that ever touched this site. This site stores no eBay user
 * data, so there is nothing to delete and nothing to keep: acknowledge the
 * notification with a 2xx and discard it. Persisting the payload would mean
 * retaining identifiers for people whose request was to be forgotten.
 */
const handler: Handler = async (event: HandlerEvent) => {
  // eBay sends both GET (for verification challenge) and POST (for notifications)
  if (event.httpMethod === "GET") {
    // Initial webhook verification challenge from eBay
    const challengeCode = event.queryStringParameters?.challenge_code;
    if (!challengeCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing challenge code" }),
        headers: JSON_HEADERS,
      };
    }

    const verificationToken = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN;
    if (!verificationToken) {
      console.error("EBAY_WEBHOOK_VERIFICATION_TOKEN not configured");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Server configuration error" }),
        headers: JSON_HEADERS,
      };
    }

    // The endpoint URL must match what was registered with eBay
    const endpoint = process.env.EBAY_WEBHOOK_ENDPOINT || "https://nhatminh.dev/.netlify/functions/ebay-account-deletion-webhook";

    try {
      const challengeResponse = handleVerificationChallenge(challengeCode, verificationToken, endpoint);
      console.log("eBay challenge code received and verified");

      return {
        statusCode: 200,
        body: JSON.stringify({ challengeResponse }),
        headers: JSON_HEADERS,
      };
    } catch (err) {
      console.error("Error generating challenge response:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error generating challenge response" }),
        headers: JSON_HEADERS,
      };
    }
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: JSON_HEADERS,
    };
  }

  // Best-effort parse purely for the log line. Never log or store the
  // notification.data block: it identifies the deleted eBay user.
  let payload: EBayNotificationPayload | undefined;
  try {
    payload = event.body ? JSON.parse(event.body) : undefined;
  } catch {
    console.warn("eBay account deletion notification had an unparseable body");
  }

  console.log("eBay account deletion notification acknowledged:", {
    notificationId: payload?.notification?.notificationId,
    topic: payload?.metadata?.topic,
    eventDate: payload?.notification?.eventDate,
  });

  // Return 200 OK to acknowledge receipt (required by eBay; anything else is
  // retried and eventually marks the endpoint as failing).
  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Account deletion notification received" }),
    headers: JSON_HEADERS,
  };
};

export { handler };
