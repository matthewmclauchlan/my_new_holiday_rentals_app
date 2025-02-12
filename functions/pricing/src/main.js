// testPayload.js

// Import the Appwrite SDK (if needed for further expansion)
import { Client } from 'node-appwrite';

/**
 * Main Cloud Function.
 * This function expects its input as a JSON string either in req.body
 * or in process.env.APPWRITE_FUNCTION_DATA.
 * It logs the raw and parsed payload, and then returns it.
 *
 * Example payload:
 * {
 *   "message": "Hello, Appwrite!",
 *   "value": 42
 * }
 */
export default async function main(context, req) {
  try {
    // Extract the payload from req.body or fallback to environment variable.
    const input = (req && req.body) || process.env.APPWRITE_FUNCTION_DATA || "{}";
    
    // Log the raw payload.
    context.log("Raw payload input:", input);
    
    // Parse the payload.
    const payload = JSON.parse(input);
    context.log("Parsed payload:", payload);
    
    // Return a simple response echoing the payload.
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
