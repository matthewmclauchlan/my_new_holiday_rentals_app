// calculateBookingPrice.js

import { Client, Databases, Query, ID } from 'node-appwrite';

// Initialize the Appwrite client using environment variables.
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT) // e.g., "https://your-appwrite-endpoint/v1"
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID) // using your APPWRITE_FUNCTION_PROJECT_ID variable
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

/**
 * Fetch the pricing rules for a property.
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
 * Fetch price adjustments (override prices) for the given set of dates.
 * Instead of using Query.in, we build a Query.or for each date equality condition.
 * Returns an object mapping date strings to override prices.
 */
async function getPriceAdjustments(propertyId, dates) {
  const dateQueries = dates.map(date => Query.equal('date', date));
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.PRICE_ADJUSTMENTS_COLLECTION_ID,
    [
      Query.equal('propertyId', propertyId),
      Query.or(dateQueries)
    ]
  );
  const adjustments = {};
  for (const doc of response.documents) {
    adjustments[doc.date] = doc.overridePrice;
  }
  return adjustments;
}

/**
 * Returns an array of dates (YYYY-MM-DD) between startDate and endDate (inclusive).
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
 * Fetch service fees from your fees collection.
 * This collection is identified by the environment variable FEES_COLLECTION_ID.
 */
async function getServiceFees() {
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.FEES_COLLECTION_ID,
    [] // assuming a single active document exists
  );
  if (response.documents.length > 0) {
    return response.documents[0];
  }
  throw new Error("Service fees not found");
}

/**
 * Main Cloud Function: calculates the booking price and returns a detailed breakdown.
 *
 * Expected payload (as JSON) should include:
 * {
 *   "propertyId": "67ab3b67a7ae367e9420",
 *   "bookingDates": ["2025-02-16", "2025-02-17", "2025-02-18", "2025-02-19"],
 *   "guestInfo": { "adults": 2, "children": 0, "infants": 0, "pets": 0 }
 * }
 */
export default async function main(context, req) {
  try {
    // Extract the payload using the working extraction logic.
    const actualReq = req || context.req;
    let payload = (actualReq && actualReq.body) || context.payload || process.env.APPWRITE_FUNCTION_DATA || "{}";
    if (typeof payload === "string") {
      payload = JSON.parse(payload);
    }
    context.log("Parsed payload:", JSON.stringify(payload));
    
    const { propertyId, bookingDates, guestInfo } = payload;
    if (!propertyId || !bookingDates || !Array.isArray(bookingDates) || !guestInfo) {
      throw new Error('Invalid payload');
    }
    
    // 1. Fetch the pricing rules.
    const priceRules = await getPriceRules(propertyId);
    context.log("Fetched priceRules:", JSON.stringify(priceRules));
    
    // 2. Fetch price adjustments for the booking dates.
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);
    context.log("Fetched adjustments:", JSON.stringify(adjustments));
    
    // 3. Calculate the nightly breakdown.
    const nightlyBreakdown = bookingDates.map(date => {
      const dayOfWeek = new Date(date).getDay();
      // Assume weekends are Saturday (6) and Sunday (0).
      let baseRate = (dayOfWeek === 0 || dayOfWeek === 6)
          ? priceRules.basePricePerNightWeekend
          : priceRules.basePricePerNight;
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }
      return { date, rate: baseRate };
    });
    context.log("Nightly breakdown:", JSON.stringify(nightlyBreakdown));
    
    // 4. Calculate the subtotal (sum of nightly rates).
    const subTotal = nightlyBreakdown.reduce((sum, entry) => sum + entry.rate, 0);
    context.log("Subtotal:", subTotal);
    
    // 5. Additional fees.
    const cleaningFee = priceRules.cleaningFee;
    const petFee = guestInfo.pets > 0 ? priceRules.petFee : 0;
    context.log("Cleaning fee:", cleaningFee, "Pet fee:", petFee);
    
    // 6. Calculate discounts.
    let discount = 0;
    if (bookingDates.length >= 7 && priceRules.weeklyDiscount) {
      discount = subTotal * (priceRules.weeklyDiscount / 100);
    } else if (bookingDates.length >= 30 && priceRules.monthlyDiscount) {
      discount = subTotal * (priceRules.monthlyDiscount / 100);
    }
    context.log("Discount:", discount);
    
    // 7. Fetch service fees.
    const serviceFees = await getServiceFees();
    context.log("Fetched service fees:", JSON.stringify(serviceFees));
    
    // 8. Calculate the booking fee using the guestBookingFee percentage.
    const guestBookingFeePercent = serviceFees.guestBookingFee; // e.g., 7 means 7%
    const bookingFee = (subTotal - discount + cleaningFee + petFee) * (guestBookingFeePercent / 100);
    context.log("Booking fee:", bookingFee);
    
    // 9. Calculate VAT.
    const vatPercentage = 15; // hardcoded VAT percentage; could also be from env.
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);
    context.log("VAT:", vat);
    
    // 10. Calculate the total.
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;
    context.log("Total:", total);
    
    // 11. Build the detailed breakdown.
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
      serviceFees: {
         guestBookingFee: guestBookingFeePercent,
         hostServiceFee: serviceFees.hostServiceFee,
      }
    };
    
    // Convert breakdown to a string and log its length.
    const breakdownString = JSON.stringify(breakdown);
    context.log("Breakdown string length:", breakdownString.length);
    if (breakdownString.length > 5000) {
      throw new Error("Breakdown data exceeds 5000 characters.");
    }
    
    // 12. Store the breakdown in the BookingPriceDetails collection.
    await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.BOOKING_PRICE_DETAILS_COLLECTION_ID,
      ID.unique(),
      {
        propertyId,
        breakdown: [breakdownString],
        createdAt: new Date().toISOString(),
      }
    );
    
    context.res = {
      status: 200,
      body: breakdownString,
    };
    return context.res;
  } catch (error) {
    context.error("Error calculating booking price:", error);
    context.res = {
      status: 500,
      body: JSON.stringify({ error: error.message }),
    };
    return context.res;
  }
}
