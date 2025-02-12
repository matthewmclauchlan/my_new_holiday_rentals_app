// calculateBookingPrice.js

// Import the Appwrite SDK
const sdk = require('node-appwrite');

// Initialize the client with environment variables
const client = new sdk.Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new sdk.Databases(client);

/**
 * Helper: Fetch pricing rules for a property from the PRICE_RULES_COLLECTION.
 * We assume that the document in this collection has attributes such as:
 * - basePricePerNight
 * - basePricePerNightWeekend
 * - weeklyDiscount (in percent)
 * - monthlyDiscount (in percent)
 * - cleaningFee
 * - petFee
 */
async function getPriceRules(propertyId) {
  // Query for a document where propertyId equals the provided propertyId.
  // Alternatively, if you store one document per property, you might use getDocument with the ID.
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.PRICE_RULES_COLLECTION_ID,
    [sdk.Query.equal('propertyId', propertyId)]
  );
  if (response.documents.length > 0) {
    return response.documents[0];
  }
  throw new Error('Price rules not found for property: ' + propertyId);
}

/**
 * Helper: Fetch price adjustments (overrides) for the given dates.
 * Returns an object mapping date strings to override prices.
 */
async function getPriceAdjustments(propertyId, dates) {
  // Query for adjustments for this property and for dates in the given array.
  const response = await databases.listDocuments(
    process.env.DATABASE_ID,
    process.env.PRICE_ADJUSTMENTS_COLLECTION_ID,
    [
      sdk.Query.equal('propertyId', propertyId),
      sdk.Query.in('date', dates)
    ]
  );
  // Build a lookup: { "2025-03-01": overridePrice, ... }
  const adjustments = {};
  for (const doc of response.documents) {
    adjustments[doc.date] = doc.overridePrice;
  }
  return adjustments;
}

/**
 * Main function to calculate the booking price.
 * Parameters (passed via function payload):
 * - propertyId: string
 * - bookingDates: array of date strings in "YYYY-MM-DD" format
 * - guestInfo: object { adults, children, infants, pets }
 */
module.exports = async (req, res) => {
  try {
    // Parse the function payload
    const { propertyId, bookingDates, guestInfo } = req.payload;

    // 1. Fetch pricing rules for the property
    const priceRules = await getPriceRules(propertyId);

    // 2. Fetch price adjustments for the booking dates
    const adjustments = await getPriceAdjustments(propertyId, bookingDates);

    // 3. Calculate nightly rates for each date
    const nightlyBreakdown = bookingDates.map(date => {
      const dayOfWeek = new Date(date).getDay();
      // Assuming weekend is Saturday (6) and Sunday (0)
      let baseRate = (dayOfWeek === 0 || dayOfWeek === 6) 
          ? priceRules.basePricePerNightWeekend 
          : priceRules.basePricePerNight;
      
      // If there is an override, use that.
      if (adjustments[date] !== undefined) {
        baseRate = adjustments[date];
      }
      
      return { date, rate: baseRate };
    });

    // 4. Calculate subtotal (sum of nightly rates)
    const subTotal = nightlyBreakdown.reduce((sum, entry) => sum + entry.rate, 0);

    // 5. Calculate fees
    const cleaningFee = priceRules.cleaningFee;
    const petFee = guestInfo.pets > 0 ? priceRules.petFee : 0;

    // 6. Calculate discounts (this is simplified; you may need to check booking length)
    // For example, if booking length >= 7 nights, apply weeklyDiscount, etc.
    let discount = 0;
    if (bookingDates.length >= 7 && priceRules.weeklyDiscount) {
      discount = subTotal * (priceRules.weeklyDiscount / 100);
    } else if (bookingDates.length >= 30 && priceRules.monthlyDiscount) {
      discount = subTotal * (priceRules.monthlyDiscount / 100);
    }

    // 7. Calculate additional fees (booking fee, VAT, etc.)
    // For example, let's assume:
    const bookingFee = 25; // fixed booking fee in your currency
    const vatPercentage = 15; // 15%
    const vat = (subTotal - discount + cleaningFee + petFee + bookingFee) * (vatPercentage / 100);

    // 8. Calculate total
    const total = subTotal - discount + cleaningFee + petFee + bookingFee + vat;

    // 9. Create a breakdown object
    const breakdown = {
      nightlyBreakdown, // Array of nightly rate details
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

    // 10. Optionally, store the breakdown in the BookingPriceDetails collection
    // (If you want to save the breakdown for later reference)
    const savedBreakdown = await databases.createDocument(
      process.env.DATABASE_ID,
      process.env.BOOKING_PRICE_DETAILS_COLLECTION_ID,
      'unique()', // let Appwrite generate an ID
      {
        propertyId,
        breakdown,
      }
    );

    // 11. (Optional) Send the data to Glide via an HTTP request here if needed.

    // Return the breakdown to the caller.
    res.json(breakdown);
  } catch (error) {
    console.error("Error calculating booking price:", error);
    res.json({ error: error.message });
  }
};
