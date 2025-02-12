// app/(host)/hostTabs/BookingFlowSheet.tsx
import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions } from 'react-native';
import { Modalize } from 'react-native-modalize';
import BookingCalendarModal from './BookingCalendarModal';
import { getHouseRulesForProperty } from '@/lib/appwrite'; // Use your existing function

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
    const [selectedGuests, setSelectedGuests] = useState<{ adults: number; children: number; infants: number } | null>(null);
    const [isCalendarVisible, setCalendarVisible] = useState(false);

    // State to hold house rules fetched for the property.
    const [houseRules, setHouseRules] = useState<any>(null);

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
    // Note: onConfirm now expects a guest object that includes pets.
    const onCalendarConfirm = (
      startDate: string,
      endDate: string,
      guests: { adults: number; children: number; infants: number; pets: number }
    ) => {
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
      setSelectedGuests(guests);
      closeCalendar();
    };

    // Helper: Format a date range into "18-23 Feb" (if same month) or "18 Feb - 23 Mar" (if different months).
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
    const formatGuestSummary = (guests: { adults: number; children: number; infants: number }) => {
      const parts: string[] = [];
      if (guests.adults > 0) parts.push(`${guests.adults} adult${guests.adults > 1 ? "s" : ""}`);
      if (guests.children > 0) parts.push(`${guests.children} child${guests.children > 1 ? "ren" : ""}`);
      if (guests.infants > 0) parts.push(`${guests.infants} infant${guests.infants > 1 ? "s" : ""}`);
      return parts.join(", ");
    };

    // Fetch house rules using the property's houseRulesId.
    useEffect(() => {
      if (property && property.houseRulesId) {
        // If houseRulesId is an object (with metadata), extract the actual id.
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
    // Note: use the actual field names from your houseRules document.
    const maxGuests = houseRules?.guestsMax || 4;
    const allowPets = houseRules?.petsAllowed ?? false;

    return (
      <>
        <Modalize
          ref={modalizeRef}
          snapPoint={snapPoint} // Full screen height
          modalStyle={styles.modalStyle}
          closeOnOverlayTap={false} // Disable closing by tapping on the overlay
          adjustToContentHeight={false} // Force full screen modal
          panGestureEnabled={false} // Disable pulling down the modal
        >
          {/* Header with a cross icon to close the modal */}
          <View style={styles.sheetHeader}>
            <TouchableOpacity onPress={() => modalizeRef.current?.close()} style={styles.headerCloseButton}>
              <Image
                source={require(".././assets/icons/cross.png")}
                style={styles.headerCloseIcon}
              />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Booking Flow</Text>
          </View>

          <ScrollView contentContainerStyle={styles.sheetContent}>
            {/* Card 1: Property Profile */}
            <View style={styles.card}>
              <View style={styles.profileContainer}>
                <Image
                  source={{
                    uri: property.media && property.media.length > 0
                      ? property.media[0]
                      : 'https://via.placeholder.com/80'
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

            {/* Card 2: Your Trip */}
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

            {/* Card 3: Price Breakdown */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Price Breakdown</Text>
              <Text style={styles.placeholderText}>[Price breakdown details]</Text>
            </View>

            {/* Card 4: Cancellation Policy */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Cancellation Policy</Text>
              <Text style={styles.placeholderText}>[Cancellation policy details]</Text>
            </View>

            {/* Card 5: Payment Options */}
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
          maxGuests={maxGuests}         // Now pulled from the houseRules document (using guestsMax)
          allowPets={allowPets}         // Now pulled from the houseRules document (using petsAllowed)
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
  // Header styles
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: "#ccc",
  },
  headerCloseButton: {
    padding: 10,
  },
  headerCloseIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 16,
  },
  // Minimalist card style: white background, simple 1px border, no shadow, no rounded corners.
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
  // Profile card styles
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
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 16,
    color: "#555",
    marginBottom: 4,
  },
  profileRating: {
    fontSize: 16,
    color: "#70d7c7",
  },
  // Your Trip card styles
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tripInfo: {
    flex: 1,
  },
  tripLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  tripValue: {
    fontSize: 16,
    color: "#555",
    marginTop: 4,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: "#70d7c7",
    textDecorationLine: "underline",
  },
  // Final Book Button styles.
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
