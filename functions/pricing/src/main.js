// calculateBookingPrice.js

// Import the Appwrite SDK modules using ES module syntax.
import { Client, Databases, Query } from 'node-appwrite';

// Initialize the Appwrite client using environment variables.
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)      // e.g., "https://your-appwrite-endpoint/v1"
  .setProject(process.env.APPWRITE_PROJECT_ID)       // e.g., "your_project_id"
  .setKey(process.env.APPWRITE_API_KEY);             // e.g., "your_server_api_key"

// Create a Databases instance.
const databases = new Databases(client);

/**
 * Helper: Fetch the pricing rules for a property.
 * Assumes the PRICE_RULES_COLLECTION contains documents with a field "propertyId".
 */
async function getPriceRules(propertyId) {
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
 * Helper: Fetch price adjustments for a property over specific dates.
 * Returns an object mapping date strings to override prices.
 */
async function getPriceAdjustments(propertyId, dates) {
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
 * Helper: Return an array of dates (YYYY-MM-DD) between startDate and endDate.
 */
function getDatesInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = [];
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = ("0" + (current.getMonth() + 1)).slice(-2);
    const day = ("0" + current.getDate()).slice(-2);
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Main Cloud Function to calculate booking price.
 * The function expects its input (as a JSON object) in process.env.APPWRITE_FUNCTION_DATA.
 * Expected payload example:
 * {
 *   "propertyId": "67ab3b67a7ae367e9420",
 *   "bookingDates": ["2025-03-01", "2025-03-02", "2025-03-03"],
 *   "guestInfo": { "adults": 2, "children": 1, "infants": 0, "pets": 1 }
 * }
 */
export default async function main() {
  try {
    // Parse the function input.
    const payload = JSON.parse(process.env.APPWRITE_FUNCTION_DATA || "{}");
    const { propertyId, bookingDates, guestInfo } = payload;
    if (!propertyId || !bookingDates || !Array.isArray(bookingDates) || !guestInfo) {
      throw new Error('Invalid payload');
    }

    // 1. Fetch pricing rules for the property.
    const priceRules = await getPriceRules(propertyId);

    // 2. Fetch any price adjustments for the booking dates.
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);

    // 3. Calculate the nightly breakdown.
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

    // 5. Additional fees.
    const cleaningFee = priceRules.cleaningFee;
    const petFee = guestInfo.pets > 0 ? priceRules.petFee : 0;

    // 6. Discounts (example: weekly or monthly discount).
    let discount = 0;
    if (bookingDates.length >= 7 && priceRules.weeklyDiscount) {
      discount = subTotal * (priceRules.weeklyDiscount / 100);
    } else if (bookingDates.length >= 30 && priceRules.monthlyDiscount) {
      discount = subTotal * (priceRules.monthlyDiscount / 100);
    }

    // 7. Additional fees (booking fee, VAT, etc.).
    const bookingFee = 25; // Example fixed booking fee.
    const vatPercentage = 15; // Example VAT percentage.
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

    // 10. Optionally, store the breakdown in the BookingPriceDetails collection.
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

    // 11. (Optional) Send data to Glide here via an HTTP request.

    // Output the breakdown as the function result.
    console.log(JSON.stringify(breakdown));
  } catch (error) {
    console.error("Error calculating booking price:", error);
    console.log(JSON.stringify({ error: error.message }));
  }
}
