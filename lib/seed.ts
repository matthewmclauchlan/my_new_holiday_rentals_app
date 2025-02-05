import { ID } from "react-native-appwrite";
import { databases, config } from "./appwrite";
import {
  agentImages,
  galleryImages,
  propertiesImages,
  reviewImages,
} from "./data";

const COLLECTIONS = {
  AGENTS: config.agentsCollectionId!,
  REVIEWS: config.reviewsCollectionId!,
  GALLERIES: config.galleriesCollectionId!,
  PROPERTIES: config.propertiesCollectionId!,
  BOOKINGS: config.bookingsCollectionId!,
  AMENITIES: config.amenitiesCollectionId!,
  HOUSE_RULES: config.houseRulesCollectionId!,
  MEDIA: config.mediaCollectionId!,
  PRICE_RULES: config.priceRulesCollectionId!,
  USERS: config.usersCollectionId!,
  PAYMENTS: config.paymentsCollectionId!,
  GUEST_DETAILS: config.guestDetailsCollectionId!,
  
  ROLES: config.rolesCollectionId!,
};

// Define property types and facilities
const propertyTypes = [
  "House", "Townhouse", "Condo", "Duplex", "Studio", "Villa",
  "Apartment", "Cottage", "Bungalow", "Loft", "Penthouse",
  "Cabin", "Farmhouse", "Mansion",
];

const facilities = ["Laundry", "Parking", "Cutlery", "Gym", "Pool", "Wifi", "Pet-friendly", "Garden"];

const paymentMethods = ["credit-card", "paypal", "transfer", "cash"]; // ✅ Matches required values
;

function getRandomSubset<T>(array: T[], minItems: number, maxItems: number): T[] {
  const subsetSize = Math.floor(Math.random() * (maxItems - minItems + 1)) + minItems;
  return [...array].sort(() => Math.random() - 0.5).slice(0, subsetSize);
}

async function seed() {
  try {
    console.log("🔄 Starting Database Seeding...");

    // Ensure API Key is Set
    if (!process.env.EXPO_PUBLIC_APPWRITE_API_KEY) {
      throw new Error("❌ Missing Appwrite API Key in .env.local");
    }

    // 1️⃣ Clear existing data
    for (const key in COLLECTIONS) {
      const collectionId = COLLECTIONS[key as keyof typeof COLLECTIONS];

      console.log(`🗑️ Clearing Collection: ${key}`);
      const documents = await databases.listDocuments(config.databaseId!, collectionId!);

      for (const doc of documents.documents) {
        await databases.deleteDocument(config.databaseId!, collectionId!, doc.$id);
      }
    }
    console.log("✅ All Collections Cleared.");

    // 2️⃣ Seed Users
    const users = [];
    for (let i = 1; i <= 5; i++) {
      const user = await databases.createDocument(config.databaseId!, COLLECTIONS.USERS, ID.unique(), {
        userId: `user${i}`,
        name: `User ${i}`,
        avatar: agentImages[i % agentImages.length],
        bio: `Bio of User ${i}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      users.push(user);
    }
    console.log(`✅ Seeded ${users.length} Users.`);

    // 3️⃣ Seed Agents
    const agents = [];
    for (let i = 1; i <= 5; i++) {
      const assignedUser = users[i % users.length];
      const agent = await databases.createDocument(config.databaseId!, COLLECTIONS.AGENTS, ID.unique(), {
        name: `Agent ${i}`,
        profilePicture: agentImages[i % agentImages.length],
        userId: assignedUser.userId,
        contactInfo: `agent${i}@example.com`,
      });
      agents.push(agent);
    }
    console.log(`✅ Seeded ${agents.length} Agents.`);

    // 4️⃣ Seed Amenities
    const amenities = [];
    for (const facility of facilities) {
      const amenity = await databases.createDocument(config.databaseId!, COLLECTIONS.AMENITIES, ID.unique(), {
        name: facility,
        icon: "https://via.placeholder.com/50",
      });
      amenities.push(amenity);
    }
    console.log(`✅ Seeded ${amenities.length} Amenities.`);

    // 5️⃣ Seed Properties
    const properties = [];
    for (let i = 1; i <= 10; i++) {
      const assignedAgent = agents[Math.floor(Math.random() * agents.length)];
      const selectedAmenities = getRandomSubset(amenities, 2, 5);
      const image = propertiesImages[i % propertiesImages.length];

      const property = await databases.createDocument(config.databaseId!, COLLECTIONS.PROPERTIES, ID.unique(), {
        name: `Property ${i}`,
        type: propertyTypes[Math.floor(Math.random() * propertyTypes.length)],
        description: `Description for Property ${i}`,
        address: `123 Property Street, City ${i}`,
        bedrooms: Math.floor(Math.random() * 5) + 1,
        bathrooms: Math.floor(Math.random() * 5) + 1,
        rating: Math.floor(Math.random() * 5) + 1,
        area: Math.floor(Math.random() * 3000) + 500,
        pricePerNight: Math.floor(Math.random() * 500) + 50,
        agentId: assignedAgent.$id,
        amenities: selectedAmenities.map((a) => a.$id),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      properties.push(property);
    }
    console.log(`✅ Seeded ${properties.length} Properties.`);

    // 6️⃣ Seed Price Rules
    for (const property of properties) {
    await databases.createDocument(config.databaseId!, COLLECTIONS.PRICE_RULES, ID.unique(), {
    propertyId: property.$id,
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    pricePerNight: Math.floor(Math.random() * 400) + 100,
    type: "seasonal",
    isActive: true,  // ✅ ADD THIS LINE
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
}

    console.log("✅ Seeded Price Rules.");

    // 7️⃣ Seed Bookings
    for (let i = 1; i <= 5; i++) {
      const property = properties[Math.floor(Math.random() * properties.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const startDate = new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date(Date.now() + (i + 3) * 24 * 60 * 60 * 1000).toISOString();

      const booking = await databases.createDocument(config.databaseId!, COLLECTIONS.BOOKINGS, ID.unique(), {
        startDate,
        endDate,
        totalPrice: property.pricePerNight * 3,
        userId: user.userId,
        propertyId: property.$id,
        bookingReference: `BOOK${i}`,
        status: "confirmed",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Add Payment
      await databases.createDocument(config.databaseId!, COLLECTIONS.PAYMENTS, ID.unique(), {
      bookingId: booking.$id,
      paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
      paymentStatus: "paid",
      currency: "EUR",  // ✅ ADD THIS LINE
      amount: property.pricePerNight * 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
});

    }
    console.log("✅ Seeded Bookings & Payments.");

    console.log("🎉 Database Seeding Complete!");
  } catch (error) {
    console.error("❌ Error Seeding Data:", error);
  }
}

export default seed;
