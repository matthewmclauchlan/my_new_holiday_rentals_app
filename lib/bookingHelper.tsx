// lib/bookingHelper.ts
import { Query } from "./appwrite"; // Make sure you have installed the official appwrite SDK
import { databases } from "../lib/appwrite"; // your helper already exports databases

export const getBookingRulesForProperty = async (propertyId: string) => {
  try {
    const response = await databases.listDocuments(
      process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID || "",
      process.env.EXPO_PUBLIC_APPWRITE_BOOKING_RULES_COLLECTION_ID || "",
      [Query.equal("propertyId", propertyId)]
    );
    if (response.documents.length > 0) {
      return response.documents[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching booking rules:", error);
    throw error;
  }
};
