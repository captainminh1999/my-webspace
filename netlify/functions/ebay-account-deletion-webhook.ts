import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";
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
 * Handles eBay marketplace account deletion webhook notifications
 * Stores the deletion request in MongoDB for audit trail
 */
const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // eBay sends both GET (for verification challenge) and POST (for notifications)
  if (event.httpMethod === "GET") {
    // Initial webhook verification challenge from eBay
    const challengeCode = event.queryStringParameters?.challenge_code;
    if (!challengeCode) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing challenge code" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const verificationToken = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN;
    if (!verificationToken) {
      console.error("EBAY_WEBHOOK_VERIFICATION_TOKEN not configured");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Server configuration error" }),
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
      };
    } catch (err: any) {
      console.error("Error generating challenge response:", err);
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Error generating challenge response" }),
        headers: { "Content-Type": "application/json" },
      };
    }
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    // Parse the webhook payload
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Empty request body" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const payload: EBayNotificationPayload = JSON.parse(event.body);

    // Log the webhook for debugging
    console.log("eBay account deletion notification received:", {
      notificationId: payload.notification?.notificationId,
      eventDate: payload.notification?.eventDate,
      userId: payload.notification?.data?.userId,
      topic: payload.metadata?.topic,
    });

    // Connect to MongoDB and store the deletion request
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const deletionRequests = db.collection("ebay_account_deletions");

    const deletionRecord = {
      notificationId: payload.notification?.notificationId,
      eventDate: payload.notification?.eventDate ? new Date(payload.notification.eventDate) : new Date(),
      publishDate: payload.notification?.publishDate ? new Date(payload.notification.publishDate) : null,
      publishAttemptCount: payload.notification?.publishAttemptCount || 1,
      userId: payload.notification?.data?.userId,
      username: payload.notification?.data?.username,
      eiasToken: payload.notification?.data?.eiasToken,
      topic: payload.metadata?.topic,
      schemaVersion: payload.metadata?.schemaVersion,
      receivedAt: new Date(),
      status: "processed",
    };

    const result = await deletionRequests.insertOne(deletionRecord);

    console.log("Account deletion request stored:", result.insertedId);

    // Return 200 OK to acknowledge receipt (required by eBay)
    // Valid status codes: 200 OK, 201 Created, 202 Accepted, 204 No Content
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Account deletion notification received" }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err: any) {
    console.error("Error processing eBay account deletion webhook:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing webhook",
        error: process.env.NODE_ENV === "development" ? err.message : undefined,
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
};

export { handler };
