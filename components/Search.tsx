// components/Search.tsx
import React, { useState } from "react";
import { View, TouchableOpacity, Image, TextInput, Text, StyleSheet } from "react-native";
import { useDebouncedCallback } from "use-debounce";
import DateTimePicker from "@react-native-community/datetimepicker";

import icons from "../constants/icons";
import { useLocalSearchParams, router, usePathname } from "expo-router";

const Search = () => {
  const path = usePathname();
  const params = useLocalSearchParams<{ query?: string; startDate?: string; endDate?: string }>();
  const [search, setSearch] = useState(params.query || "");

  // Date States
  const [startDate, setStartDate] = useState<Date | null>(params.startDate ? new Date(params.startDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(params.endDate ? new Date(params.endDate) : null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const debouncedSearch = useDebouncedCallback((text: string) => {
    router.setParams({ query: text });
  }, 500);

  const handleSearch = (text: string) => {
    setSearch(text);
    debouncedSearch(text);
  };

  const onChangeStartDate = (event: any, selectedDate: Date | undefined) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // If endDate is before startDate, reset endDate
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
        router.setParams({
          query: search,
          startDate: selectedDate.toISOString().split('T')[0],
          endDate: undefined,
        });
      } else {
        router.setParams({
          query: search,
          startDate: selectedDate.toISOString().split('T')[0],
          endDate: endDate ? endDate.toISOString().split('T')[0] : undefined,
        });
      }
    }
  };

  const onChangeEndDate = (event: any, selectedDate: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
      router.setParams({
        query: search,
        startDate: startDate ? startDate.toISOString().split('T')[0] : undefined,
        endDate: selectedDate.toISOString().split('T')[0],
      });
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Image source={icons.search} style={styles.icon} />
        <TextInput
          value={search}
          onChangeText={handleSearch}
          placeholder="Search for anything"
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Date Pickers */}
      <View style={styles.dateContainer}>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowStartDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {startDate ? `Check-in: ${startDate.toLocaleDateString()}` : "Select Check-in"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowEndDatePicker(true)}
          disabled={!startDate}
        >
          <Text style={[styles.dateText, !startDate && styles.disabledText]}>
            {endDate ? `Check-out: ${endDate.toLocaleDateString()}` : "Select Check-out"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Button */}
      <TouchableOpacity style={styles.filterButton}>
        <Image source={icons.filter} style={styles.icon} />
      </TouchableOpacity>

      {/* DateTimePickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={onChangeStartDate}
          minimumDate={new Date()}
        />
      )}
      {showEndDatePicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={onChangeEndDate}
          minimumDate={startDate || new Date()}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F0F0F0",
    borderRadius: 10,
    marginTop: 10,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 20,
    height: 20,
    resizeMode: "contain",
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
  },
  dateContainer: {
    flexDirection: "column",
    marginLeft: 10,
  },
  dateButton: {
    paddingVertical: 4,
  },
  dateText: {
    fontSize: 14,
    color: "#333",
  },
  disabledText: {
    color: "#AAA",
  },
  filterButton: {
    marginLeft: 10,
  },
});

export default Search;
