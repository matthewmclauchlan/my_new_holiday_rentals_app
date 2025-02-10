// app/(host)/hostTabs/hostCalendarPage.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { Modalize } from "react-native-modalize";
import PricingCalendarBottomSheet from "../../../components/PricingCalendarBottomSheet";
import {
  getPropertiesByUser,
  getPriceRulesForProperty,
  getBookingsForProperty,
  getPriceAdjustmentsForProperty,
  getCurrentUserId,
} from "../../../lib/appwrite";
import { handleSaveAdjustments } from "../../../lib/priceHelpers"; // Ensure this is correctly imported

// Define the expected shape for a Property.
interface Property {
  $id: string;
  name: string;
  propertyId: string;
}

// Define the shape of the combined pricing data.
interface PricingData {
  priceRules: {
    basePricePerNight: number;
    basePricePerNightWeekend: number;
  };
  bookedDates: string[];       // From bookings
  priceOverrides: Record<string, number>; // Merged adjustments from PriceAdjustments collection (normalized)
  blockedDates: string[];      // Normalized blocked dates
}

// Helper to generate an array of dates (YYYY-MM-DD) between two dates (inclusive)
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

// Helper to normalize a date to "YYYY-MM-DD" format.
const normalizeDate = (date: string): string => {
  return new Date(date).toISOString().split("T")[0];
};

const HostCalendarPage: React.FC = () => {
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
        }));
        setProperties(mappedProperties);
        console.log("Mapped properties:", mappedProperties);
      } catch (error) {
        console.error("Error fetching properties:", error);
      }
    };
    fetchProperties();
  }, []);

  // When a property is selected, fetch its price rules, bookings, and adjustments.
  const onSelectProperty = async (propertyId: string) => {
    setSelectedProperty(propertyId);
    setLoading(true);
    try {
      // Fetch base price rules.
      const priceRules = await getPriceRulesForProperty(propertyId);
      console.log("Fetched PriceRules:", priceRules);

      // Fetch bookings for this property.
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

      // Fetch adjustments from the PriceAdjustments collection.
      const adjustments = await getPriceAdjustmentsForProperty(propertyId);
      console.log("Fetched adjustments (raw):", adjustments);

      // Build a record for priceOverrides and an array for blockedDates (all normalized).
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

      // Set combined pricing data.
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select a Property:</Text>
      <ScrollView>
        {properties.map((prop) => (
          <TouchableOpacity
            key={prop.$id}
            style={styles.propertyButton}
            onPress={() => onSelectProperty(prop.$id)}
          >
            <Text style={styles.propertyButtonText}>{prop.name}</Text>
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
          <TouchableOpacity onPress={() => modalizeRef.current?.close()}>
            <Text style={styles.closeButton}>X</Text>
          </TouchableOpacity>
        </View>
        {pricingData && pricingData.priceRules && (
          <PricingCalendarBottomSheet
            year={2025}
            month={1}
            priceRules={pricingData.priceRules}
            bookedDates={pricingData.bookedDates}
            initialPriceOverrides={pricingData.priceOverrides}
            initialBlockedDates={pricingData.blockedDates}
            onSave={(data: { priceOverrides: Record<string, number>; blockedDates: string[] }) => {
              console.log("onSave callback received data:", data);
              // Call the helper to update the adjustments collection.
              handleSaveAdjustments(selectedProperty!, data.priceOverrides, data.blockedDates);
            }}
          />
        )}
      </Modalize>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  propertyButton: {
    padding: 15,
    backgroundColor: "#e6f7ff",
    marginBottom: 10,
    borderRadius: 8,
  },
  propertyButtonText: { fontSize: 18, color: "#333" },
  modalStyle: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  modalHeader: {
    padding: 10,
    alignItems: "flex-start",
  },
  closeButton: {
    fontSize: 24,
    fontWeight: "bold",
    color: "red",
  },
});

export default HostCalendarPage;
