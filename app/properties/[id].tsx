// app/properties/[id].tsx

import React, { useState } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import Constants from "expo-constants";

// Safely access extra configuration.
// On some platforms or in certain contexts, Constants.manifest may be null.
// We check both manifest and expoConfig, with a fallback to an empty object.
const extra = Constants.manifest?.extra || Constants.expoConfig?.extra || {};
console.log("Extra config:", extra);

import icons from "@/constants/icons";
import Comment from "@/components/Comment";
import { facilities } from "@/constants/data";

import { useAppwrite } from "@/lib/useAppwrite";
import { getPropertyById } from "@/lib/appwrite";
import BookingCalendarModal from "@/components/BookingCalendarModal"; // Import the modal component

const Property = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const windowHeight = Dimensions.get("window").height;

  const { data: property, loading, error } = useAppwrite({
    fn: (params) => getPropertyById(params.id), // ✅ Fix incorrect function signature
    params: { id: id! },
  });

  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);

  const handleBookingPress = () => {
    setIsModalVisible(true);
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Image source={icons.backArrow} style={styles.backIcon} />
      </TouchableOpacity>

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollViewContent}
        >
          {/* Property Images */}
          <FlatList
            data={property?.media || []}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(url, index) => index.toString()}
            renderItem={({ item }) => {
              if (!item) {
                console.log("❌ No valid image URL found:", item);
                return null;
              }

              console.log("🖼️ Corrected Image URL:", item);

              return (
                <Image
                  source={{ uri: item }}
                  style={styles.propertyImage}
                  onError={(e) =>
                    console.log("❌ Image Load Error:", e.nativeEvent)
                  }
                />
              );
            }}
          />

          {/* Property Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.propertyName}>
              {property?.name || "No name available"}
            </Text>
            <Text style={styles.propertyPrice}>
              ${property?.pricePerNight || "N/A"}/night
            </Text>
            <Text style={styles.propertyType}>
              {property?.type || "Unknown Type"}
            </Text>
            <Text style={styles.propertyRating}>
              ⭐ {property?.rating || "No Rating"}
            </Text>
            <Text style={styles.propertyGuests}>
              Max Guests: {property?.maxGuests || "N/A"}
            </Text>
            <Text style={styles.propertyAddress}>
              {property?.address || "Address not available"}
            </Text>
            <Text style={styles.propertyDescription}>
              {property?.description || "No description available"}
            </Text>

            {/* Facilities */}
            <Text style={styles.sectionTitle}>Facilities</Text>
            <FlatList
              data={facilities}
              horizontal
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.facilityItem}>
                  <Image source={item.icon} style={styles.facilityIcon} />
                  <Text style={styles.facilityLabel}>
                    {item.title || "Unnamed Facility"}
                  </Text>
                </View>
              )}
            />

            {/* Comments */}
            <Text style={styles.sectionTitle}>Reviews</Text>
            {property?.comments && property.comments.length > 0 ? (
              property.comments.map((comment: any) => (
                <Comment
                  key={comment.$id}
                  item={{
                    avatar:
                      comment?.avatar ||
                      "https://via.placeholder.com/100",
                    name: comment?.name || "Anonymous",
                    review: comment?.review || "No review provided.",
                    $createdAt: comment?.$createdAt,
                  }}
                />
              ))
            ) : (
              <Text style={styles.noComments}>No comments yet.</Text>
            )}
          </View>
        </ScrollView>

        {/* Booking Section */}
        <View style={styles.bookingSection}>
          <View style={styles.bookingInfo}>
            <Text style={styles.priceLabel}>Price</Text>
            <Text style={styles.priceText}>
              ${property?.pricePerNight || "N/A"}
            </Text>
          </View>

          {/* Avail Button */}
          <TouchableOpacity
            style={styles.availButton}
            onPress={handleBookingPress}
          >
            <Text style={styles.availButtonText}>Check availability</Text>
          </TouchableOpacity>
        </View>

        {/* Booking Calendar Modal */}
        {property && (
          <BookingCalendarModal
            visible={isModalVisible}
            onClose={() => setIsModalVisible(false)}
            propertyId={property.$id}
            propertyPrice={property.pricePerNight}
          />
        )}
      </View>
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
  backButton: {
    position: "absolute",
    top: 15,
    left: 15,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 10,
    borderRadius: 30,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: "#fff",
  },
  scrollViewContent: {
    paddingBottom: 32,
    backgroundColor: "#fff",
  },
  propertyImage: {
    width: Dimensions.get("window").width,
    height: 250,
    resizeMode: "cover",
  },
  infoContainer: {
    padding: 16,
  },
  propertyName: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  propertyPrice: {
    fontSize: 20,
    color: "#70d7c7",
    marginBottom: 4,
  },
  propertyType: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  propertyRating: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  propertyGuests: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 14,
    color: "#777",
    marginBottom: 16,
  },
  propertyDescription: {
    fontSize: 16,
    color: "#333",
    marginBottom: 16,
  },
  bookingSection: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: "#ccc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  availButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  priceText: {
    fontSize: 20,
    color: "#70d7c7",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  facilityItem: {
    alignItems: "center",
    marginRight: 16,
  },
  facilityIcon: {
    width: 40,
    height: 40,
    resizeMode: "contain",
  },
  facilityLabel: {
    marginTop: 4,
    fontSize: 14,
    color: "#333",
  },
  noComments: {
    textAlign: "center",
    fontSize: 16,
    color: "#555",
    fontWeight: "500",
    marginTop: 20,
  },
  bookingInfo: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: "#555",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default Property;
