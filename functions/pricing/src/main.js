// calculateBookingPrice.js

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
 * Fetch the pricing rules for a property.
 * Assumes that the PRICE_RULES_COLLECTION contains documents with a field "propertyId".
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
 * Fetch price adjustments (override prices) for a given set of dates.
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
 * Returns an array of dates (in "YYYY-MM-DD" format) between startDate and endDate (inclusive).
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
 * Main Cloud Function: calculates the booking price.
 * The function expects its input (as a JSON string) either in req.body or in process.env.APPWRITE_FUNCTION_DATA.
 * Example payload:
 * {
 *   "propertyId": "67ab3b67a7ae367e9420",
 *   "bookingDates": ["2025-03-01", "2025-03-02", "2025-03-03"],
 *   "guestInfo": { "adults": 2, "children": 1, "infants": 0, "pets": 1 }
 * }
 */
export default async function main(context, req) {
  try {
    // Safely extract the payload.
    const input = (req && req.body) || process.env.APPWRITE_FUNCTION_DATA || "{}";
    const payload = JSON.parse(input);
    const { propertyId, bookingDates, guestInfo } = payload;
    if (!propertyId || !bookingDates || !Array.isArray(bookingDates) || !guestInfo) {
      throw new Error('Invalid payload');
    }
    
    // 1. Fetch the pricing rules.
    const priceRules = await getPriceRules(propertyId);
    
    // 2. Fetch price adjustments for the booking dates.
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);
    
    // 3. Calculate the nightly breakdown.
    const nightlyBreakdown = bookingDates.map(date => {
      const dayOfWeek = new Date(date).getDay();
      // Assume weekends are Saturday (6) and Sunday (0).
      let baseRate = (dayOfWeek === 0 || dayOfWeek === 6)
          ? priceRules.basePricePerNightWeekend
          : priceRules.basePricePerNight;
      
      // Override if an adjustment exists.
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }
      
      return { date, rate: baseRate };
    });
    
    // 4. Calculate the subtotal (sum of nightly rates).
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
    
    // 7. Additional fees: booking fee and VAT.
    const bookingFee = 25; // Example fixed booking fee.
    const vatPercentage = 15; // Example VAT percentage.
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);
    
    // 8. Calculate total.
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;
    
    // 9. Build the breakdown object.
    const breakdown = {
      nightlyBreakdown,
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
      'unique()', // Auto-ID generation.
      {
        propertyId,
        breakdown,
        createdAt: new Date().toISOString(),
      }
    );
    
    // Set the function response.
    context.res = {
      status: 200,
      body: JSON.stringify(breakdown)
    };
    return context.res;
  } catch (error) {
    context.log("Error calculating booking price:", error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
    return context.res;
  }
}
