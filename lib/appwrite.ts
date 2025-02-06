// lib/appwrite.ts
import {
  Client,
  Account,
  ID,
  Databases,
  OAuthProvider,
  Avatars,
  Query,
  Storage,
  Models,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { FilterOptions } from "@/lib/types"; // Already defined in types.ts
import Constants from "expo-constants";

// Safely access the configuration extra values
const extra = Constants.manifest?.extra || Constants.expoConfig?.extra || {};

// Destructure with default values
const {
  appwriteEndpoint = "",
  appwriteProjectId = "",
  appwriteDatabaseId = "",
  appwriteMediaBucketId = "",
  appwriteGalleriesCollectionId = "",
  appwriteReviewsCollectionId = "",
  appwriteAgentsCollectionId = "",
  appwritePropertiesCollectionId = "",
  appwriteBookingsCollectionId = "",
  appwriteRolesCollectionId = "",
  appwriteBookingRulesCollectionId = "",
  appwriteGuestDetailsCollectionId = "",
  appwritePaymentsCollectionId = "",
  appwritePriceRulesCollectionId = "",
  appwriteUsersCollectionId = "",
  appwriteMediaCollectionId = "",
  appwriteHouseRulesCollectionId = "",
  appwriteAmenitiesCollectionId = "",
  appwriteHostCollectionId = "",
  glideApiKey = "",
  glideAppId = "",
  webhookSecret = "",
} = extra;

export const config = {
  platform: "com.spanishholidayrentals.shr",
  endpoint: appwriteEndpoint,
  projectId: appwriteProjectId,
  databaseId: appwriteDatabaseId,
  bucketId: appwriteMediaBucketId,
  galleriesCollectionId: appwriteGalleriesCollectionId,
  reviewsCollectionId: appwriteReviewsCollectionId,
  agentsCollectionId: appwriteAgentsCollectionId,
  propertiesCollectionId: appwritePropertiesCollectionId,
  bookingsCollectionId: appwriteBookingsCollectionId,
  rolesCollectionId: appwriteRolesCollectionId,
  bookingRulesCollectionId: appwriteBookingRulesCollectionId,
  guestDetailsCollectionId: appwriteGuestDetailsCollectionId,
  paymentsCollectionId: appwritePaymentsCollectionId,
  priceRulesCollectionId: appwritePriceRulesCollectionId,
  usersCollectionId: appwriteUsersCollectionId,
  mediaCollectionId: appwriteMediaCollectionId,
  houseRulesCollectionId: appwriteHouseRulesCollectionId,
  amenitiesCollectionId: appwriteAmenitiesCollectionId,
  hostCollectionId: appwriteHostCollectionId,
};

export const glideConfig = {
  glideApiKey,
  glideAppId,
  webhookSecret,
};

export const client = new Client()
  .setEndpoint(config.endpoint)
  .setProject(config.projectId)
  .setPlatform(config.platform);

export const avatar = new Avatars(client);
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// Utility: ensures hostCollectionId is defined
function getHostCollectionIdOrThrow(): string {
  const hostId = config.hostCollectionId;
  if (!hostId) {
    throw new Error("Missing host collection ID (EXPO_PUBLIC_APPWRITE_HOST_COLLECTION_ID).");
  }
  return hostId;
}

/**
 * Assign the "owner" role to a user.
 * This function creates a new document in the roles collection.
 */
export async function addOwnerRole(userId: string): Promise<Models.Document | null> {
  try {
    console.log("Adding owner role for user:", userId);
    const currentTime = new Date().toISOString();
    const response = await databases.createDocument<Models.Document>(
      config.databaseId,
      config.rolesCollectionId,
      ID.unique(),
      {
        userId, // Ensure this is a valid string.
        role: "owner",
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    );
    return response;
  } catch (error: any) {
    console.error("❌ Error adding owner role:", error.message || error);
    throw error;
  }
}

/**
 * OAuth2 Login with Google.
 */
export async function login() {
  try {
    const redirectUri = Linking.createURL("/auth");
    const response = await account.createOAuth2Token(OAuthProvider.Google, redirectUri);
    if (!response) throw new Error("Create OAuth2 token failed");

    const browserResult = await openAuthSessionAsync(response.toString(), redirectUri);
    if (browserResult.type !== "success") throw new Error("Login cancelled");

    const url = new URL(browserResult.url);
    const secret = url.searchParams.get("secret")?.toString();
    const userId = url.searchParams.get("userId")?.toString();
    if (!secret || !userId) throw new Error("Missing authentication parameters");

    const session = await account.createSession(userId, secret);
    if (!session) throw new Error("Session creation failed");

    return true;
  } catch (error) {
    console.error("❌ Login Error:", error);
    return false;
  }
}

/**
 * Logout current session.
 */
export async function logout() {
  try {
    return await account.deleteSession("current");
  } catch (error) {
    console.error("❌ Logout Error:", error);
    return false;
  }
}



/**
 * Fetch roles for a user.
 */
export async function getRolesForUser(userId: string) {
  try {
    const result = await databases.listDocuments(
      config.databaseId,
      config.rolesCollectionId,
      [Query.equal("userId", userId)]
    );
    return result.documents;
  } catch (error) {
    console.error("Error fetching user roles:", error);
    return [];
  }
}

/**
 * Get the current logged-in user.
 */
export async function getCurrentUser() {
  try {
    const sessionList = await account.listSessions();
    if (!sessionList.sessions.length) return null;

    const result = await account.get();
    if (result.$id) {
      const initials = avatar.getInitials(result.name).toString();
      return { ...result, avatar: initials };
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching current user:", error);
    return null;
  }
}

/**
 * Get current user ID.
 */
export async function getCurrentUserId() {
  try {
    const user = await account.get();
    return user.$id;
  } catch (error) {
    console.error("❌ Error fetching current user ID:", error);
    return null;
  }
}

/**
 * (Used by BookingCalendarModal) Return daily prices or a mock object.
 */
export async function getDailyPricesForProperty(propertyId: string): Promise<Record<string, number>> {
  try {
    return {};
  } catch (error) {
    console.error("❌ Error fetching daily prices:", error);
    return {};
  }
}

/**
 * Fetch single property by ID.
 */
export async function getPropertyById(id: string): Promise<Models.Document | null> {
  try {
    const property = await databases.getDocument<Models.Document>(
      config.databaseId,
      config.propertiesCollectionId,
      id
    );

    const mediaFiles = await databases.listDocuments<Models.Document & { fileId: string }>(
      config.databaseId,
      config.mediaCollectionId,
      [Query.equal("propertyId", id)]
    );

    const mediaUrls = mediaFiles.documents.map(
      (media) =>
        `https://cloud.appwrite.io/v1/storage/buckets/${config.bucketId}/files/${media.fileId}/preview?project=${config.projectId}`
    );

    return { ...property, media: mediaUrls };
  } catch (error) {
    console.error("❌ Error fetching property:", error);
    return null;
  }
}

/**
 * Fetch properties with FilterOptions.
 */
export async function getProperties({
  filter,
  query,
  limit = 6,
}: {
  filter: string;
  query: string;
  limit?: number;
}): Promise<Models.Document[]> {
  try {
    const filterOptions: FilterOptions = JSON.parse(filter);
    const queries: any[] = [Query.orderDesc("$createdAt"), Query.limit(limit)];

    if (filterOptions.category && filterOptions.category !== "All") {
      queries.push(Query.equal("type", filterOptions.category));
    }

    if (filterOptions.location && filterOptions.location.trim() !== "") {
      queries.push(Query.search("location", filterOptions.location));
    }

    if (
      filterOptions.priceMin !== undefined &&
      filterOptions.priceMax !== undefined &&
      filterOptions.priceMin <= filterOptions.priceMax
    ) {
      queries.push(Query.between("pricePerNight", filterOptions.priceMin, filterOptions.priceMax));
    }

    if (filterOptions.bedrooms && filterOptions.bedrooms > 0) {
      queries.push(Query.greaterThanEqual("bedrooms", filterOptions.bedrooms));
    }

    if (filterOptions.bathrooms && filterOptions.bathrooms > 0) {
      queries.push(Query.greaterThanEqual("bathrooms", filterOptions.bathrooms));
    }

    if (filterOptions.amenities && filterOptions.amenities.length > 0) {
      filterOptions.amenities.forEach((amenity: string) => {
        queries.push(Query.equal("amenities", amenity));
      });
    }

    if (filterOptions.guestCount && filterOptions.guestCount > 1) {
      queries.push(Query.greaterThanEqual("maxGuests", filterOptions.guestCount));
    }

    if (filterOptions.startDate) {
      queries.push(Query.greaterThanEqual("availableFrom", filterOptions.startDate));
    }

    if (filterOptions.endDate) {
      queries.push(Query.lessThanEqual("availableTo", filterOptions.endDate));
    }

    if (query && query.trim() !== "") {
      queries.push(Query.search("name", query));
    }

    const propertiesResponse = await databases.listDocuments<Models.Document>(
      config.databaseId,
      config.propertiesCollectionId,
      queries
    );

    if (propertiesResponse.documents.length === 0) return [];

    const propertyIds = propertiesResponse.documents.map((prop) => prop.$id);

    const mediaResponse = await databases.listDocuments<
      Models.Document & { propertyId: { $id: string }; fileId: string }
    >(config.databaseId, config.mediaCollectionId, [Query.equal("propertyId", propertyIds)]);

    const propertyMediaMap: Record<string, string[]> = {};
    mediaResponse.documents.forEach((media) => {
      const propertyId = media.propertyId.$id;
      const imageUrl = `https://cloud.appwrite.io/v1/storage/buckets/${config.bucketId}/files/${media.fileId}/preview?project=${config.projectId}`;
      if (!propertyMediaMap[propertyId]) propertyMediaMap[propertyId] = [];
      propertyMediaMap[propertyId].push(imageUrl);
    });

    return propertiesResponse.documents.map((property) => ({
      ...property,
      media: propertyMediaMap[property.$id] || [],
    }));
  } catch (error: any) {
    console.error("❌ Error fetching properties:", error.message || error);
    throw error;
  }
}

/**
 * Fetch the latest properties.
 */
export async function getLatestProperties(): Promise<Models.Document[]> {
  try {
    const response = await databases.listDocuments<Models.Document>(
      config.databaseId,
      config.propertiesCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(5)]
    );

    return response.documents.map((property) => ({
      ...property,
      media: (property.mediaIds || []).map(
        (m: { fileId: string }) =>
          `https://cloud.appwrite.io/v1/storage/buckets/${config.bucketId}/files/${m.fileId}/preview?project=${config.projectId}`
      ),
    }));
  } catch (error) {
    console.error("❌ Error fetching latest properties:", error);
    return [];
  }
}

/**
 * Create a new booking.
 */
export async function createBooking(bookingData: {
  userId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  bookingReference: string;
  createdAt: string;
  updatedAt: string;
  status: string;
}) {
  try {
    const requiredFields = [
      "userId",
      "propertyId",
      "startDate",
      "endDate",
      "totalPrice",
      "bookingReference",
      "createdAt",
      "updatedAt",
      "status",
    ];

    for (const field of requiredFields) {
      if (!bookingData[field as keyof typeof bookingData]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    const response = await databases.createDocument(
      config.databaseId,
      config.bookingsCollectionId,
      ID.unique(),
      bookingData
    );
    return response;
  } catch (error: any) {
    console.error("❌ Error creating booking:", error.message || error);
    throw error;
  }
}

/**
 * Fetch bookings for a given property.
 */
export async function getBookingsForProperty(propertyId: string): Promise<any[]> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.bookingsCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    return response.documents;
  } catch (error: any) {
    console.error("❌ Error fetching bookings for property:", error.message || error);
    return [];
  }
}

/**
 * Create a new property listing.
 */
export async function createProperty(data: {
  name: string;
  type: string;
  description: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  rating: number;
  area: number;
  amenities: string[];
  houseRulesId: string;
  isFeatured: boolean;
  pricePerNight: number;
  userId: string;
  geolocation: string;
  mediaIds: string[];
  status: "active" | "pending" | "sold" | "delisted";
}): Promise<Models.Document> {
  try {
    const currentTime = new Date().toISOString();
    const response = await databases.createDocument<Models.Document>(
      config.databaseId,
      config.propertiesCollectionId,
      ID.unique(),
      {
        ...data,
        createdAt: currentTime,
        updatedAt: currentTime,
      }
    );
    // After creating the property in Appwrite, send the data to Glide for moderation.
    await sendPropertyListingToGlide({
      propertyId: response.$id,
      userId: data.userId,
      name: data.name,
      type: data.type,
      description: data.description,
      address: data.address,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      area: data.area,
      amenities: data.amenities.join(","),
      houseRulesId: data.houseRulesId,
      pricePerNight: data.pricePerNight,
      geolocation: data.geolocation,
      mediaIds: data.mediaIds.join(","),
      status: data.status,
      submissionDate: currentTime,
      moderationComments: "",
    });
    return response;
  } catch (error: any) {
    console.error("❌ Error creating property:", error.message || error);
    throw error;
  }
}

export async function upsertHostProfile(data: {
  userId: string;
  fullName: string;
  phoneNumber: string;
  hostDocumentId?: string;
  termsAccepted?: boolean;
}): Promise<Models.Document | null> {
  try {
    // Check for required fields
    if (!data.userId || !data.fullName || !data.phoneNumber) {
      throw new Error("Missing required host signup fields");
    }

    const hostCollId = getHostCollectionIdOrThrow();
    const currentTime = new Date().toISOString();

    // Check if a host profile already exists for the given userId.
    const existingProfiles = await databases.listDocuments<Models.Document>(
      config.databaseId,
      hostCollId,
      [Query.equal("userId", data.userId)]
    );

    let response: Models.Document;
    if (existingProfiles.documents.length > 0) {
      // Update the existing host profile.
      const existingProfile = existingProfiles.documents[0];
      response = await databases.updateDocument<Models.Document>(
        config.databaseId,
        hostCollId,
        existingProfile.$id,
        { ...data, updatedAt: currentTime }
      );
    } else {
      // Create a new host profile with approvalStatus set to "pending".
      response = await databases.createDocument<Models.Document>(
        config.databaseId,
        hostCollId,
        ID.unique(),
        {
          ...data,
          approvalStatus: "pending", // New profile marked as pending
          createdAt: currentTime,
          updatedAt: currentTime,
        }
      );
    }

    // Send host application data to Glide.
    // This payload also uses "pending" as the initial status.
    await sendHostApplicationToGlide({
      userId: data.userId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      hostDocumentId: data.hostDocumentId || "",
      submissionDate: currentTime,
      approvalStatus: "pending", // Sends "pending" to Glide
      moderationComments: "",
      termsAccepted: data.termsAccepted ? "true" : "false",
    });
    
    return response;
  } catch (error: any) {
    console.error("❌ Error upserting host profile:", error.message || error);
    throw error;
  }
}

/**
 * Send Host Application to Glide:
 * This function sends a payload to Glide for moderation.
 */
export async function sendHostApplicationToGlide(data: {
  userId: string;
  fullName: string;
  phoneNumber: string;
  hostDocumentId: string;
  submissionDate: string;
  approvalStatus: string;
  moderationComments: string;
  termsAccepted: string;
}): Promise<void> {
  try {
    const payload = {
      appID: glideAppId, // Should be defined in your configuration
      mutations: [
        {
          kind: "add-row-to-table",
          tableName: "native-table-APR24dn29PKTMCX5jwSK",
          columnValues: {
            "tD0Q1": data.userId,
            "LpPuZ": data.phoneNumber,
            "dyeiF": data.hostDocumentId,
            "FozJh": data.submissionDate,
            "vObBS": data.approvalStatus,
            "6sUf9": data.moderationComments,
            "0O96C": data.fullName,
            "KnJ6a": data.termsAccepted,
          },
        },
      ],
    };

    console.log("Sending host application to Glide:", payload);
    const response = await fetch("https://api.glideapp.io/api/function/mutateTables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${glideApiKey}`, // Should be defined in your configuration
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Glide API error: ${errText}`);
    }
    console.log("Host application sent to Glide successfully.");
  } catch (error: any) {
    console.error("❌ Error sending host application to Glide:", error.message || error);
  }
}


/**
 * Send property listing data to Glide for moderation.
 */
export async function sendPropertyListingToGlide(data: {
  propertyId: string;
  userId: string;
  name: string;
  type: string;
  description: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  area: number;
  amenities: string;
  houseRulesId: string;
  pricePerNight: number;
  geolocation: string;
  mediaIds: string;
  status: string;
  submissionDate: string;
  moderationComments: string;
}): Promise<void> {
  try {
    const payload = {
      appID: glideAppId,
      mutations: [
        {
          kind: "add-row-to-table",
          tableName: "native-table-1PvO9KogUzGdhVvg5gwk",
          columnValues: {
            "tn7mD": data.propertyId,
            "kD5So": data.userId,
            "CeQ6z": data.name,
            "49pT9": data.type,
            "wUOHv": data.description,
            "mzH29": data.address,
            "dIhpm": data.bedrooms,
            "XTCVd": data.bathrooms,
            "N0wwF": data.area,
            "872Qx": data.amenities,
            "TXW72": data.houseRulesId,
            "0BH9q": data.pricePerNight,
            "o6m5O": data.geolocation,
            "eFYZp": data.mediaIds,
            "a7QEz": data.status,
            "ns9Fx": data.submissionDate,
            "z9i3C": data.moderationComments,
          },
        },
      ],
    };

    console.log("Sending property listing to Glide:", payload);
    const response = await fetch("https://api.glideapp.io/api/function/mutateTables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${glideApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Glide API error: ${errText}`);
    }
    console.log("Property listing sent to Glide successfully.");
  } catch (error: any) {
    console.error("❌ Error sending property listing to Glide:", error.message || error);
  }
}

/**
 * Fetch host profile by userId.
 */
export async function getHostProfileByUserId(userId: string): Promise<Models.Document | null> {
  try {
    const hostCollId = config.hostCollectionId;
    if (!hostCollId) {
      throw new Error("Missing host collection ID (EXPO_PUBLIC_APPWRITE_HOST_COLLECTION_ID).");
    }
    const result = await databases.listDocuments<Models.Document>(
      config.databaseId,
      hostCollId,
      [Query.equal("userId", userId)]
    );
    if (result.documents.length > 0) {
      return result.documents[0];
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching host profile:", error);
    return null;
  }
}

/**
 * Fetch properties by user.
 */
export async function getPropertiesByUser(userId: string): Promise<Models.Document[]> {
  try {
    const queries = [Query.equal("userId", userId)];
    const propertiesResponse = await databases.listDocuments<Models.Document>(
      config.databaseId,
      config.propertiesCollectionId,
      queries
    );
    return propertiesResponse.documents;
  } catch (error) {
    console.error("❌ Error fetching properties for user:", error);
    return [];
  }
}
