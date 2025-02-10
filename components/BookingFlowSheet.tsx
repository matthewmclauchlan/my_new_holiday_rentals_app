// components/BookingFlowSheet.tsx
import React, { useMemo, forwardRef, useImperativeHandle, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Modalize } from 'react-native-modalize';
import BookingCalendarModal from './BookingCalendarModal';
import icons from '@/constants/icons';

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
    const snapPoints = useMemo(() => ['80%'], []);
    const modalizeRef = React.useRef<Modalize>(null);

    // Local state for selected dates and guest counts
    const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
    const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
    const [selectedGuests, setSelectedGuests] = useState<{ adults: number; children: number; infants: number } | null>(null);
    const [isCalendarVisible, setCalendarVisible] = useState(false);

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

    // onCalendarConfirm receives the selected dates and guest counts from the calendar modal
    const onCalendarConfirm = (
      startDate: string,
      endDate: string,
      guests: { adults: number; children: number; infants: number }
    ) => {
      setSelectedStartDate(startDate);
      setSelectedEndDate(endDate);
      setSelectedGuests(guests);
      closeCalendar();
    };

    return (
      <>
        <Modalize
          ref={modalizeRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          modalStyle={styles.modalStyle}
        >
          <ScrollView contentContainerStyle={styles.sheetContent}>
            {/* Header with clickable chevron */}
            <View style={styles.sheetHeader}>
              <TouchableOpacity
                onPress={() => modalizeRef.current?.close()}
                style={styles.headerChevron}
              >
                <Image source={icons.backArrow} style={styles.headerChevronIcon} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Booking Flow</Text>
            </View>

            {/* Card 1: Property Profile Header */}
            <View style={styles.card}>
              <View style={styles.profileContainer}>
                <Image
                  source={{ uri: property.profileImage || 'https://via.placeholder.com/80' }}
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

            {/* Card 2: Date Picker */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Select Dates & Guests</Text>
              <TouchableOpacity style={styles.dateButton} onPress={openCalendar}>
                {selectedStartDate && selectedEndDate && selectedGuests ? (
                  <View style={styles.dateSelectionRow}>
                    <View style={styles.dateSelectionContent}>
                      <Text style={styles.dateButtonText}>
                        {selectedStartDate} - {selectedEndDate}
                      </Text>
                      <Text style={styles.dateButtonText}>
                        Adults: {selectedGuests.adults}
                      </Text>
                      <Text style={styles.dateButtonText}>
                        Children: {selectedGuests.children}
                      </Text>
                      <Text style={styles.dateButtonText}>
                        Infants: {selectedGuests.infants}
                      </Text>
                    </View>
                    <TouchableOpacity style={styles.editButton} onPress={openCalendar}>
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.dateButtonText}>Choose Dates</Text>
                )}
              </TouchableOpacity>
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

        {/* Booking Calendar Modal for date selection */}
        <BookingCalendarModal
          visible={isCalendarVisible}
          onClose={closeCalendar}
          propertyId={property.$id}
          propertyPrice={property.pricePerNight}
          onConfirm={onCalendarConfirm}
        />
      </>
    );
  }
);

const styles = StyleSheet.create({
  modalStyle: {
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#70d7c7',
  },
  sheetContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Header styles
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerChevron: {
    padding: 8,
  },
  headerChevronIcon: {
    width: 24,
    height: 24,
    tintColor: '#70d7c7',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  // Card styles
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  placeholderText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Profile card styles
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginRight: 16,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  profileDescription: {
    fontSize: 16,
    color: '#555',
    marginBottom: 4,
  },
  profileRating: {
    fontSize: 16,
    color: '#70d7c7',
  },
  // Date picker styles
  dateButton: {
    backgroundColor: '#f2f2f2',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    alignItems: 'flex-start', // Left align content
  },
  dateSelectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dateSelectionContent: {
    flex: 1,
  },
  dateButtonText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'left',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 16,
    color: '#000',
    textDecorationLine: 'underline',
  },
  // Final Book Button
  finalBookButton: {
    backgroundColor: '#70d7c7',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 16,
  },
  finalBookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BookingFlowSheet;
