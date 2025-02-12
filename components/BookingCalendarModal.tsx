// components/BookingCalendarModal.tsx
import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Dimensions,
  Platform,
  Image,
} from "react-native";
import { Calendar } from "react-native-calendars";
import {
  createBooking,
  getCurrentUser,
  getBookingsForProperty,
  getDailyPricesForProperty,
} from "@/lib/appwrite";

interface BookingCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyPrice: number;
  maxGuests: number;       // Maximum guests allowed (excluding pets)
  allowPets: boolean;      // Whether pets are allowed at the property
  onConfirm: (
    startDate: string,
    endDate: string,
    guests: { adults: number; children: number; infants: number; pets: number }
  ) => void;
}

// Helper: Return an array of dates (YYYY-MM-DD) in the range [startDate, endDate]
const getDatesInRange = (startDate: string, endDate: string): string[] => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = ("0" + (current.getMonth() + 1)).slice(-2);
    const day = ("0" + current.getDate()).slice(-2);
    dates.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

const BookingCalendarModal: React.FC<BookingCalendarModalProps> = ({
  visible,
  onClose,
  propertyId,
  propertyPrice,
  maxGuests,
  allowPets,
  onConfirm,
}) => {
  // State for booked/blocked dates and daily prices.
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  // Date selection state.
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  // Guest info state.
  const [adults, setAdults] = useState<string>("1");
  const [children, setChildren] = useState<string>("0");
  const [infants, setInfants] = useState<string>("0");
  const [pets, setPets] = useState<string>("0");

  // When modal opens, fetch bookings and daily prices.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookings = await getBookingsForProperty(propertyId);
        const dailyPrices = await getDailyPricesForProperty(propertyId);
        setPrices(dailyPrices);
        const allBooked = bookings.flatMap((booking: any) =>
          getDatesInRange(booking.startDate, booking.endDate)
        );
        setBookedDates(allBooked);
        console.log("Fetched bookedDates:", allBooked);
      } catch (err) {
        console.error("Error fetching booking data:", err);
      }
    };
    if (visible) {
      fetchData();
      setSelectedStartDate(null);
      setSelectedEndDate(null);
      // Reset guest fields when modal opens.
      setAdults("1");
      setChildren("0");
      setInfants("0");
      setPets("0");
    }
  }, [visible, propertyId]);

  // Helper: Reset marking for unavailable dates.
  const resetMarked = (): Record<string, any> => {
    const reset: Record<string, any> = {};
    bookedDates.forEach((date) => {
      reset[date] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: { backgroundColor: "#eee" },
          text: { ...styles.dayText, ...styles.unavailableText },
        },
      };
    });
    blockedDates.forEach((date) => {
      reset[date] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: { backgroundColor: "#eee" },
          text: { ...styles.dayText, ...styles.unavailableText },
        },
      };
    });
    return reset;
  };

  // Custom dayComponent for the Calendar.
  const renderDay = (props: any) => {
    const { date, state } = props;
    const dateStr = date.dateString;
    const isUnavailable =
      bookedDates.includes(dateStr) || blockedDates.includes(dateStr);
    // Default custom styles from resetMarked.
    let customStyles = resetMarked()[dateStr]?.customStyles || {};
    if (!isUnavailable) {
      if (selectedStartDate && !selectedEndDate && dateStr === selectedStartDate) {
        customStyles = {
          container: styles.singleSelectedDay,
          text: styles.selectedText,
        };
      } else if (selectedStartDate && selectedEndDate) {
        const startObj = new Date(selectedStartDate);
        const endObj = new Date(selectedEndDate);
        const currentObj = new Date(dateStr);
        if (
          currentObj.getTime() === startObj.getTime() ||
          currentObj.getTime() === endObj.getTime()
        ) {
          customStyles = {
            container: styles.singleSelectedDay,
            text: styles.selectedText,
          };
        } else if (currentObj > startObj && currentObj < endObj) {
          customStyles = {
            container: styles.rangeDay,
            text: styles.selectedText,
          };
        }
      }
    }
    return (
      <TouchableOpacity
        onPress={() => onDayPress(date)}
        disabled={state === "disabled" || isUnavailable}
        style={[styles.dayContainer, customStyles.container]}
      >
        <Text style={[styles.dayText, customStyles.text]}>{date.day}</Text>
      </TouchableOpacity>
    );
  };

  // Handle day press for selecting a date range.
  const onDayPress = (date: { dateString: string; day: number; month: number; year: number }) => {
    const dateStr = date.dateString;
    // Do not allow selection if unavailable.
    if (bookedDates.includes(dateStr) || blockedDates.includes(dateStr)) return;
    // If no start date is selected or both dates are already selected, set this as new start.
    if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
      setSelectedStartDate(dateStr);
      setSelectedEndDate(null);
      return;
    }
    // If a start date is already selected but no end date, then set the end date if valid.
    if (selectedStartDate && !selectedEndDate) {
      if (new Date(dateStr) <= new Date(selectedStartDate)) {
        // Reset the start date if the tapped date is before the current start.
        setSelectedStartDate(dateStr);
        return;
      }
      setSelectedEndDate(dateStr);
    }
  };

  // When Confirm Booking is pressed, validate and call onConfirm.
  const handleConfirmBooking = () => {
    if (!selectedStartDate || !selectedEndDate) {
      Alert.alert("Error", "Please select a valid date range.");
      return;
    }
    const numAdults = parseInt(adults, 10);
    const numChildren = parseInt(children, 10);
    const numInfants = parseInt(infants, 10);
    const numPets = parseInt(pets, 10);
    if (numAdults < 1) {
      Alert.alert("Error", "There must be at least one adult.");
      return;
    }
    if ((numAdults + numChildren + numInfants) > maxGuests) {
      Alert.alert("Error", `The total number of guests (adults, children, infants) cannot exceed ${maxGuests}.`);
      return;
    }
    onConfirm(selectedStartDate, selectedEndDate, { adults: numAdults, children: numChildren, infants: numInfants, pets: numPets });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
            {/* Header with a close button using the cross icon from assets */}
            <View style={styles.header}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.headerCloseButton}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Image
                  source={require(".././assets/icons/cross.png")}
                  style={styles.headerCloseIcon}
                />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Choose Dates</Text>
              <View style={styles.calendarContainer}>
                <Calendar
                  current={new Date().toISOString().split("T")[0]}
                  minDate={new Date().toISOString().split("T")[0]}
                  onDayPress={onDayPress}
                  dayComponent={renderDay}
                  markingType="custom"
                  hideExtraDays={true} // Only show days for the current month.
                />
              </View>
              {/* Guest Information Section */}
              <View style={styles.guestInfo}>
                <Text style={styles.guestInfoTitle}>Guest Information</Text>
                <Text style={styles.maxGuestText}>Max Guests (excluding pets): {maxGuests}</Text>

                {/* Adults Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Adults:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setAdults(String(Math.max(1, parseInt(adults, 10) - 1)))}
                    >
                      <Image source={require(".././assets/icons/minus.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{adults}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setAdults(String(parseInt(adults, 10) + 1))}
                    >
                      <Image source={require(".././assets/icons/add.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Children Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Children:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setChildren(String(Math.max(0, parseInt(children, 10) - 1)))}
                    >
                      <Image source={require(".././assets/icons/minus.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{children}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setChildren(String(parseInt(children, 10) + 1))}
                    >
                      <Image source={require(".././assets/icons/add.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Infants Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Infants:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setInfants(String(Math.max(0, parseInt(infants, 10) - 1)))}
                    >
                      <Image source={require(".././assets/icons/minus.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{infants}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => setInfants(String(parseInt(infants, 10) + 1))}
                    >
                      <Image source={require(".././assets/icons/add.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Pets Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Pets:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={[
                        styles.stepperButton,
                        !allowPets && styles.disabledButton
                      ]}
                      onPress={() => allowPets && setPets(String(Math.max(0, parseInt(pets, 10) - 1)))}
                      disabled={!allowPets}
                    >
                      <Image source={require(".././assets/icons/minus.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{pets}</Text>
                    <TouchableOpacity
                      style={[
                        styles.stepperButton,
                        !allowPets && styles.disabledButton
                      ]}
                      onPress={() => allowPets && setPets(String(parseInt(pets, 10) + 1))}
                      disabled={!allowPets}
                    >
                      <Image source={require(".././assets/icons/add.png")} style={styles.stepperIcon} />
                    </TouchableOpacity>
                  </View>
                </View>

              </View>
              <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking}>
                <Text style={styles.confirmButtonText}>Save</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default BookingCalendarModal;

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 20, // Pushed down so the icon isn't at the very top.
    padding: 10,
    alignItems: "flex-start",
  },
  headerCloseButton: {
    padding: 10,
  },
  headerCloseIcon: {
    width: 28,
    height: 28,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 50, // Extra bottom padding so that the Confirm button is not hidden.
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  // Updated calendarContainer with a fixed height for better UX.
  calendarContainer: {
    height: 400, // Fixed height to ensure all days are visible on a 31-day month.
    marginBottom: 20,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
  },
  unavailableText: {
    textDecorationStyle: "solid",
    textDecorationColor: "black",
    fontWeight: "bold",
  },
  disabledText: {
    color: "#ccc",
  },
  selectedText: {
    color: "#fff",
  },
  singleSelectedDay: {
    backgroundColor: "black",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  rangeDay: {
    backgroundColor: "black",
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  guestInfo: {
    marginTop: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
  },
  guestInfoTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  maxGuestText: {
    fontSize: 16,
    color: "#555",
    textAlign: "center",
    marginBottom: 10,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  guestLabel: {
    flex: 1,
    fontSize: 18,
  },
  /* New Stepper Styles */
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepperButton: {
    padding: 8,
  },
  stepperValue: {
    fontSize: 18,
    marginHorizontal: 10,
  },
  stepperIcon: {
    width: 24,
    height: 24,
    tintColor: "#70d7c7",
  },
  disabledButton: {
    opacity: 0.5,
  },
  confirmButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  cancelButtonText: {
    color: "#555",
    fontSize: 18,
    textAlign: "center",
  },
});
