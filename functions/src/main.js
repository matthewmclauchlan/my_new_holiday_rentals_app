// main.js
import { Client, Databases, Query } from "node-appwrite";

export default async function (context, req) {
  try {
    context.log("Function starting...");

    // 1. Retrieve the payload.
    //    Try to get it from req.body, then from context.payload.
    let payload = req && req.body ? req.body : context.payload;
    if (!payload) {
      context.error("No payload found in req.body or context.payload");
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

    // 2. Validate the webhook secret.
    const expectedSecret = process.env.WEBHOOK_SECRET;
    if (payload.webhookSecret !== expectedSecret) {
      context.log("Webhook secret mismatch. Received:", payload.webhookSecret);
      return { json: { error: "Unauthorized: invalid webhook secret" } };
    }
    context.log("Webhook secret validated.");

    // 3. Retrieve Appwrite configuration from environment variables.
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

    // 4. Initialize the Appwrite client.
    const client = new Client()
      .setEndpoint(APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);
    context.log("Appwrite client initialized.");

    // 5. Query the host document by userId from the payload.
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

    // 6. Update the host document to mark it as approved.
    const updatedDoc = await databases.updateDocument(
      APPWRITE_DATABASE_ID,
      APPWRITE_HOST_COLLECTION_ID,
      hostDoc.$id,
      {
        approvalStatus: true,
        approvedAt: new Date().toISOString(),
      }
    );
    context.log("Host document updated successfully:", JSON.stringify(updatedDoc));

    // 7. Return a successful JSON response.
    return { json: { success: true, updated: updatedDoc } };
  } catch (error) {
    context.error("Function error:", error);
    return { json: { error: error.message } };
  }
}
