import { Client, Databases, Query } from "node-appwrite";

export default async function (context, req) {
  try {
    context.log("Function starting...");

    // Log all available data for debugging
    context.log("req:", JSON.stringify(req));
    context.log("context:", JSON.stringify(context));
    context.log("process.env.APPWRITE_FUNCTION_DATA:", process.env.APPWRITE_FUNCTION_DATA);

    // Attempt to retrieve payload from several sources:
    let payload = req && req.body ? req.body : context.payload || process.env.APPWRITE_FUNCTION_DATA;

    if (!payload) {
      context.error("No payload found in req.body, context.payload, or process.env.APPWRITE_FUNCTION_DATA");
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

    // Continue with your logic...
    // (Initialization of Appwrite client, querying, updating, etc.)

    // For testing, return the payload:
    return { json: { success: true, payload } };
  } catch (error) {
    context.error("Function error:", error);
    return { json: { error: error.message } };
  }
}
