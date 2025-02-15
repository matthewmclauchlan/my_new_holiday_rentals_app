import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Calendar } from "react-native-calendars";

export interface PriceRules {
  basePricePerNight: number;
  basePricePerNightWeekend: number;
}

interface DateGroup {
  start: string;
  end: string;
  dates: string[];
}

export interface PricingCalendarBottomSheetProps {
  year: number;
  month: number;
  priceRules: PriceRules;
  bookedDates?: string[];
  initialPriceOverrides?: Record<string, number>;
  initialBlockedDates?: string[];
  onSave: (data: { priceOverrides: Record<string, number>; blockedDates: string[] }) => void;
}

// Helper: Groups consecutive ISO dates into ranges.
const groupConsecutiveDates = (dates: string[]): DateGroup[] => {
  if (dates.length === 0) return [];
  const sorted = [...dates].sort();
  const groups: DateGroup[] = [];
  let currentGroup: string[] = [sorted[0]];
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1]);
    const currDate = new Date(sorted[i]);
    if (currDate.getTime() - prevDate.getTime() === 86400000) {
      currentGroup.push(sorted[i]);
    } else {
      groups.push({
        start: currentGroup[0],
        end: currentGroup[currentGroup.length - 1],
        dates: currentGroup,
      });
      currentGroup = [sorted[i]];
    }
  }
  groups.push({
    start: currentGroup[0],
    end: currentGroup[currentGroup.length - 1],
    dates: currentGroup,
  });
  return groups;
};

const PricingCalendarBottomSheet: React.FC<PricingCalendarBottomSheetProps> = ({
  year,
  month,
  priceRules,
  bookedDates = [],
  initialPriceOverrides = {},
  initialBlockedDates = [],
  onSave,
}) => {
  // Temporary state – these are used only during an override session.
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [tempPriceOverrides, setTempPriceOverrides] = useState<Record<string, number>>(initialPriceOverrides);
  const [tempBlockedDates, setTempBlockedDates] = useState<string[]>(initialBlockedDates);
  const [unsavedOverrides, setUnsavedOverrides] = useState<Record<number, string>>({});
  // Show override popup if any dates are selected.
  const [showCard, setShowCard] = useState<boolean>(false);

  // When the override popup is opened, copy persistent blocked dates into temporary state.
  useEffect(() => {
    setTempPriceOverrides(initialPriceOverrides);
    setTempBlockedDates(initialBlockedDates);
  }, [initialPriceOverrides, initialBlockedDates]);

  useEffect(() => {
    setShowCard(selectedDates.length > 0);
  }, [selectedDates]);

  // Compute the default price for a given date.
  const computeDefaultPrice = (dateStr: string): number => {
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay();
    return day === 0 || day === 6
      ? priceRules.basePricePerNightWeekend
      : priceRules.basePricePerNight;
  };

  // Handle day press on calendar.
  const onDayPress = (day: { dateString: string; day: number; month: number; year: number }) => {
    const ds = day.dateString;
    if (bookedDates.includes(ds)) return; // Do nothing if booked.
    // Toggle selection (temporary state only).
    if (selectedDates.includes(ds)) {
      setSelectedDates(selectedDates.filter((d) => d !== ds));
      const newOverrides = { ...tempPriceOverrides };
      delete newOverrides[ds];
      setTempPriceOverrides(newOverrides);
    } else {
      setSelectedDates([...selectedDates, ds]);
      if (!(ds in tempPriceOverrides)) {
        setTempPriceOverrides((prev) => ({ ...prev, [ds]: computeDefaultPrice(ds) }));
      }
    }
  };

  // Build markedDates for calendar using temporary state.
  const markedDates: Record<string, any> = {};

  // Mark booked dates.
  groupConsecutiveDates(bookedDates).forEach((group) => {
    group.dates.forEach((date) => {
      markedDates[date] = {
        disabled: true,
        disableTouchEvent: true,
        backgroundColor: "lightblue",
      };
    });
  });

  // Mark blocked dates using temporary blocked state.
  tempBlockedDates.forEach((date) => {
    // Show red background if not overridden (i.e. not selected).
    if (!selectedDates.includes(date)) {
      markedDates[date] = { backgroundColor: "lightcoral" };
    }
  });

  // Mark selected dates.
  selectedDates.forEach((date) => {
    // If the date was originally blocked (exists in initialBlockedDates) and has been selected,
    // show a black border to indicate override.
    if (initialBlockedDates.includes(date)) {
      markedDates[date] = {
        selected: true,
        backgroundColor: "lightcoral", // remains red
        borderColor: "black",
        borderWidth: 2,
      };
    } else {
      markedDates[date] = { selected: true, backgroundColor: "black" };
    }
  });

  // Group selected dates for override editing.
  const groups = groupConsecutiveDates(selectedDates);

  // Compute price range for a group.
  const getGroupPriceRange = (group: DateGroup): { min: number; max: number } => {
    const pricesArr = group.dates.map((date) =>
      tempPriceOverrides.hasOwnProperty(date)
        ? tempPriceOverrides[date]
        : computeDefaultPrice(date)
    );
    return { min: Math.min(...pricesArr), max: Math.max(...pricesArr) };
  };

  // Render override popup inputs.
  const renderGroupInputs = () => {
    return groups.map((group, index) => {
      const committedVal =
        tempPriceOverrides[group.dates[0]] !== undefined
          ? tempPriceOverrides[group.dates[0]]
          : computeDefaultPrice(group.dates[0]);
      // Determine if the group is currently blocked in the temporary state.
      const isGroupBlocked = group.dates.every((date) => tempBlockedDates.includes(date));
      return (
        <View
          key={group.start}
          style={[
            styles.groupRow,
            isGroupBlocked && { backgroundColor: "lightcoral", borderColor: "black", borderWidth: 2 },
          ]}
        >
          <Text style={styles.groupLabel}>
            {group.start === group.end ? group.start : `${group.start} - ${group.end}`}
          </Text>
          <TextInput
            style={styles.groupInput}
            keyboardType="numeric"
            value={unsavedOverrides[index] || ""}
            onChangeText={(text) =>
              setUnsavedOverrides((prev) => ({ ...prev, [index]: text }))
            }
            placeholder={committedVal.toString()}
            placeholderTextColor={"#ccc"}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => {
              if (isGroupBlocked) {
                // Toggle to "unblock" the group: remove these dates from the temporary blocked state.
                setTempBlockedDates((prev) => prev.filter((date) => !group.dates.includes(date)));
              } else {
                // Toggle to "block" the group: add these dates to the temporary blocked state.
                setTempBlockedDates((prev) => Array.from(new Set([...prev, ...group.dates])));
              }
            }}
          >
            <Text style={styles.toggleButtonText}>{isGroupBlocked ? "Unblock" : "Block"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupSummary}>
            <Text style={styles.groupSummaryText}>
              Price:{" "}
              {(() => {
                const { min, max } = getGroupPriceRange(group);
                return min === max ? `${min}` : `${min} - ${max}`;
              })()}
            </Text>
          </TouchableOpacity>
        </View>
      );
    });
  };

  // When saving, merge unsaved override values and then commit temporary state.
  const onSaveOverrides = () => {
    let finalOverrides = { ...tempPriceOverrides };
    groups.forEach((group, index) => {
      const unsavedValue = unsavedOverrides[index];
      if (unsavedValue && unsavedValue.trim() !== "") {
        const newPrice = parseFloat(unsavedValue);
        if (!isNaN(newPrice)) {
          group.dates.forEach((date) => {
            finalOverrides[date] = newPrice;
          });
        }
      }
    });
    // Call onSave with the final overrides and the temporary blocked dates.
    onSave({ priceOverrides: finalOverrides, blockedDates: tempBlockedDates });
    // Clear temporary override state.
    setSelectedDates([]);
    setUnsavedOverrides({});
  };

  // Optionally, add a cancel handler that resets temporary state to the persistent values.
  const onCancelOverrides = () => {
    setSelectedDates([]);
    setUnsavedOverrides({});
    setTempBlockedDates(initialBlockedDates);
  };

  return (
    <ScrollView style={styles.container}>
      <Calendar
        style={styles.calendar}
        current={`${year}-${(month + 1).toString().padStart(2, "0")}-01`}
        onDayPress={onDayPress}
        markedDates={markedDates}
        markingType="period"
        hideExtraDays={true}
        dayComponent={({
          date,
          state,
        }: {
          date: { dateString: string; day: number; month: number; year: number };
          state: string;
        }) => {
          const price = tempPriceOverrides.hasOwnProperty(date.dateString)
            ? tempPriceOverrides[date.dateString]
            : computeDefaultPrice(date.dateString);
          const isBooked = bookedDates.includes(date.dateString);
          const isBlocked = tempBlockedDates.includes(date.dateString);
          const isSelected = selectedDates.includes(date.dateString);
          const containerStyle: ViewStyle[] = [styles.dayContainer];
          const dayTextStyle: TextStyle[] = [styles.dayText];
          const priceTextStyle: TextStyle[] = [styles.priceText];

          if (isBooked) {
            containerStyle.push({ backgroundColor: "lightblue" });
          } else if (isBlocked && !isSelected) {
            containerStyle.push({ backgroundColor: "lightcoral" });
          } else if (isBlocked && isSelected) {
            containerStyle.push({ backgroundColor: "lightcoral", borderColor: "black", borderWidth: 2 });
          } else if (isSelected) {
            containerStyle.push({ backgroundColor: "black" });
            dayTextStyle.push({ color: "white" });
            priceTextStyle.push({ color: "white" });
          }
          return (
            <TouchableOpacity
              style={containerStyle}
              onPress={() =>
                onDayPress({
                  dateString: date.dateString,
                  day: date.day,
                  month: date.month,
                  year: date.year,
                })
              }
              disabled={state === "disabled" || isBooked}
            >
              <Text style={[styles.dayText, ...dayTextStyle]}>{date.day}</Text>
              {!isBooked && (
                <Text style={priceTextStyle}>
                  ${typeof price === "number" ? price.toFixed(2) : "0.00"}
                </Text>
              )}
              {isBlocked && !isSelected && <Text style={styles.blockLabel}>Blocked</Text>}
            </TouchableOpacity>
          );
        }}
        theme={{
          todayTextColor: "#70d7c7",
          arrowColor: "#70d7c7",
          textMonthFontSize: 16,
          textMonthFontWeight: "bold",
          textDayHeaderFontSize: 10,
          textDayHeaderFontWeight: "300",
        }}
      />

      {selectedDates.length > 0 && groups.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={onCancelOverrides}>
              <Text style={styles.crossButton}>X</Text>
            </TouchableOpacity>
            <Text style={styles.sheetTitle}>Edit Price Overrides</Text>
            <TouchableOpacity onPress={() => setUnsavedOverrides({})}>
              <Text style={styles.clearButton}>Clear All Inputs</Text>
            </TouchableOpacity>
          </View>
          {renderGroupInputs()}
          <TouchableOpacity style={styles.saveButton} onPress={onSaveOverrides}>
            <Text style={styles.saveButtonText}>Save Overrides</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  calendar: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    margin: 10,
  },
  dayContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
    margin: 1,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  dayText: { fontSize: 14 },
  priceText: { fontSize: 10 },
  blockLabel: { fontSize: 8, color: "orange" },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    margin: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  crossButton: { fontSize: 18, fontWeight: "bold", color: "red" },
  // Use only one definition for sheetTitle
  sheetTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  clearButton: { fontSize: 14, color: "#70d7c7" },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 5,
  },
  groupLabel: { flex: 2, fontSize: 14, color: "#333" },
  groupInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 4,
    padding: 5,
    color: "#333",
  },
  groupSummary: {
    flex: 1,
    padding: 5,
    backgroundColor: "#e6f7ff",
    borderRadius: 4,
    alignItems: "center",
  },
  groupSummaryText: { fontSize: 14, color: "#333" },
  toggleButton: {
    flex: 1,
    padding: 5,
    backgroundColor: "#ddd",
    borderRadius: 4,
    alignItems: "center",
    marginLeft: 5,
  },
  toggleButtonText: { fontSize: 12, color: "#333" },
  saveButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalContent: { padding: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  inputLabel: { width: 130, fontSize: 16, color: "#333" },
  inputField: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  cancellationModalContent: { padding: 20, paddingBottom: 80 },
  cancellationSaveContainer: { padding: 20, borderTopWidth: 1, borderColor: "#ccc", backgroundColor: "#fff" },
  policyCard: { borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 10, borderRadius: 8 },
  selectedPolicyCard: { borderColor: "#70d7c7", backgroundColor: "#e6f7ff" },
  policyTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  policyDescription: { fontSize: 14, color: "#555" },
  policyLink: { color: "#70d7c7", textDecorationLine: "underline", marginTop: 5 },
});

export default PricingCalendarBottomSheet;
