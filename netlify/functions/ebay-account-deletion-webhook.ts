import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { connectToDatabase } from "../../src/lib/mongodb";
import crypto from "crypto";

interface EBayWebhookPayload {
  notificationId?: string;
  timestamp?: string;
  topicName?: string;
  data?: {
    username?: string;
    userId?: string;
    accountDeletionTime?: string;
  };
}

/**
 * Verifies the eBay webhook signature
 * eBay sends an X-EBAY-SIGNATURE-256 header with HMAC-SHA256 signature
 */
const verifyEBaySignature = (
  event: HandlerEvent,
  verificationToken: string
): boolean => {
  const signature = event.headers["x-ebay-signature-256"] || event.headers["X-EBAY-SIGNATURE-256"];
  if (!signature) {
    console.warn("Missing eBay signature header");
    return false;
  }

  // eBay computes the signature using the raw request body
  const body = event.body || "";
  const hash = crypto
    .createHmac("sha256", verificationToken)
    .update(body)
    .digest("base64");

  // Compare the computed hash with the received signature
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature as string));
};

/**
 * Handles eBay marketplace account deletion webhook notifications
 * Stores the deletion request in MongoDB for audit trail
 */
const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  // eBay sends both GET (for verification) and POST (for notifications)
  if (event.httpMethod === "GET") {
    // Initial webhook verification challenge
    const challengeCode = event.queryStringParameters?.challenge_code;
    if (challengeCode) {
      // Return the challenge code as-is for verification
      return {
        statusCode: 200,
        body: challengeCode,
        headers: { "Content-Type": "text/plain" },
      };
    }
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "Missing challenge code" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: "Method Not Allowed" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  try {
    // Verify the webhook signature
    const verificationToken = process.env.EBAY_WEBHOOK_VERIFICATION_TOKEN;
    if (!verificationToken) {
      console.error("EBAY_WEBHOOK_VERIFICATION_TOKEN not configured");
      return {
        statusCode: 500,
        body: JSON.stringify({ message: "Server configuration error" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    if (!verifyEBaySignature(event, verificationToken)) {
      console.warn("Invalid eBay webhook signature");
      return {
        statusCode: 401,
        body: JSON.stringify({ message: "Unauthorized: Invalid signature" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    // Parse the webhook payload
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Empty request body" }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const payload: EBayWebhookPayload = JSON.parse(event.body);

    // Log the webhook for debugging
    console.log("eBay account deletion webhook received:", {
      notificationId: payload.notificationId,
      timestamp: payload.timestamp,
      userId: payload.data?.userId,
    });

    // Connect to MongoDB and store the deletion request
    const client = await connectToDatabase();
    const db = client.db(process.env.MONGODB_DB || "cv");
    const deletionRequests = db.collection("ebay_account_deletions");

    const deletionRecord = {
      notificationId: payload.notificationId,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      userId: payload.data?.userId,
      username: payload.data?.username,
      accountDeletionTime: payload.data?.accountDeletionTime
        ? new Date(payload.data.accountDeletionTime)
        : null,
      receivedAt: new Date(),
      status: "processed",
    };

    const result = await deletionRequests.insertOne(deletionRecord);

    console.log("Account deletion request stored:", result.insertedId);

    // Return 200 OK to acknowledge receipt
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
