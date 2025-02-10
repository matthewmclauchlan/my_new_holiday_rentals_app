// components/PricingCalendarBottomSheet.tsx
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

// UPDATED: onSave now expects both priceOverrides and blockedDates.
// New props: initialPriceOverrides and initialBlockedDates are used to pre-populate the calendar.
export interface PricingCalendarBottomSheetProps {
  year: number;
  month: number;
  priceRules: PriceRules;
  bookedDates?: string[];
  // New props for initial overrides:
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
  // Initialize state with passed-in initial values.
  const [priceOverrides, setPriceOverrides] = useState<Record<string, number>>(initialPriceOverrides);
  const [localBlockedDates, setLocalBlockedDates] = useState<string[]>(initialBlockedDates);
  
  // State for user-selected dates (for editing)
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  // Temporary state for override input per group index.
  const [unsavedOverrides, setUnsavedOverrides] = useState<Record<number, string>>({});
  // Toggle for marking a group as blocked.
  const [groupBlocked, setGroupBlocked] = useState<Record<number, boolean>>({});
  // Control the visibility of the override editing card.
  const [showCard, setShowCard] = useState<boolean>(false);

  // Update local state if the initial props change (e.g. when switching properties)
  useEffect(() => {
    setPriceOverrides(initialPriceOverrides);
  }, [initialPriceOverrides]);

  useEffect(() => {
    setLocalBlockedDates(initialBlockedDates);
  }, [initialBlockedDates]);

  useEffect(() => {
    if (selectedDates.length > 0) {
      setShowCard(true);
    } else {
      setShowCard(false);
    }
  }, [selectedDates]);

  // Compute the default price for a given ISO date.
  const computeDefaultPrice = (dateStr: string): number => {
    const dateObj = new Date(dateStr);
    const day = dateObj.getDay();
    return day === 0 || day === 6
      ? priceRules.basePricePerNightWeekend
      : priceRules.basePricePerNight;
  };

  // Called when a day is pressed on the calendar.
  const onDayPress = (day: {
    dateString: string;
    day: number;
    month: number;
    year: number;
  }) => {
    const ds = day.dateString;
    // Do nothing if the day is booked or already blocked.
    if (bookedDates.includes(ds) || localBlockedDates.includes(ds)) return;
    if (selectedDates.includes(ds)) {
      setSelectedDates(selectedDates.filter((d) => d !== ds));
      const newOverrides = { ...priceOverrides };
      delete newOverrides[ds];
      setPriceOverrides(newOverrides);
    } else {
      setSelectedDates([...selectedDates, ds]);
      if (!(ds in priceOverrides)) {
        setPriceOverrides((prev) => ({
          ...prev,
          [ds]: computeDefaultPrice(ds),
        }));
      }
    }
  };

  // Build the markedDates object for the Calendar.
  const markedDates: Record<string, any> = {};

  // Process booked dates: mark with a light blue border.
  const bookedGroups = groupConsecutiveDates(bookedDates);
  bookedGroups.forEach((group) => {
    group.dates.forEach((date, index) => {
      let marking: any = {
        disabled: true,
        disableTouchEvent: true,
        borderColor: "lightblue",
      };
      if (index === 0) marking.startingDay = true;
      if (index === group.dates.length - 1) marking.endingDay = true;
      markedDates[date] = marking;
    });
  });

  // Process blocked dates from localBlockedDates: mark with a red border.
  localBlockedDates.forEach((date) => {
    markedDates[date] = {
      disabled: true,
      disableTouchEvent: true,
      borderColor: "red",
    };
  });

  // Process selected dates: mark with a green border if not booked/blocked.
  selectedDates.forEach((date) => {
    markedDates[date] = {
      ...(markedDates[date] || {}),
      selected: true,
      selectedColor: "#70d7c7",
    };
  });

  // Group selected dates for override editing.
  const groups = groupConsecutiveDates(selectedDates);

  // Compute the price range for a group.
  const getGroupPriceRange = (group: DateGroup): { min: number; max: number } => {
    const prices = group.dates.map((date) =>
      priceOverrides[date] !== undefined
        ? priceOverrides[date]
        : computeDefaultPrice(date)
    );
    return { min: Math.min(...prices), max: Math.max(...prices) };
  };

  // Render input fields for each group.
  const renderGroupInputs = () => {
    return groups.map((group, index) => {
      const committedVal =
        priceOverrides[group.dates[0]] !== undefined
          ? priceOverrides[group.dates[0]]
          : computeDefaultPrice(group.dates[0]);
      const labelStyle: TextStyle[] = [styles.groupLabel];
      const inputStyle: TextStyle[] = [styles.groupInput];
      const summaryTextStyle: TextStyle[] = [styles.groupSummaryText];
      const rowStyle: ViewStyle[] = [styles.groupRow];
      if (groupBlocked[index]) {
        rowStyle.push({ backgroundColor: "black" });
        labelStyle.push({ color: "white" });
        inputStyle.push({ color: "white" });
        summaryTextStyle.push({ color: "white" });
      }
      return (
        <View key={group.start} style={rowStyle}>
          <Text style={labelStyle}>
            {group.start === group.end ? group.start : `${group.start} - ${group.end}`}
          </Text>
          <TextInput
            style={inputStyle}
            keyboardType="numeric"
            value={unsavedOverrides[index] || ""}
            onChangeText={(text) =>
              setUnsavedOverrides((prev) => ({ ...prev, [index]: text }))
            }
            placeholder={committedVal.toString()}
            placeholderTextColor={groupBlocked[index] ? "lightgray" : "#ccc"}
          />
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() =>
              setGroupBlocked((prev) => ({ ...prev, [index]: !prev[index] }))
            }
          >
            <Text style={styles.toggleButtonText}>
              {groupBlocked[index] ? "Unblock" : "Block"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.groupSummary}>
            <Text style={summaryTextStyle}>
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

  // Close the popup and reset state.
  const onClosePopup = () => {
    setSelectedDates([]);
    setUnsavedOverrides({});
    setGroupBlocked({});
    setShowCard(false);
  };

  // When saving, merge unsaved override values and compile blocked dates.
  const onSaveOverrides = () => {
    let finalOverrides = { ...priceOverrides };
    let finalBlockedDates: string[] = [];
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
      if (groupBlocked[index]) {
        finalBlockedDates = finalBlockedDates.concat(group.dates);
      }
    });
    finalBlockedDates = Array.from(new Set(finalBlockedDates));
    setPriceOverrides(finalOverrides);
    onSave({ priceOverrides: finalOverrides, blockedDates: finalBlockedDates });
    setSelectedDates([]);
    setUnsavedOverrides({});
    setGroupBlocked({});
    setShowCard(false);
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
          const price = priceOverrides.hasOwnProperty(date.dateString)
            ? priceOverrides[date.dateString]
            : computeDefaultPrice(date.dateString);
          const isBooked = bookedDates.includes(date.dateString);
          const isBlocked = localBlockedDates.includes(date.dateString);
          const isSelected = selectedDates.includes(date.dateString);
          const containerStyle: ViewStyle[] = [styles.dayContainer];
          if (isBooked) {
            containerStyle.push({ borderColor: "lightblue" } as ViewStyle);
          }
          if (isBlocked) {
            containerStyle.push({ borderColor: "red" } as ViewStyle);
          }
          if (isSelected && !isBooked && !isBlocked) {
            containerStyle.push({ borderColor: "green" } as ViewStyle);
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
              disabled={state === "disabled"}
            >
              <Text style={styles.dayText}>{date.day}</Text>
              <Text style={styles.priceText}>${price}</Text>
              {isBlocked && <Text style={styles.blockLabel}>Blocked</Text>}
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

      {showCard && groups.length > 0 && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <TouchableOpacity onPress={onClosePopup}>
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
  container: {
    flex: 1,
  },
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
  dayText: {
    fontSize: 14,
  },
  priceText: {
    fontSize: 10,
  },
  blockLabel: {
    fontSize: 8,
    color: "orange",
  },
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
  crossButton: {
    fontSize: 18,
    fontWeight: "bold",
    color: "red",
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  clearButton: {
    fontSize: 14,
    color: "#70d7c7",
  },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    padding: 5,
  },
  groupLabel: {
    flex: 2,
    fontSize: 14,
    color: "#333",
  },
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
  groupSummaryText: {
    fontSize: 14,
    color: "#333",
  },
  toggleButton: {
    flex: 1,
    padding: 5,
    backgroundColor: "#ddd",
    borderRadius: 4,
    alignItems: "center",
    marginLeft: 5,
  },
  toggleButtonText: {
    fontSize: 12,
    color: "#333",
  },
  saveButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default PricingCalendarBottomSheet;
