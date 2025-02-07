// app.config.js
import 'dotenv/config';

export default {
  expo: {
    name: "shr_project",
    slug: "shr_project",
    version: "1.0.0",
    scheme: "shr_project",
    orientation: "portrait",
    icon: "./assets/icons/dumbell.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    updates: {
      fallbackToCacheTimeout: 0,
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      appwriteEndpoint: process.env.EXPO_PUBLIC_APPWRITE_ENDPOINT,
      appwriteProjectId: process.env.EXPO_PUBLIC_APPWRITE_PROJECT_ID,
      appwriteDatabaseId: process.env.EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      appwriteMediaBucketId: process.env.EXPO_PUBLIC_APPWRITE_MEDIA_BUCKET_ID,
      appwriteGalleriesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GALLERIES_COLLECTION_ID,
      appwriteReviewsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_REVIEWS_COLLECTION_ID,
      appwriteAgentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AGENTS_COLLECTION_ID,
      appwritePropertiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
      appwriteBookingsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BOOKINGS_COLLECTION_ID,
      appwriteRolesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
      appwriteBookingRulesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_BOOKING_RULES_COLLECTION_ID,
      appwriteGuestDetailsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_GUEST_DETAILS_COLLECTION_ID,
      appwritePaymentsCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PAYMENTS_COLLECTION_ID,
      appwritePriceRulesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_PRICE_RULES_COLLECTION_ID,
      appwriteUsersCollectionId: process.env.EXPO_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
      appwriteMediaCollectionId: process.env.EXPO_PUBLIC_APPWRITE_MEDIA_COLLECTION_ID,
      appwriteHouseRulesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_HOUSE_RULES_COLLECTION_ID,
      appwriteAmenitiesCollectionId: process.env.EXPO_PUBLIC_APPWRITE_AMENITIES_COLLECTION_ID,
      appwriteHostCollectionId: process.env.EXPO_PUBLIC_APPWRITE_HOST_COLLECTION_ID,
      glideApiKey: process.env.GLIDE_API_KEY,
      glideAppId: process.env.GLIDE_APP_ID,
      webhookSecret: process.env.WEBHOOK_SECRET,
    },
  },
};
