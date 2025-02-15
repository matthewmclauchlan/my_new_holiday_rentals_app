import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  getBookingsForProperty,
  getDailyPricesForProperty,
  getBookingRulesForProperty,
  getHouseRulesForProperty,
  getPriceRulesForProperty,
  getPriceAdjustmentsForProperty,
} from "@/lib/appwrite";

// Interface for the price rules document.
interface PriceRulesData {
  basePricePerNight: number;
  basePricePerNightWeekend: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  petFee?: number;
  propertyId: string;
}

export interface BookingCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  propertyId: string;
  propertyPrice: number; // Fallback base price if price rules aren't available
  maxGuests: number; // Default maximum guests allowed (excluding pets)
  allowPets: boolean; // Default whether pets are allowed at the property
  onConfirm: (
    startDate: string,
    endDate: string,
    guests: { adults: number; children: number; infants: number; pets: number },
    overridePrices: Record<string, number>
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

// Define an interface for the custom day component props.
interface DayProps {
  date: {
    dateString: string;
    day: number;
    month: number;
    year: number;
  };
  state: string;
  price?: number; // Optional override price to display
}

// Define interfaces for booking rules and house rules.
interface BookingRules {
  minStay: number;
  maxStay: number;
  advanceNotice: number;
}

interface HouseRules {
  propertyId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  petsAllowed: boolean;
  guestsMax: number;
  smokingAllowed: boolean;
}

const BookingCalendarModal: React.FC<BookingCalendarModalProps> = ({
  visible,
  onClose,
  propertyId,
  propertyPrice,
  maxGuests,
  allowPets,
  onConfirm,
}) => {
  // State for bookings, price adjustments, and rules.
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [overridePrices, setOverridePrices] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [bookingRules, setBookingRules] = useState<BookingRules | null>(null);
  const [houseRules, setHouseRules] = useState<HouseRules | null>(null);
  const [priceRulesData, setPriceRulesData] = useState<PriceRulesData | null>(null);
  // Date selection state.
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);
  // Guest info state.
  const [adults, setAdults] = useState<string>("1");
  const [children, setChildren] = useState<string>("0");
  const [infants, setInfants] = useState<string>("0");
  const [pets, setPets] = useState<string>("0");

  // State for visual warnings.
  const [warningMessage, setWarningMessage] = useState<string>("");

  // Today's date in YYYY-MM-DD format.
  const today = new Date().toISOString().split("T")[0];

  // When modal opens, fetch all necessary data.
  useEffect(() => {
    const fetchData = async () => {
      try {
        const bookings = await getBookingsForProperty(propertyId);
        // Fetch override prices and normalize the date.
        const adjustmentsArray = await getPriceAdjustmentsForProperty(propertyId);
        const adjustments: Record<string, number> = {};
        adjustmentsArray.forEach((doc: any) => {
          if (doc.date && doc.overridePrice !== undefined) {
            const normalizedDate = new Date(doc.date).toISOString().split("T")[0];
            adjustments[normalizedDate] = doc.overridePrice;
          }
        });
        setOverridePrices(adjustments);

        // Fetch daily prices (if any).
        const dailyPrices = await getDailyPricesForProperty(propertyId);
        setPrices(dailyPrices);

        const rules = await getBookingRulesForProperty(propertyId);
        const hr = await getHouseRulesForProperty(propertyId);
        const pr = await getPriceRulesForProperty(propertyId);
        setPriceRulesData(pr);
        if (rules) {
          setBookingRules({
            minStay: rules.minStay,
            maxStay: rules.maxStay,
            advanceNotice: rules.advanceNotice,
          });
        }
        setHouseRules(hr);
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
      setWarningMessage("");
    }
  }, [visible, propertyId]);

  // Determine allowed max guests from house rules if available, else fallback.
  const allowedMaxGuests = houseRules ? houseRules.guestsMax : maxGuests;

  // Helper: Compute the total number of guests (excluding pets) from state.
  const getTotalGuests = () =>
    parseInt(adults, 10) + parseInt(children, 10) + parseInt(infants, 10);

  // Helper: Compute the default price for a given date using priceRulesData.
  const computeDefaultPrice = (dateStr: string): number => {
    if (priceRulesData) {
      const dateObj = new Date(dateStr);
      const day = dateObj.getDay();
      return day === 0 || day === 6
        ? priceRulesData.basePricePerNightWeekend
        : priceRulesData.basePricePerNight;
    }
    return propertyPrice;
  };

  // Memoize marking for booked and blocked dates.
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    bookedDates.forEach((date) => {
      marks[date] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: { backgroundColor: "#eee" },
          text: { ...styles.dayText, ...styles.unavailableText },
        },
      };
    });
    blockedDates.forEach((date) => {
      marks[date] = {
        disabled: true,
        disableTouchEvent: true,
        customStyles: {
          container: { backgroundColor: "#eee" },
          text: { ...styles.dayText, ...styles.unavailableText },
        },
      };
    });
    return marks;
  }, [bookedDates, blockedDates]);

  // Helper: Show a warning message banner.
  const showWarning = (message: string) => {
    setWarningMessage(message);
    setTimeout(() => {
      setWarningMessage("");
    }, 3000);
  };

  // Memoized onDayPress handler that enforces booking rules.
  const onDayPress = useCallback(
    (date: { dateString: string; day: number; month: number; year: number }) => {
      const dateStr = date.dateString;
      if (
        bookedDates.includes(dateStr) ||
        blockedDates.includes(dateStr) ||
        new Date(dateStr) < new Date(today)
      ) {
        return;
      }
      const minStayRule = bookingRules ? bookingRules.minStay : 1;
      const maxStayRule = bookingRules ? bookingRules.maxStay : Infinity;
      const advanceNoticeRule = bookingRules ? bookingRules.advanceNotice : 0;

      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        const advanceDate = new Date();
        advanceDate.setDate(advanceDate.getDate() + advanceNoticeRule);
        if (new Date(dateStr) < advanceDate) {
          showWarning(`This property requires at least ${advanceNoticeRule} day(s) advance notice.`);
          return;
        }
        setSelectedStartDate(dateStr);
        setSelectedEndDate(null);
        return;
      }

      if (selectedStartDate && !selectedEndDate) {
        if (new Date(dateStr) <= new Date(selectedStartDate)) {
          setSelectedStartDate(dateStr);
          return;
        }
        const diffInTime =
          new Date(dateStr).getTime() - new Date(selectedStartDate).getTime();
        const diffDays = Math.floor(diffInTime / (1000 * 3600 * 24));
        if (diffDays < minStayRule) {
          showWarning(`This property requires a minimum stay of ${minStayRule} night(s).`);
          return;
        }
        if (diffDays > maxStayRule) {
          showWarning(`This property allows a maximum stay of ${maxStayRule} night(s).`);
          return;
        }
        setSelectedEndDate(dateStr);
      }
    },
    [bookedDates, blockedDates, selectedStartDate, selectedEndDate, today, bookingRules]
  );

  // Custom day component.
  const RenderDay: React.FC<DayProps> = React.memo((props: DayProps) => {
    const { date, state, price } = props;
    const dateStr = date.dateString;
    const isPast = new Date(dateStr) < new Date(today);
    const isUnavailable =
      bookedDates.includes(dateStr) ||
      blockedDates.includes(dateStr) ||
      isPast;
    let customStyles = markedDates[dateStr]?.customStyles || {};
  
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
    } else {
      customStyles = {
        container: { backgroundColor: "#f0f0f0" },
        text: { ...styles.dayText, color: "#aaa" },
      };
    }
  
    // Compute finalPrice using our override, then daily price, then computed default, then fallback.
    const finalPrice: number =
      overridePrices[dateStr] ??
      price ??
      (priceRulesData ? computeDefaultPrice(dateStr) : propertyPrice) ??
      0;
  
    // Debug log for finalPrice
    // console.log(`Date ${dateStr} - finalPrice: ${finalPrice}`);
  
    return (
      <TouchableOpacity
        onPress={() => onDayPress(date)}
        disabled={state === "disabled" || isUnavailable}
        style={[styles.dayContainer, customStyles.container]}
      >
        <Text style={[styles.dayText, customStyles.text]}>{date.day}</Text>
        {!isUnavailable && (
          <Text style={styles.priceText}>
            ${typeof finalPrice === "number" ? finalPrice.toFixed(2) : "0.00"}
          </Text>
        )}
      </TouchableOpacity>
    );
  });
  

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
    if (getTotalGuests() > allowedMaxGuests) {
      Alert.alert(
        "Error",
        `The total number of guests (adults, children, infants) cannot exceed ${allowedMaxGuests}.`
      );
      return;
    }
    onConfirm(selectedStartDate, selectedEndDate, {
      adults: numAdults,
      children: numChildren,
      infants: numInfants,
      pets: numPets,
    }, overridePrices);
  };

  const petsAllowed = houseRules ? houseRules.petsAllowed : allowPets;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <KeyboardAvoidingView
        style={styles.modalContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalContainer}>
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
            {warningMessage ? (
              <View style={styles.warningBanner}>
                <Text style={styles.warningText}>{warningMessage}</Text>
              </View>
            ) : null}
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.modalTitle}>Choose Dates</Text>
              <View style={styles.calendarContainer}>
                <Calendar
                  current={today}
                  minDate={today}
                  onDayPress={onDayPress}
                  dayComponent={(props: DayProps) => (
                    <RenderDay
                      {...props}
                      price={
                        overridePrices[props.date.dateString] ??
                        prices[props.date.dateString]
                      }
                    />
                  )}
                  markingType="custom"
                  hideExtraDays={true}
                />
              </View>
              <View style={styles.guestInfo}>
                <Text style={styles.guestInfoTitle}>Guest Information</Text>
                <Text style={styles.maxGuestText}>
                  Max Guests (excluding pets): {allowedMaxGuests}
                </Text>
                {/* Adults Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Adults:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() =>
                        setAdults(String(Math.max(1, parseInt(adults, 10) - 1)))
                      }
                    >
                      <Image
                        source={require(".././assets/icons/minus.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{adults}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => {
                        if (
                          parseInt(adults, 10) +
                            parseInt(children, 10) +
                            parseInt(infants, 10) <
                          allowedMaxGuests
                        ) {
                          setAdults(String(parseInt(adults, 10) + 1));
                        } else {
                          showWarning(`Total guests cannot exceed ${allowedMaxGuests}.`);
                        }
                      }}
                    >
                      <Image
                        source={require(".././assets/icons/add.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Children Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Children:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() =>
                        setChildren(String(Math.max(0, parseInt(children, 10) - 1)))
                      }
                    >
                      <Image
                        source={require(".././assets/icons/minus.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{children}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => {
                        if (
                          parseInt(adults, 10) +
                            parseInt(children, 10) +
                            parseInt(infants, 10) <
                          allowedMaxGuests
                        ) {
                          setChildren(String(parseInt(children, 10) + 1));
                        } else {
                          showWarning(`Total guests cannot exceed ${allowedMaxGuests}.`);
                        }
                      }}
                    >
                      <Image
                        source={require(".././assets/icons/add.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {/* Infants Stepper */}
                <View style={styles.guestRow}>
                  <Text style={styles.guestLabel}>Infants:</Text>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() =>
                        setInfants(String(Math.max(0, parseInt(infants, 10) - 1)))
                      }
                    >
                      <Image
                        source={require(".././assets/icons/minus.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{infants}</Text>
                    <TouchableOpacity
                      style={styles.stepperButton}
                      onPress={() => {
                        if (
                          parseInt(adults, 10) +
                            parseInt(children, 10) +
                            parseInt(infants, 10) <
                          allowedMaxGuests
                        ) {
                          setInfants(String(parseInt(infants, 10) + 1));
                        } else {
                          showWarning(`Total guests cannot exceed ${allowedMaxGuests}.`);
                        }
                      }}
                    >
                      <Image
                        source={require(".././assets/icons/add.png")}
                        style={styles.stepperIcon}
                      />
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
                        !petsAllowed && styles.disabledButton,
                      ]}
                      onPress={() =>
                        petsAllowed &&
                        setPets(String(Math.max(0, parseInt(pets, 10) - 1)))
                      }
                      disabled={!petsAllowed}
                    >
                      <Image
                        source={require(".././assets/icons/minus.png")}
                        style={styles.stepperIcon}
                      />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{pets}</Text>
                    <TouchableOpacity
                      style={[
                        styles.stepperButton,
                        !petsAllowed && styles.disabledButton,
                      ]}
                      onPress={() => {
                        if (petsAllowed) {
                          setPets(String(parseInt(pets, 10) + 1));
                        }
                      }}
                      disabled={!petsAllowed}
                    >
                      <Image
                        source={require(".././assets/icons/add.png")}
                        style={styles.stepperIcon}
                      />
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
    paddingTop: 20,
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
    paddingBottom: 50,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  calendarContainer: {
    height: 400,
    marginBottom: 20,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    margin: 2,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dayText: {
    fontSize: 16,
    color: "#000",
    textAlign: "center",
  },
  unavailableText: {
    fontWeight: "bold",
    color: "#888",
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
  priceText: {
    fontSize: 10,
    color: "#444",
    marginTop: 2,
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
  warningBanner: {
    backgroundColor: "#ffe5e5",
    padding: 10,
    marginHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  warningText: {
    color: "#cc0000",
    textAlign: "center",
    fontSize: 14,
  },
});
