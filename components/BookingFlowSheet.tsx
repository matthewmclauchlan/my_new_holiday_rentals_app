// app/(host)/hostTabs/BookingFlowSheet.tsx

import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Modalize } from 'react-native-modalize';
import BookingCalendarModal from './BookingCalendarModal';
import { getHouseRulesForProperty } from '@/lib/appwrite'; // Use your existing function
import { getDatesInRange } from '@/lib/utils';


export interface BookingFlowSheetRef {
  open: () => void;
  close: () => void;
}

export interface BookingFlowSheetProps {
  onBook: () => void;
  property: any; // Adjust type as needed
}

const BookingFlowSheet = forwardRef<BookingFlowSheetRef, BookingFlowSheetProps>(
  ({ onBook, property }, ref) => {
    // Use full screen height for the modal.
    const snapPoint = Dimensions.get("window").height;
    const modalizeRef = React.useRef<Modalize>(null);

    // Local state for selected dates and guest counts.
    const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
    const [selectedGuests, setSelectedGuests] = useState<{ adults: number; children: number; infants: number; pets: number } | null>(null);
    const [isCalendarVisible, setCalendarVisible] = useState(false);

    // State to hold house rules fetched for the property.
    const [houseRules, setHouseRules] = useState<any>(null);
    // State to hold pricing breakdown returned from the pricing Cloud Function.
    const [pricingBreakdown, setPricingBreakdown] = useState<any>(null);
    // Loading state for pricing calculations.
    const [pricingLoading, setPricingLoading] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => modalizeRef.current?.open(),
      close: () => modalizeRef.current?.close(),
    }));

    const openCalendar = () => {
      setCalendarVisible(true);
    };

    const closeCalendar = () => {
      setCalendarVisible(false);
    };

    // Callback from the BookingCalendarModal.
    const onCalendarConfirm = (
      startDate: string,
      endDate: string,
      guests: { adults: number; children: number; infants: number; pets: number }
    ) => {
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
      setSelectedGuests(guests);
      closeCalendar();
      // Once dates and guest info are set, fetch the pricing breakdown.
      fetchPricingDetails(startDate, endDate, guests);
    };

    // Helper: Format a date range (for display).
    const formatDateRange = (start: string, end: string) => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const optionsDay = { day: "numeric" } as const;
      const optionsMonth = { month: "short" } as const;
      if (startDate.getMonth() === endDate.getMonth()) {
        return `${startDate.toLocaleDateString(undefined, optionsDay)}-${endDate.toLocaleDateString(undefined, optionsDay)} ${endDate.toLocaleDateString(undefined, optionsMonth)}`;
      } else {
        return `${startDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
      }
    };

    // Helper: Create a guest summary string.
    const formatGuestSummary = (guests: { adults: number; children: number; infants: number; pets: number }) => {
      const parts: string[] = [];
      if (guests.adults > 0) parts.push(`${guests.adults} adult${guests.adults > 1 ? "s" : ""}`);
      if (guests.children > 0) parts.push(`${guests.children} child${guests.children > 1 ? "ren" : ""}`);
      if (guests.infants > 0) parts.push(`${guests.infants} infant${guests.infants > 1 ? "s" : ""}`);
      if (guests.pets > 0) parts.push(`${guests.pets} pet${guests.pets > 1 ? "s" : ""}`);
      return parts.join(", ");
    };

    // Fetch house rules using the property's houseRulesId.
    useEffect(() => {
      if (property && property.houseRulesId) {
        let houseRulesId = property.houseRulesId;
        if (typeof houseRulesId === "object" && houseRulesId.$id) {
          houseRulesId = houseRulesId.$id;
        }
        getHouseRulesForProperty(houseRulesId)
          .then((rules) => {
            setHouseRules(rules);
          })
          .catch((err) => console.error("Error fetching house rules:", err));
      }
    }, [property]);

    // Determine maxGuests and allowPets from the fetched house rules.
    const maxGuests = houseRules?.guestsMax || 4;
    const allowPets = houseRules?.petsAllowed ?? false;

    // Function to call the pricing Cloud Function.
    async function fetchPricingDetails(startDate: string, endDate: string, guests: { adults: number; children: number; infants: number; pets: number }) {
      if (!property || !property.$id) return;
      // Build bookingDates array from start and end dates.
      // Assuming bookingDates are inclusive.
      const bookingDates = getDatesInRange(startDate, endDate);
      const payload = {
        propertyId: property.$id, // or propertyId from the property
        bookingDates,
        guestInfo: guests,
      };

      setPricingLoading(true);
      try {
        const response = await fetch(
          'https://67acd27614afbc9616df.appwrite.global/v1/functions/YOUR_PRICING_FUNCTION_ID/executions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Appwrite-Key': 'YOUR_SERVER_API_KEY'
            },
            body: JSON.stringify(payload)
          }
        );
        const data = await response.json();
        setPricingBreakdown(data);
      } catch (error) {
        console.error("Error fetching pricing details:", error);
      } finally {
        setPricingLoading(false);
      }
    }

    return (
      <>
        <Modalize
          ref={modalizeRef}
          snapPoint={snapPoint}
          modalStyle={styles.modalStyle}
          closeOnOverlayTap={false}
          adjustToContentHeight={false}
          panGestureEnabled={false}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => modalizeRef.current?.close()} style={styles.headerCloseButton}>
              <Image source={require(".././assets/icons/cross.png")} style={styles.headerCloseIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Flow</Text>
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            {/* Property Profile */}
            <View style={styles.card}>
              <View style={styles.profileContainer}>
                <Image
                  source={{
                    uri: property.media && property.media.length > 0 ? property.media[0] : 'https://via.placeholder.com/80'
                  }}
                  style={styles.profileImage}
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileTitle}>{property.name || "Property Name"}</Text>
                  <Text style={styles.profileDescription}>
                    {property.shortDescription || "Short property description..."}
                  </Text>
                  <Text style={styles.profileRating}>⭐ {property.rating || "No Rating"}</Text>
                </View>
              </View>
            </View>

            {/* Trip Details */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Your Trip</Text>
              <View style={styles.tripRow}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripLabel}>Dates</Text>
                  {selectedStartDate && selectedEndDate ? (
                    <Text style={styles.tripValue}>{formatDateRange(selectedStartDate, selectedEndDate)}</Text>
                  ) : (
                    <Text style={styles.tripValue}>Select your dates</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.editButton} onPress={() => openCalendar()}>
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.tripRow}>
                <View style={styles.tripInfo}>
                  <Text style={styles.tripLabel}>Guests</Text>
                  {selectedGuests ? (
                    <Text style={styles.tripValue}>{formatGuestSummary(selectedGuests)}</Text>
                  ) : (
                    <Text style={styles.tripValue}>Select guests</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Price Breakdown Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Price Breakdown</Text>
              {pricingLoading ? (
                <ActivityIndicator size="small" color="#70d7c7" />
              ) : pricingBreakdown ? (
                <View>
                  {/* Render a summary. Customize as needed */}
                  <Text style={styles.detailText}>Subtotal: ${pricingBreakdown.subTotal.toFixed(2)}</Text>
                  <Text style={styles.detailText}>Cleaning Fee: ${pricingBreakdown.cleaningFee.toFixed(2)}</Text>
                  <Text style={styles.detailText}>Pet Fee: ${pricingBreakdown.petFee.toFixed(2)}</Text>
                  <Text style={styles.detailText}>VAT: ${pricingBreakdown.vat.toFixed(2)}</Text>
                  <Text style={styles.detailText}>Total: ${pricingBreakdown.total.toFixed(2)}</Text>
                </View>
              ) : (
                <Text style={styles.placeholderText}>Price details will appear here.</Text>
              )}
            </View>

            {/* Additional Cards */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cancellation Policy</Text>
              <Text style={styles.placeholderText}>[Cancellation policy details]</Text>
            </View>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Payment Options</Text>
              <Text style={styles.placeholderText}>[Payment options details]</Text>
            </View>

            {/* Final Book Button */}
            <TouchableOpacity style={styles.finalBookButton} onPress={onBook}>
              <Text style={styles.finalBookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </ScrollView>
        </Modalize>

        <BookingCalendarModal
          visible={isCalendarVisible}
          onClose={closeCalendar}
          propertyId={property.$id}
          propertyPrice={property.pricePerNight}
          maxGuests={maxGuests}
          allowPets={allowPets}
          onConfirm={onCalendarConfirm}
        />
      </>
    );
  }
);

const styles = StyleSheet.create({
  modalStyle: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  headerCloseButton: { padding: 10 },
  headerCloseIcon: { width: 24, height: 24 },
  headerTitle: { fontSize: 20, fontWeight: "bold", marginLeft: 16 },
  card: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
    marginBottom: 16,
    borderRadius: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    color: "#333",
  },
  placeholderText: {
    fontSize: 16,
    color: "#777",
    textAlign: "center",
    paddingVertical: 8,
  },
  detailText: {
    fontSize: 16,
    color: "#333",
    marginVertical: 2,
  },
  profileContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 0,
    marginRight: 16,
  },
  profileInfo: { flex: 1 },
  profileTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 4 },
  profileDescription: { fontSize: 16, color: "#555", marginBottom: 4 },
  profileRating: { fontSize: 16, color: "#70d7c7" },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tripInfo: { flex: 1 },
  tripLabel: { fontSize: 16, fontWeight: "600", color: "#333" },
  tripValue: { fontSize: 16, color: "#555", marginTop: 4 },
  editButton: { paddingHorizontal: 8, paddingVertical: 4 },
  editButtonText: { fontSize: 16, color: "#70d7c7", textDecorationLine: "underline" },
  finalBookButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginTop: 16,
  },
  finalBookButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default BookingFlowSheet;
