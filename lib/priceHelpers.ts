// lib/priceHelpers.ts
import { databases, config, ID, Query } from "./appwrite"; // Adjust the path as needed

export const handleSaveAdjustments = async (
  propertyId: string,
  priceOverrides: Record<string, number>,
  blockedDates: string[]
) => {
  try {
    // Log key configuration values and parameters
    console.log("handleSaveAdjustments called with:");
    console.log("propertyId:", propertyId);
    console.log("config.databaseId:", config.databaseId);
    console.log("config.priceAdjustmentsId:", config.priceAdjustmentsId);
    console.log("priceOverrides:", priceOverrides);
    console.log("blockedDates:", blockedDates);

    // Convert your local priceOverrides object into an array of adjustment objects.
    const adjustments = Object.keys(priceOverrides).map((date) => ({
      date,
      overridePrice: priceOverrides[date],
      blocked: blockedDates.includes(date),
    }));

    console.log("Converted adjustments array:", adjustments);

    // Loop through each adjustment and upsert it in the PriceAdjustments collection.
    for (const adj of adjustments) {
      console.log("Processing adjustment for date:", adj.date);
      
      // Query the PriceAdjustments collection for an existing document.
      const response = await databases.listDocuments(
        config.databaseId,
        config.priceAdjustmentsId, // Ensure this is set correctly in your config
        [Query.equal("propertyId", propertyId), Query.equal("date", adj.date)]
      );
      console.log("ListDocuments response for date", adj.date, ":", response.documents);

      if (response.documents.length > 0) {
        console.log("Document exists for date", adj.date, "- updating document...");
        // Update the existing document.
        const updateResponse = await databases.updateDocument(
          config.databaseId,
          config.priceAdjustmentsId,
          response.documents[0].$id,
          { propertyId, date: adj.date, overridePrice: adj.overridePrice, blocked: adj.blocked }
        );
        console.log("Update response:", updateResponse);
      } else {
        console.log("No document exists for date", adj.date, "- creating new document...");
        // Create a new adjustment document.
        const createResponse = await databases.createDocument(
          config.databaseId,
          config.priceAdjustmentsId,
          ID.unique(),
          { propertyId, date: adj.date, overridePrice: adj.overridePrice, blocked: adj.blocked }
        );
        console.log("Create response:", createResponse);
      }
    }
    console.log("Price adjustments updated for property", propertyId);
  } catch (error) {
    console.error("Error updating price adjustments:", error);
  }
};
