import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
  Image,
  SafeAreaView,
} from "react-native";
import { Modalize } from "react-native-modalize";
import PricingCalendarBottomSheet from "../../../components/PricingCalendarBottomSheet";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  getPropertiesByUser,
  getPriceRulesForProperty,
  getBookingsForProperty,
  getPriceAdjustmentsForProperty,
  getCurrentUserId,
} from "../../../lib/appwrite";
import { handleSaveAdjustments } from "../../../lib/priceHelpers";

// Updated interface to include images field.
interface Property {
  $id: string;
  name: string;
  propertyId: string;
  images?: string[]; // stringified array of image objects
}

// Define the shape of the combined pricing data.
interface PricingData {
  priceRules: {
    basePricePerNight: number;
    basePricePerNightWeekend: number;
  };
  bookedDates: string[];
  priceOverrides: Record<string, number>;
  blockedDates: string[];
}

// Helper functions to generate and normalize dates.
const getDatesRange = (start: string, end: string): string[] => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const dates: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    dates.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const normalizeDate = (date: string): string => {
  return new Date(date).toISOString().split("T")[0];
};

const HostCalendarPage: React.FC = () => {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const modalizeRef = useRef<any>(null);

  // Fetch properties on mount.
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const userId = await getCurrentUserId();
        if (!userId) {
          console.error("No current user found");
          return;
        }
        const docs = await getPropertiesByUser(userId);
        console.log("Fetched properties:", docs);
        const mappedProperties: Property[] = docs.map((doc: any) => ({
          $id: doc.$id,
          name: doc.name,
          propertyId: doc.propertyId || doc.$id,
          images: doc.images, // Preserve images array (stringified objects)
        }));
        setProperties(mappedProperties);
        console.log("Mapped properties:", mappedProperties);
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };
    fetchProperties();
  }, []);

  // When a property is selected, fetch its pricing data.
  const onSelectProperty = async (propertyId: string) => {
    setSelectedProperty(propertyId);
    setLoading(true);
    try {
      const priceRules = await getPriceRulesForProperty(propertyId);
      console.log("Fetched PriceRules:", priceRules);

      const bookings = await getBookingsForProperty(propertyId);
      console.log("Fetched bookings:", bookings);
      let allBookedDates: string[] = [];
      bookings.forEach((booking: any) => {
        if (booking.startDate && booking.endDate) {
          const dates = getDatesRange(booking.startDate, booking.endDate);
          allBookedDates = allBookedDates.concat(dates);
        } else if (booking.startDate) {
          allBookedDates.push(normalizeDate(booking.startDate));
        }
      });
      allBookedDates = Array.from(new Set(allBookedDates));
      console.log("Calculated booked dates:", allBookedDates);

      const adjustments = await getPriceAdjustmentsForProperty(propertyId);
      console.log("Fetched adjustments (raw):", adjustments);
      const priceOverrides: Record<string, number> = {};
      const blockedDates: string[] = [];
      adjustments.forEach((doc: any) => {
        if (doc.date && typeof doc.overridePrice === "number") {
          const normalized = normalizeDate(doc.date);
          priceOverrides[normalized] = doc.overridePrice;
          if (doc.blocked === true) {
            blockedDates.push(normalized);
          }
        }
      });
      console.log("Constructed normalized priceOverrides:", priceOverrides);
      console.log("Constructed normalized blockedDates:", blockedDates);

      const combinedPricingData: PricingData = {
        priceRules: priceRules!,
        bookedDates: allBookedDates,
        priceOverrides,
        blockedDates,
      };
      console.log("Combined pricing data:", combinedPricingData);
      setPricingData(combinedPricingData);
      modalizeRef.current?.open();
    } catch (error) {
      console.error("Error fetching pricing data for property:", error);
    }
    setLoading(false);
  };

  const onSaveOverridesCallback = useCallback(
    (data: { priceOverrides: Record<string, number>; blockedDates: string[] }) => {
      console.log("onSave callback received data:", data);
      if (selectedProperty) {
        handleSaveAdjustments(selectedProperty, data.priceOverrides, data.blockedDates);
      }
    },
    [selectedProperty]
  );

  const MemoizedPricingCalendarBottomSheet = memo(PricingCalendarBottomSheet);

  // Function to compute the main image URL from property.images array.
  const getPropertyImageSource = (prop: Property) => {
    let imageSource = require('@/assets/images/japan.png'); // fallback
    if (prop.images && Array.isArray(prop.images) && prop.images.length > 0) {
      try {
        const parsedImages = prop.images.map((imgString: string) =>
          JSON.parse(imgString)
        );
        // Find the main image or take the first image.
        const mainImg = parsedImages.find((img: any) => img.isMain) || parsedImages[0];
        if (mainImg) {
          imageSource = { uri: mainImg.remoteUrl || mainImg.localUri };
        }
      } catch (err) {
        console.error("Error parsing property images", err);
      }
    }
    return imageSource;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header with Close Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.pageCloseButton} onPress={() => router.back()}>
          <Image source={require('@/assets/icons/cross.png')} style={styles.pageCloseIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Host Calendar</Text>
      </View>

      {/* Render each property as a card */}
      <ScrollView style={styles.propertyList}>
        {properties.map((prop) => (
          <TouchableOpacity
            key={prop.$id}
            style={styles.propertyCard}
            onPress={() => onSelectProperty(prop.$id)}
          >
            <View style={styles.cardContent}>
              <Image
                source={getPropertyImageSource(prop)}
                style={styles.propertyImage}
              />
              <Text style={styles.propertyCardText}>{prop.name}</Text>
              <Image
                source={require('@/assets/icons/edit.png')}
                style={styles.editIcon}
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading && <ActivityIndicator size="large" color="#70d7c7" />}

      <Modalize
        ref={modalizeRef}
        modalHeight={Dimensions.get("window").height} // Full screen modal
        modalStyle={styles.modalStyle} // Remove rounded edges
      >
        <View style={styles.modalHeader}>
          {/* Cross Icon in Modal Header */}
          <TouchableOpacity onPress={() => modalizeRef.current?.close()}>
            <Image source={require('@/assets/icons/cross.png')} style={styles.modalCloseIcon} />
          </TouchableOpacity>
        </View>
        {pricingData && pricingData.priceRules && (
          <MemoizedPricingCalendarBottomSheet
            year={2025}
            month={1}
            priceRules={pricingData.priceRules}
            bookedDates={pricingData.bookedDates}
            initialPriceOverrides={pricingData.priceOverrides}
            initialBlockedDates={pricingData.blockedDates}
            onSave={onSaveOverridesCallback}
          />
        )}
      </Modalize>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  pageCloseButton: {
    padding: 10,
  },
  pageCloseIcon: {
    width: 24,
    height: 24,
    tintColor: "#000",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 10,
  },
  propertyList: {
    flex: 1,
    paddingHorizontal: 10,
  },
  propertyCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 10,
    resizeMode: "cover",
  },
  propertyCardText: {
    flex: 1,
    fontSize: 18,
    color: "#333",
  },
  editIcon: {
    width: 24,
    height: 24,
    tintColor: "#70d7c7",
    marginLeft: 10,
  },
  modalStyle: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalHeader: {
    padding: 10,
    alignItems: "flex-start",
  },
  modalCloseIcon: {
    width: 24,
    height: 24,
    tintColor: "red",
  },
});

export default HostCalendarPage;
