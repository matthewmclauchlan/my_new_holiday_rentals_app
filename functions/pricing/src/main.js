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
 * Helper function to fetch pricing rules for a property.
 * It queries the PRICE_RULES_COLLECTION for a document where the field "propertyId" equals the provided propertyId.
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
 * Helper function to fetch price adjustments for the provided dates.
 * It queries the PRICE_ADJUSTMENTS_COLLECTION for documents matching the propertyId and where "date" is in the provided dates.
 * Returns an object mapping each date to its override price.
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
 * Helper function to generate an array of dates (in "YYYY-MM-DD" format) between startDate and endDate (inclusive).
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
 * Main Cloud Function: calculates the booking price and returns a detailed breakdown.
 *
 * Expected payload (as JSON string in req.body or APPWRITE_FUNCTION_DATA):
 * {
 *   "propertyId": "67ab3b67a7ae367e9420",
 *   "bookingDates": ["2025-03-01", "2025-03-02", "2025-03-03"],
 *   "guestInfo": { "adults": 2, "children": 1, "infants": 0, "pets": 1 }
 * }
 */
export default async function main(context, req) {
  try {
    // Extract the payload from req.body or from APPWRITE_FUNCTION_DATA.
    // For Postman, the payload should be sent as JSON in the POST body.
    const input = (req && req.body) || process.env.APPWRITE_FUNCTION_DATA || "{}";
    context.log("Raw payload input:", input);
    const payload = typeof input === "string" ? JSON.parse(input) : input;
    context.log("Parsed payload:", payload);
    
    const { propertyId, bookingDates, guestInfo } = payload;
    if (!propertyId || !bookingDates || !Array.isArray(bookingDates) || !guestInfo) {
      throw new Error('Invalid payload');
    }
    
    // 1. Fetch pricing rules for the property.
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
      // If there is an override price for this date, use it.
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }
      return { date, rate: baseRate };
    });
    
    // 4. Calculate the subtotal: sum of nightly rates.
    const subTotal = nightlyBreakdown.reduce((sum, entry) => sum + entry.rate, 0);
    
    // 5. Additional fees:
    //    - Cleaning fee (fixed per booking).
    //    - Pet fee: applied if guestInfo.pets > 0.
    const cleaningFee = priceRules.cleaningFee;
    const petFee = guestInfo.pets > 0 ? priceRules.petFee : 0;
    
    // 6. Calculate discounts:
    //    For example, if booking is 7+ nights, apply a weekly discount,
    //    or if booking is 30+ nights, apply a monthly discount.
    let discount = 0;
    if (bookingDates.length >= 7 && priceRules.weeklyDiscount) {
      discount = subTotal * (priceRules.weeklyDiscount / 100);
    } else if (bookingDates.length >= 30 && priceRules.monthlyDiscount) {
      discount = subTotal * (priceRules.monthlyDiscount / 100);
    }
    
    // 7. Additional fees such as a booking fee and VAT.
    const bookingFee = 25; // Example fixed booking fee.
    const vatPercentage = 15; // Example VAT percentage.
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);
    
    // 8. Calculate the final total.
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;
    
    // 9. Build a detailed breakdown object.
    const breakdown = {
      nightlyBreakdown, // Array with each date and its rate.
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
    
    // 10. Optionally, store the breakdown in a "BookingPriceDetails" collection.
    //    This saves a snapshot of the calculated price breakdown.
    const savedBreakdown = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.BOOKING_PRICE_DETAILS_COLLECTION_ID,
      'unique()',
      {
        propertyId,
        breakdown,
        createdAt: new Date().toISOString(),
      }
    );
    
    context.res = {
      status: 200,
      body: JSON.stringify(breakdown)
    };
    return context.res;
  } catch (error) {
    context.error("Error calculating booking price:", error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message })
    };
    return context.res;
  }
}
