// main.js

import pkg from 'node-appwrite';
const { Client, Databases, Query, ID, Models } = pkg;

export default async function (context, req) {
  try {
    context.log("Function starting...");

    // Use req if available; otherwise, use context.req.
    const actualReq = req || context.req;
    context.log("Actual Request:", JSON.stringify(actualReq));

    // Attempt to retrieve the payload from actualReq.body, context.payload, or process.env.APPWRITE_FUNCTION_DATA.
    let payload =
      (actualReq && actualReq.body) ||
      context.payload ||
      process.env.APPWRITE_FUNCTION_DATA;
    if (!payload) {
      context.error(
        "No payload found in req.body, context.req.body, context.payload, or process.env.APPWRITE_FUNCTION_DATA"
      );
      return { json: { error: "No payload provided" } };
    }
    
    // If payload is a string, try parsing it.
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch (parseError) {
        context.error("Error parsing payload:", parseError);
        return { json: { error: "Invalid payload" } };
      }
    }
    context.log("Payload received:", JSON.stringify(payload));

    // Validate the webhook secret.
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (payload.webhookSecret !== expectedSecret) {
      context.log("Webhook secret mismatch. Received:", payload.webhookSecret);
      return { json: { error: "Unauthorized: invalid webhook secret" } };
    }
    context.log("Webhook secret validated.");

    // Retrieve Appwrite configuration from environment variables.
    const {
      APPWRITE_FUNCTION_API_ENDPOINT,
      APPWRITE_FUNCTION_PROJECT_ID,
      APPWRITE_API_KEY,
      APPWRITE_DATABASE_ID,
      APPWRITE_HOST_COLLECTION_ID,
    } = process.env;

    if (
      !APPWRITE_FUNCTION_API_ENDPOINT ||
      !APPWRITE_FUNCTION_PROJECT_ID ||
      !APPWRITE_API_KEY ||
      !APPWRITE_DATABASE_ID ||
      !APPWRITE_HOST_COLLECTION_ID
    ) {
      context.error("Missing required Appwrite environment variables.");
      return { json: { error: "Server configuration error: missing environment variables" } };
    }

    // Initialize the Appwrite client.
    const client = new Client()
      .setEndpoint(APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);
    context.log("Appwrite client initialized.");

    // Query the host document by userId from the payload.
    context.log("Querying host document for userId:", payload.userId);
    const hostDocs = await databases.listDocuments(
      APPWRITE_DATABASE_ID,
      APPWRITE_HOST_COLLECTION_ID,
      [Query.equal("userId", payload.userId)]
    );

    if (hostDocs.documents.length === 0) {
      context.log("No host document found for userId:", payload.userId);
      return { json: { error: "Host application not found" } };
    }

    const hostDoc = hostDocs.documents[0];
    context.log("Found host document:", JSON.stringify(hostDoc));

    // Build the update data:
    const updateData = {
      approvalStatus: payload.approvalStatus || "pending",
    };
    // If the status is either "approved" or "rejected", record the decision date.
    if (payload.approvalStatus === "approved" || payload.approvalStatus === "rejected") {
      updateData.decisionDate = new Date().toISOString();
    }

    // Update the host document.
    const updatedDoc = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_HOST_COLLECTION_ID,
      hostDoc.$id,
      updateData
    );
    context.log("Host document updated successfully:", JSON.stringify(updatedDoc));

    // Return a successful JSON response.
    return { json: { success: true, updated: updatedDoc } };
  } catch (error) {
    context.error("Function error:", error.message || error);
    return { json: { error: error.message } };
  }
}
