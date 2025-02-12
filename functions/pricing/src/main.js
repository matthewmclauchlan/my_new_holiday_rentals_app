// testPayload.js

import { Client } from 'node-appwrite';

/**
 * Main Cloud Function.
 * This function reads its input from process.env.APPWRITE_FUNCTION_DATA.
 * The expected payload should be provided under the "data" key as a stringified JSON.
 *
 * Example payload to send (raw JSON in Postman):
 * {
 *   "data": "{\"message\": \"Hello, Appwrite!\", \"value\": 42}"
 * }
 */
export default async function main(context) {
  try {
    // Read the payload from the environment variable.
    const input = process.env.APPWRITE_FUNCTION_DATA || "{}";
    context.log("APPWRITE_FUNCTION_DATA:", input);
    
    // Parse the payload.
    const payload = JSON.parse(input);
    context.log("Parsed payload:", payload);
    
    context.res = {
      status: 200,
      body: JSON.stringify({
        message: "Data received successfully",
        payload: payload
      })
    };
    return context.res;
  } catch (error) {
    context.error("Error processing payload:", error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
    return context.res;
  }
}

