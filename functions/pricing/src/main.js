// testPayload.js

import { Client } from 'node-appwrite';

export default async function main(context, req) {
  try {
    // Use req.body if available; otherwise, fallback.
    const actualReq = req || context.req;
    const input = (actualReq && actualReq.body) || process.env.APPWRITE_FUNCTION_DATA || "{}";
    context.log("Raw payload input:", input);

    // If input is not a string, convert it.
    const payload = typeof input === "string" ? JSON.parse(input) : input;
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
