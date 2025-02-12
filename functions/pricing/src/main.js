// calculateBookingPrice.js

// Import the Appwrite SDK modules using ES module syntax.
import { Client, Databases, Query } from 'node-appwrite';

// Initialize the Appwrite client using environment variables.
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)      // e.g., "https://[YOUR_APPWRITE_HOST]/v1"
  .setProject(process.env.APPWRITE_PROJECT_ID)       // e.g., "your_project_id"
  .setKey(process.env.APPWRITE_API_KEY);             // e.g., "your_server_api_key"

// Create a Databases instance.
const databases = new Databases(client);

/**
 * Fetch the pricing rules document for a property.
 * Assumes the PRICE_RULES_COLLECTION contains documents with a field "propertyId".
 */
export async function getPriceRules(propertyId) {
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.PRICE_RULES_COLLECTION_ID,
    [Query.equal('propertyId', propertyId)]
  );
  if (response.documents.length > 0) {
    return response.documents[0];
  }
  throw new Error('Price rules not found for property: ' + propertyId);
}

/**
 * Fetch price adjustments (overrides) for the given dates.
 * Returns an object mapping date strings to override prices.
 */
export async function getPriceAdjustments(propertyId, dates) {
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.PRICE_ADJUSTMENTS_COLLECTION_ID,
    [
      Query.equal('propertyId', propertyId),
      Query.in('date', dates)
    ]
  );
  const adjustments = {};
  for (const doc of response.documents) {
    adjustments[doc.date] = doc.overridePrice;
  }
  return adjustments;
}

/**
 * The main function that calculates the booking price.
 * Expected payload (from req.payload) should include:
 * - propertyId: string
 * - bookingDates: array of strings in "YYYY-MM-DD" format
 * - guestInfo: object with { adults, children, infants, pets }
 */
export default async function main(req, res) {
  try {
    // Parse payload from the request.
    const { propertyId, bookingDates, guestInfo } = req.payload;
    if (!propertyId || !bookingDates || !Array.isArray(bookingDates) || !guestInfo) {
      throw new Error('Invalid payload');
    }

    // 1. Fetch pricing rules for the property.
    const priceRules = await getPriceRules(propertyId);

    // 2. Fetch any price adjustments for the booking dates.
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);

    // 3. Calculate nightly rates.
    const nightlyBreakdown = bookingDates.map(date => {
      const dayOfWeek = new Date(date).getDay();
      // Assume weekend is Saturday (6) and Sunday (0).
      let baseRate = (dayOfWeek === 0 || dayOfWeek === 6) 
          ? priceRules.basePricePerNightWeekend 
          : priceRules.basePricePerNight;

      // Apply override if available.
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }

      return { date, rate: baseRate };
    });

    // 4. Calculate subtotal (sum of nightly rates).
    const subTotal = nightlyBreakdown.reduce((sum, entry) => sum + entry.rate, 0);

    // 5. Calculate additional fees.
    const cleaningFee = priceRules.cleaningFee;
    const petFee = guestInfo.pets > 0 ? priceRules.petFee : 0;

    // 6. Calculate discounts (example logic).
    let discount = 0;
    if (bookingDates.length >= 7 && priceRules.weeklyDiscount) {
      discount = subTotal * (priceRules.weeklyDiscount / 100);
    } else if (bookingDates.length >= 30 && priceRules.monthlyDiscount) {
      discount = subTotal * (priceRules.monthlyDiscount / 100);
    }

    // 7. Calculate additional fees such as booking fee and VAT.
    const bookingFee = 25; // Example fixed booking fee.
    const vatPercentage = 15; // Example: 15% VAT.
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);

    // 8. Calculate total.
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;

    // 9. Build a breakdown object.
    const breakdown = {
      nightlyBreakdown, // Array of nightly rate details.
      subTotal,
      discount,
      cleaningFee,
      petFee,
      bookingFee,
      vat,
      total,
      guestInfo,
      bookingDates,
      calculatedAt: new Date().toISOString(),
    };

    // 10. Optionally, store the breakdown in a BookingPriceDetails collection.
    const savedBreakdown = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.BOOKING_PRICE_DETAILS_COLLECTION_ID,
      'unique()', // Let Appwrite generate an ID.
      {
        propertyId,
        breakdown,
        createdAt: new Date().toISOString(),
      }
    );

    // 11. Optionally, send data to Glide here via an HTTP request.

    // Return the breakdown as JSON.
    res.json(breakdown);
  } catch (error) {
    console.error("Error calculating booking price:", error);
    res.json({ error: error.message });
  }
}
