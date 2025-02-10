import React, { useState, useRef } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StyleSheet,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";

import icons from "@/constants/icons";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";
import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById } from "@/lib/appwrite";
import BookingFlowSheet, { BookingFlowSheetRef } from "@/components/BookingFlowSheet";

const { width: windowWidth, height: windowHeight } = Dimensions.get("window");
const IMAGE_SLIDER_HEIGHT = windowHeight / 3; // top third for images

// --- Helper Functions ---

// Formats a date string (e.g. "2023-07-21") to "21Jul"
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const day = ("0" + date.getDate()).slice(-2);
  const month = date.toLocaleString("en-US", { month: "short" });
  return `${day}${month}`;
};

// Returns a fallback date range for the next 2 weeks (e.g. "07-21Jul")
const formatDateRange = () => {
  const today = new Date();
  const nextTwoWeeks = new Date();
  nextTwoWeeks.setDate(today.getDate() + 14);
  const startDay = ("0" + today.getDate()).slice(-2);
  const endDay = ("0" + nextTwoWeeks.getDate()).slice(-2);
  const endMonth = nextTwoWeeks.toLocaleString("en-US", { month: "short" });
  return `${startDay}-${endDay}${endMonth}`;
};

// Given an object of daily prices (keyed by ISO date strings),
// returns the date (or range if contiguous) for which the nightly price is lowest
const getLowestPriceDateRange = (dailyPrices: Record<string, number>) => {
  const today = new Date();
  const nextTwoWeeks = new Date();
  nextTwoWeeks.setDate(today.getDate() + 14);

  const pricesInRange = Object.entries(dailyPrices).filter(([dateStr, price]) => {
    const date = new Date(dateStr);
    return date >= today && date <= nextTwoWeeks;
  });

  if (pricesInRange.length === 0) return "";

  let lowestPrice = Infinity;
  let lowestDates: string[] = [];
  for (const [dateStr, price] of pricesInRange) {
    if (price < lowestPrice) {
      lowestPrice = price;
      lowestDates = [dateStr];
    } else if (price === lowestPrice) {
      lowestDates.push(dateStr);
    }
  }
  lowestDates.sort();
  if (lowestDates.length === 1) {
    return formatDate(lowestDates[0]);
  } else {
    return `${formatDate(lowestDates[0])} - ${formatDate(lowestDates[lowestDates.length - 1])}`;
  }
};

// --- Component ---
const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();

  const { data: property, loading, error } = useAppwrite({
    fn: (params) => getPropertyById(params.id),
    params: { id: id! },
  });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 });
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentImageIndex(viewableItems[0].index);
    }
  });

  const [showAllAmenities, setShowAllAmenities] = useState(false);

  // Create a ref for the BookingFlowSheet
  const bookingSheetRef = useRef<BookingFlowSheetRef>(null);

  // When Reserve Now is pressed, open the bottom sheet using open()
  const handleReserveNow = () => {
    console.log("Reserve Now button pressed", bookingSheetRef.current);
    bookingSheetRef.current?.open();
  };

  const handleConfirmBooking = () => {
    console.log("Booking confirmed!");
    bookingSheetRef.current?.close();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error || !property) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>Error loading property.</Text>
      </SafeAreaView>
    );
  }

  const lowestPriceDates = property.dailyPrices
    ? getLowestPriceDateRange(property.dailyPrices)
    : formatDateRange();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />
      {/* Header Overlay */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerIconLeft} onPress={() => router.back()}>
          <Image source={icons.backArrow} style={styles.icon} />
        </TouchableOpacity>
        <View style={styles.headerIconsRight}>
          <TouchableOpacity style={styles.headerIcon}>
            <Image source={icons.share} style={styles.icon} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIcon}>
            <Image source={icons.heart} style={styles.icon} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Image Slider */}
        <View style={styles.imageSliderContainer}>
          <FlatList
            data={property.media || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            onViewableItemsChanged={onViewableItemsChanged.current}
            viewabilityConfig={viewabilityConfig.current}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.propertyImage} resizeMode="cover" />
            )}
          />
          <View style={styles.imageCountOverlay}>
            <Text style={styles.imageCountText}>
              {currentImageIndex + 1}/{property.media?.length || 0}
            </Text>
          </View>
        </View>

        {/* Property Basic Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.propertyTitle}>{property.name || "No name available"}</Text>
          <Text style={styles.propertyLocation}>{property.address || "Location not available"}</Text>
          <Text style={styles.propertyType}>{property.type || "Unknown Type"}</Text>
          <Text style={styles.propertyRating}>⭐ {property.rating || "No Rating"}</Text>
        </View>

        {/* Description Card */}
        {property.description && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{property.description}</Text>
          </View>
        )}

        {/* Amenities Card */}
        {property.amenities && property.amenities.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Amenities</Text>
            <View style={styles.amenitiesContainer}>
              {(showAllAmenities ? property.amenities : property.amenities.slice(0, 5)).map(
                (amenity: string, index: number) => (
                  <View key={index} style={styles.amenityItem}>
                    <Text style={styles.amenityText}>{amenity}</Text>
                  </View>
                )
              )}
            </View>
            {property.amenities.length > 5 && (
              <TouchableOpacity onPress={() => setShowAllAmenities((prev) => !prev)}>
                <Text style={styles.expandAmenitiesText}>
                  {showAllAmenities ? "Show Less" : "View All Amenities"}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Google Map Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Location on Map</Text>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapText}>Google Map Placeholder</Text>
          </View>
        </View>

        {/* Reviews Horizontal Scroll Card */}
        {property.comments && property.comments.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Reviews</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {property.comments.map((comment: any) => (
                <View key={comment.$id} style={styles.reviewCard}>
                  <Image
                    source={{ uri: comment.avatar || "https://via.placeholder.com/80" }}
                    style={styles.reviewAvatar}
                  />
                  <Text style={styles.reviewName}>{comment.name || "Anonymous"}</Text>
                  <Text style={styles.reviewSnippet} numberOfLines={2}>
                    {comment.review || ""}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Host Details Card */}
        {property.host && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Host Details</Text>
            <View style={styles.hostContainer}>
              <Image
                source={{ uri: property.host.avatar || "https://via.placeholder.com/80" }}
                style={styles.hostAvatar}
              />
              <View style={styles.hostInfo}>
                <Text style={styles.hostName}>{property.host.name || "Host Name"}</Text>
                <TouchableOpacity style={styles.messageButton}>
                  <Text style={styles.messageButtonText}>Message Host</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* House Rules Card */}
        {property.houseRules && property.houseRules.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>House Rules</Text>
            {property.houseRules.map((rule: string, index: number) => (
              <Text key={index} style={styles.houseRuleText}>
                • {rule}
              </Text>
            ))}
          </View>
        )}

        {/* Extra spacing so content doesn't hide behind bottom bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Lowest Price Dates</Text>
          <Text style={styles.priceText}>{lowestPriceDates}</Text>
        </View>
        <TouchableOpacity style={styles.reserveButton} onPress={handleReserveNow}>
          <Text style={styles.reserveButtonText}>Reserve Now</Text>
        </TouchableOpacity>
      </View>

      {/* Booking Flow Bottom Sheet */}
      <BookingFlowSheet
        ref={bookingSheetRef}
        onBook={handleConfirmBooking}
        property={property}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140, // leave space for bottom bar
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Header Overlay
  header: {
    position: "absolute",
    top: Constants.statusBarHeight + 5,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    zIndex: 10,
  },
  headerIconLeft: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
  },
  headerIconsRight: {
    flexDirection: "row",
  },
  headerIcon: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 8,
    borderRadius: 20,
    marginLeft: 10,
  },
  icon: {
    width: 20,
    height: 20,
    tintColor: "#fff",
  },
  // Image Slider
  imageSliderContainer: {
    height: IMAGE_SLIDER_HEIGHT,
    position: "relative",
  },
  propertyImage: {
    width: windowWidth,
    height: IMAGE_SLIDER_HEIGHT,
  },
  imageCountOverlay: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  imageCountText: {
    color: "#fff",
    fontSize: 14,
  },
  // Basic Property Info
  infoContainer: {
    padding: 16,
  },
  propertyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  propertyLocation: {
    fontSize: 16,
    color: "#777",
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 16,
    color: "#555",
    marginBottom: 8,
  },
  propertyRating: {
    fontSize: 16,
    color: "#555",
  },
  // Card container used for several sections
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  descriptionText: {
    fontSize: 16,
    color: "#444",
  },
  // Amenities Section
  amenitiesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  amenityItem: {
    backgroundColor: "#f2f2f2",
    borderRadius: 5,
    padding: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  amenityText: {
    fontSize: 14,
    color: "#333",
  },
  expandAmenitiesText: {
    color: "#70d7c7",
    fontSize: 14,
    marginTop: 4,
    textAlign: "right",
  },
  // Map Placeholder
  mapPlaceholder: {
    height: 200,
    backgroundColor: "#e0e0e0",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  mapText: {
    fontSize: 16,
    color: "#555",
  },
  // Reviews Horizontal Scroll
  reviewCard: {
    width: 200,
    marginRight: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 10,
  },
  reviewAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  reviewSnippet: {
    fontSize: 14,
    color: "#555",
  },
  // Host Details
  hostContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  hostInfo: {
    flex: 1,
  },
  hostName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  messageButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  messageButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  // House Rules
  houseRuleText: {
    fontSize: 16,
    color: "#444",
    marginBottom: 4,
  },
  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "column",
  },
  priceLabel: {
    fontSize: 12,
    color: "#777",
  },
  priceText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#70d7c7",
  },
  reserveButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 30,
    alignItems: "center",
  },
  reserveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Property;
