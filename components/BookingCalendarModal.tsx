// components/BookingCalendarModal.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { CalendarList } from "react-native-calendars";
import { createBooking, getCurrentUser, getBookingsForProperty, getDailyPricesForProperty } from "@/lib/appwrite";

interface BookingCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyPrice: number;
}

interface CalendarDay {
  dateString: string;
  day: number;
  month: number;
  year: number;
  timestamp: number;
}

const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const date = new Date(start);
  const dates: string[] = [];

  while (date <= end) {
    const year = date.getFullYear();
    const month = ("0" + (date.getMonth() + 1)).slice(-2);
    const day = ("0" + date.getDate()).slice(-2);
    dates.push(`${year}-${month}-${day}`);
    date.setDate(date.getDate() + 1);
  }
  return dates;
};

const BookingCalendarModal: React.FC<BookingCalendarModalProps> = ({
  visible,
  onClose,
  propertyId,
  propertyPrice,
}) => {
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});

  // Fetch bookings and daily prices on open
  useEffect(() => {
    console.log("9");
    const fetchData = async () => {
      const bookings = await getBookingsForProperty(propertyId);
      const dailyPrices = await getDailyPricesForProperty(propertyId);
      setPrices(dailyPrices);

      // Collect all booked dates into an array
      const allBooked = bookings.flatMap((booking: any) =>
        getDatesInRange(booking.startDate, booking.endDate)
      );
      setBookedDates(allBooked);
    };

    if (visible) {
      fetchData();
    }
  }, [visible, propertyId]);

  // Mark up booked dates and attach daily prices
  useEffect(() => {
    console.log("10");
    // Start with booked dates
    const baseMarked: Record<string, any> = {};
    bookedDates.forEach((date) => {
      baseMarked[date] = {
        disabled: true,
        disableTouchEvent: true,
        marked: true,
        dotColor: "red",
      };
    });
    // Attach daily prices
    Object.keys(prices).forEach((date) => {
      if (!baseMarked[date]) {
        baseMarked[date] = {};
      }
      baseMarked[date].price = prices[date];
    });
    setMarkedDates(baseMarked);
  }, [bookedDates, prices]);

  // Helper to reset to original booked state
  const resetMarked = () => {
    const reset: Record<string, any> = {};
    bookedDates.forEach((date) => {
      reset[date] = {
        disabled: true,
        disableTouchEvent: true,
        marked: true,
        dotColor: "red",
      };
    });
    Object.keys(prices).forEach((date) => {
      if (!reset[date]) reset[date] = {};
      reset[date].price = prices[date];
    });
    return reset;
  };

  // Selecting date range
  const onDayPress = (day: { dateString: string }) => {
    const dateString = day.dateString;
    // Start fresh if we already have a start & end
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateString);
      setSelectedEndDate(null);
      setMarkedDates((prev) => ({
        ...resetMarked(),
        [dateString]: {
          ...prev[dateString],
          startingDay: true,
          color: "#70d7c7",
          textColor: "#fff",
        },
      }));
      return;
    }

    // If we only have a start date
    if (selectedStartDate && !selectedEndDate) {
      // Ensure the new date is after start
      if (new Date(dateString) <= new Date(selectedStartDate)) {
        Alert.alert("Error", "End date must be after start date.");
        return;
      }
      setSelectedEndDate(dateString);

      // Generate the date range
      const range = getDatesInRange(selectedStartDate, dateString);
      // Check for overlap
      const hasOverlap = range.some((d) => bookedDates.includes(d));
      if (hasOverlap) {
        Alert.alert("Error", "Selected dates overlap with existing bookings.");
        setSelectedStartDate(null);
        setSelectedEndDate(null);
        setMarkedDates(resetMarked());
        return;
      }

      // Mark the entire range
      const updated = resetMarked();
      range.forEach((d) => {
        if (d === selectedStartDate) {
          updated[d] = {
            ...updated[d],
            startingDay: true,
            color: "#70d7c7",
            textColor: "#fff",
          };
        } else if (d === dateString) {
          updated[d] = {
            ...updated[d],
            endingDay: true,
            color: "#70d7c7",
            textColor: "#fff",
          };
        } else {
          updated[d] = {
            ...updated[d],
            color: "#70d7c7",
            textColor: "#fff",
          };
        }
      });
      setMarkedDates(updated);
    }
  };

  // Confirm booking
  const handleConfirmBooking = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert("Error", "Please select a valid date range.");
      return;
    }

    try {
      const user = await getCurrentUser();
      if (!user || !user.$id) throw new Error("You need to be logged in to book.");

      const bookingReference = `SHR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const bookingData = {
        userId: user.$id,
        propertyId,
        startDate: selectedStartDate,
        endDate: selectedEndDate,
        totalPrice: propertyPrice,
        bookingReference,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await createBooking(bookingData);
      Alert.alert("Success", "Your booking has been confirmed!");
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Booking failed.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Dates</Text>
          {/** Use CalendarList with vertical scrolling */}
          <CalendarList
            current={new Date().toISOString().split("T")[0]}
            minDate={new Date().toISOString().split("T")[0]}
            onDayPress={onDayPress}
            markedDates={markedDates}
            markingType="period"
            horizontal={false}           // Vertical scrolling
            pagingEnabled={false}        // No snap to page
            showsVerticalScrollIndicator={false}
            theme={{
              todayTextColor: "#70d7c7",
              arrowColor: "#70d7c7",
            }}
            pastScrollRange={0}  // how many months in the past
            futureScrollRange={12} // how many months in the future
          />
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking}>
            <Text style={styles.confirmButtonText}>Confirm Booking</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default BookingCalendarModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxHeight: "80%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  confirmButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  confirmButtonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  closeButtonText: {
    color: "#555",
    textAlign: "center",
    fontSize: 16,
  },
});