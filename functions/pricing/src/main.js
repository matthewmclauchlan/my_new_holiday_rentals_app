// calculateBookingPrice.js

import { Client, Databases, Query } from 'node-appwrite';

// Initialize the Appwrite client using environment variables.
const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
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
 * Fetch price adjustments for a set of dates.
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
 * Generate an array of dates (YYYY-MM-DD) between startDate and endDate (inclusive).
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
 * Expected payload (as JSON) should include:
 * {
 *   "propertyId": "67ab3b67a7ae367e9420",
 *   "bookingDates": ["2025-03-01", "2025-03-02", "2025-03-03"],
 *   "guestInfo": { "adults": 2, "children": 1, "infants": 0, "pets": 1 }
 * }
 */
export default async function main(context, req) {
  try {
    // Extract payload from req.body (or fallback).
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
    
    // 2. Fetch price adjustments.
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);
    context.log("Fetched adjustments:", JSON.stringify(adjustments));
    
    // 3. Calculate nightly breakdown.
    const nightlyBreakdown = bookingDates.map(date => {
      const dayOfWeek = new Date(date).getDay();
      let baseRate = (dayOfWeek === 0 || dayOfWeek === 6)
          ? priceRules.basePricePerNightWeekend
          : priceRules.basePricePerNight;
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }
      return { date, rate: baseRate };
    });
    context.log("Nightly breakdown:", JSON.stringify(nightlyBreakdown));
    
    // 4. Calculate subtotal.
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
    
    // 7. Additional fees: booking fee and VAT.
    const bookingFee = 25; // Example fixed booking fee.
    const vatPercentage = 15; // Example VAT percentage.
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);
    context.log("VAT:", vat);
    
    // 8. Calculate total.
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;
    context.log("Total:", total);
    
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
    
    // 10. Store the breakdown in the BookingPriceDetails collection.
    await databases.createDocument(
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
