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
  Permission,
} from "react-native-appwrite";
import * as Linking from "expo-linking";
import { openAuthSessionAsync } from "expo-web-browser";
import { FilterOptions } from "@/lib/types"; // Already defined in types.ts
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";


// Safely access the configuration extra values
const extra = Constants.manifest?.extra || Constants.expoConfig?.extra || {};


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
  appwritePriceAdjustmentsId = "",
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
  priceAdjustmentsId: appwritePriceAdjustmentsId,
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


/**
 * Utility: ensures hostCollectionId is defined.
 */
function getHostCollectionIdOrThrow(): string {
  const hostId = config.hostCollectionId;
  if (!hostId) {
    throw new Error("Missing host collection ID (EXPO_PUBLIC_APPWRITE_HOST_COLLECTION_ID).");
  }
  return hostId;
}


/**
 * Assign the "owner" role to a user.
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
        userId,
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
  hostId?: string;
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
    if (!bookingData.hostId) {
      // Fetch property to get hostId
      const property = await getPropertyById(bookingData.propertyId);
      if (property && (property as any).hostId) {
        bookingData.hostId = (property as any).hostId;
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
  rating: "1" | "2" | "3" | "4" | "5";
  area: number;
  amenities: string[];
  houseRulesId: string;
  isFeatured: boolean;
  pricePerNight: number;
  userId: string;
  geolocation: string;
  mediaIds: string[];
  status: "active" | "pending" | "sold" | "delisted";
  catastro: string;
  vutNumber: string;
  hostId?: string;
}): Promise<Models.Document> {
  const currentTime = new Date().toISOString();
  let hostId = data.hostId;
  if (!hostId) {
    const hostProfile = await getHostProfileByUserId(data.userId);
    hostId = hostProfile ? hostProfile.$id : undefined;
    if (!hostId) {
      throw new Error("Host profile not found; cannot create property without hostId.");
    }
  }
  const propertyData: any = { ...data, createdAt: currentTime, updatedAt: currentTime };
  // Use the non-null assertion operator to tell TypeScript that hostId is defined.
  propertyData.hostId = hostId!;

  let response: Models.Document;
  try {
    const newPropertyId = ID.unique();
console.log("Creating property with id:", newPropertyId);
response = await databases.createDocument(
  config.databaseId,
  config.propertiesCollectionId,
  newPropertyId,
  propertyData
);

    
  } catch (error: any) {
    console.error("❌ Error creating property:", error.message || error);
    throw error;
  }
  console.log("Property created with ID:", response.$id);
  try {
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
      vutNumber: data.vutNumber,
      catastro: data.catastro,
      approvalStatus: "pending",
      decisionDate: "",
      hostId: hostId!, // Now guaranteed to be a string.
    });
  } catch (glideError: any) {
    console.error("❌ Error sending property listing to Glide:", glideError.message || glideError);
  }
  return response;
}



/**
 * Upsert host profile.
 */
export async function upsertHostProfile(data: {
  userId: string;
  fullName: string;
  phoneNumber: string;
  hostDocumentUrl: string; // Expect a valid URL here for the host's ID image.
  termsAccepted?: boolean;
}): Promise<Models.Document> {
  const collectionId = config.hostCollectionId;
  if (!collectionId) {
    throw new Error("Missing host collection ID (EXPO_PUBLIC_APPWRITE_HOST_COLLECTION_ID).");
  }
  const now = new Date().toISOString();
  // Generate a new unique host ID for the host profile document.
  const newHostId = ID.unique();
  const docData: any = {
    userId: data.userId,
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    approvalStatus: "pending",
    createdAt: now,
    updatedAt: now,
    // Set hostDocumentId to the URL provided by the caller.
    hostDocumentId: data.hostDocumentUrl,
  };
  if (data.termsAccepted !== undefined) {
    docData.termsAccepted = data.termsAccepted;
  }
  try {
    const hostDoc = await databases.createDocument(
      config.databaseId,
      collectionId,
      newHostId,
      docData,
      [
        Permission.read(`user:${data.userId}`),
        Permission.update(`user:${data.userId}`),
        Permission.delete(`user:${data.userId}`)
      ]
    );
    const roles = await getRolesForUser(data.userId);
    const isOwner = roles.some((roleDoc: any) => roleDoc.role === "owner");
    const payloadApprovalStatus = isOwner ? "approved" : "pending";
    // Send host application to Glide including the new host document's ID.
    await sendHostApplicationToGlide({
      userId: data.userId,
      fullName: data.fullName,
      phoneNumber: data.phoneNumber,
      hostDocumentId: data.hostDocumentUrl,
      submissionDate: now,
      approvalStatus: payloadApprovalStatus,
      moderationComments: "",
      termsAccepted: data.termsAccepted ? "true" : "false",
      hostId: newHostId, // Pass the new host document ID as hostId.
    });
    return hostDoc;
  } catch (error: any) {
    console.error("Error creating/updating host profile document:", error.message || error);
    throw error;
  }
}


/**
 * Send Host Application to Glide.
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
  hostId: string;
}): Promise<void> {
  try {
    const payload = {
      appID: glideAppId,
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
            "fdwQC": data.hostId, // Host document ID is sent here.
          },
        },
      ],
    };
    console.log("Sending host application to Glide:", payload);
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
  vutNumber: string;
  catastro: string;
  approvalStatus: string;
  decisionDate: string;
  hostId: string;
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
            "89Fj3": data.approvalStatus,
            "hN28F": data.decisionDate,
            "wskyU": data.catastro,
            "avIOt": data.vutNumber,
            "1Odxd": data.hostId, // Pass the host ID here.
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


/**
 * Fetch amenities list.
 */
export async function getAmenities(): Promise<{
  $id: string;
  name: string;
  icon: string;
}[]> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.amenitiesCollectionId
    );
    return response.documents.map((doc) => ({
      $id: doc.$id,
      name: doc.name as string,
      icon: doc.icon as string,
    }));
  } catch (error: any) {
    console.error("❌ Error fetching amenities:", error.message || error);
    return [];
  }
}


/**
 * Define interfaces for Price Rules.
 */
export interface PriceRules extends Models.Document {
  propertyId: string;
  basePricePerNight: number;
  basePricePerNightWeekend: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  petFee?: number;
}


/**
 * Interface for updating price rules.
 */
export interface PriceRulesUpdate {
  basePricePerNight: number;
  basePricePerNightWeekend: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  petFee?: number;
  overrides?: string[];
  blockedDates?: string[];
}


/**
 * Fetch pricing rules for a given property.
 */
export async function getPriceRulesForProperty(propertyId: string): Promise<PriceRules | null> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.priceRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    if (response.documents.length > 0) {
      return response.documents[0] as PriceRules;
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching price rules:", error);
    return null;
  }
}


/**
 * Update or create pricing rules for a given property.
 */
export async function updatePriceRulesForProperty(
  propertyId: string,
  data: PriceRulesUpdate
): Promise<PriceRules> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.priceRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    if (response.documents.length > 0) {
      const existingDoc = response.documents[0];
      const updatedDoc = await databases.updateDocument(
        config.databaseId,
        config.priceRulesCollectionId,
        existingDoc.$id,
        { propertyId, ...data }
      );
      return updatedDoc as PriceRules;
    } else {
      const newDoc = await databases.createDocument(
        config.databaseId,
        config.priceRulesCollectionId,
        ID.unique(),
        { propertyId, ...data }
      );
      return newDoc as PriceRules;
    }
  } catch (error) {
    console.error("❌ Error updating price rules:", error);
    throw error;
  }
}


/**
 * Update or create price adjustments for a property.
 */
export async function updatePriceAdjustmentsForProperty(
  propertyId: string,
  adjustments: { date: string; overridePrice: number; blocked: boolean }[]
): Promise<void> {
  try {
    for (const adj of adjustments) {
      const response = await databases.listDocuments(
        config.databaseId,
        config.priceAdjustmentsId,
        [Query.equal("propertyId", propertyId), Query.equal("date", adj.date)]
      );
      if (response.documents.length > 0) {
        await databases.updateDocument(
          config.databaseId,
          config.priceAdjustmentsId,
          response.documents[0].$id,
          { propertyId, date: adj.date, overridePrice: adj.overridePrice, blocked: adj.blocked }
        );
      } else {
        await databases.createDocument(
          config.databaseId,
          config.priceAdjustmentsId,
          ID.unique(),
          { propertyId, date: adj.date, overridePrice: adj.overridePrice, blocked: adj.blocked }
        );
      }
    }
    console.log("Price adjustments updated for property", propertyId);
  } catch (error) {
    console.error("Error updating price adjustments:", error);
    throw error;
  }
}


/**
 * Get price adjustments for a property.
 */
export async function getPriceAdjustmentsForProperty(propertyId: string): Promise<any[]> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.priceAdjustmentsId,
      [Query.equal("propertyId", propertyId)]
    );
    return response.documents;
  } catch (error) {
    console.error("Error fetching price adjustments:", error);
    return [];
  }
}


export type CancellationPolicy = "Firm" | "Strict" | "Free" | "Non-refundable";


export interface BookingRules extends Models.Document {
  cancellationPolicy: CancellationPolicy;
  instantBook: boolean;
  userId: string;
  propertyId: string;
  minStay: number;
  maxStay: number;
  advanceNotice: number;
}


export interface BookingRulesUpdate {
  cancellationPolicy: CancellationPolicy;
  instantBook: boolean;
  minStay: number;
  maxStay: number;
  advanceNotice: number;
}


/**
 * Create or update booking rules for a property.
 */
export async function createOrUpdateBookingRulesForProperty(
  propertyId: string,
  data: BookingRulesUpdate,
  currentUserId: string
): Promise<BookingRules> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.bookingRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );


    const permissions = [
      Permission.read(`user:${currentUserId}`),
      Permission.update(`user:${currentUserId}`),
      Permission.delete(`user:${currentUserId}`)
    ];


    if (response.documents.length > 0) {
      const existingDoc = response.documents[0];
      const updatedDoc = await databases.updateDocument(
        config.databaseId,
        config.bookingRulesCollectionId,
        existingDoc.$id,
        { propertyId, ...data }
      );
      return updatedDoc as BookingRules;
    } else {
      const newDoc = await databases.createDocument(
        config.databaseId,
        config.bookingRulesCollectionId,
        ID.unique(),
        { propertyId, ...data },
        permissions
      );
      return newDoc as BookingRules;
    }
  } catch (error) {
    console.error("❌ Error creating/updating booking rules:", error);
    throw error;
  }
}
export const getBookingRulesForProperty = async (propertyId: string) => {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.bookingRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    // If a document exists, return the first one
    if (response.documents.length > 0) {
      return response.documents[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching booking rules:", error);
    throw error;
  }
};




/**
 * Define an interface for House Rules using the new schema.
 */
export interface HouseRules extends Models.Document {
  propertyId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  petsAllowed: boolean;
  guestsMax: number;
  smokingAllowed: boolean;
}


export interface HouseRulesUpdate {
  checkIn: string;
  checkOut: string;
  petsAllowed: boolean;
  guestsMax: number;
  smokingAllowed: boolean;
}


/**
 * Fetch house rules for a property.
 */
export async function getHouseRulesForProperty(propertyId: string): Promise<HouseRules | null> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.houseRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    // Return the first matching document, if any.
    if (response.documents.length > 0) {
      return response.documents[0] as HouseRules;
    }
    return null;
  } catch (error) {
    console.error("❌ Error fetching house rules for property:", error);
    return null;
  }
}



/**
 * Update or create house rules for a property.
 */
export async function updateHouseRulesForProperty(
  propertyId: string,
  data: HouseRulesUpdate
): Promise<HouseRules> {
  try {
    const response = await databases.listDocuments(
      config.databaseId,
      config.houseRulesCollectionId,
      [Query.equal("propertyId", propertyId)]
    );
    if (response.documents.length > 0) {
      const existingDoc = response.documents[0];
      const updatedDoc = await databases.updateDocument(
        config.databaseId,
        config.houseRulesCollectionId,
        existingDoc.$id,
        { propertyId, ...data }
      );
      return updatedDoc as HouseRules;
    } else {
      const newDoc = await databases.createDocument(
        config.databaseId,
        config.houseRulesCollectionId,
        ID.unique(),
        { propertyId, ...data }
      );
      return newDoc as HouseRules;
    }
  } catch (error) {
    console.error("❌ Error updating house rules:", error);
    throw error;
  }
}


export const getBookingsByHost = async (hostId: string) => {
  try {
    console.log("Fetching bookings for hostId:", hostId);
   
    // First try querying by "hostId"
    let response = await databases.listDocuments(
      config.databaseId,
      config.bookingsCollectionId,
      [Query.equal("hostId", hostId)]
    );
    console.log("Response using hostId:", response.documents);
   
    // If no bookings found, try using "userId" instead.
    if (response.documents.length === 0) {
      console.log('No bookings found using "hostId", trying "userId" instead.');
      response = await databases.listDocuments(
        config.databaseId,
        config.bookingsCollectionId,
        [Query.equal("userId", hostId)]
      );
      console.log("Response using userId:", response.documents);
    }
   
    return response.documents;
  } catch (error) {
    console.error("Error fetching bookings by host:", error);
    throw error;
  }
  

};

export { ID, Query, };


