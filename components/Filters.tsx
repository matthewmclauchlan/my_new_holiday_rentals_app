// components/Filters.tsx

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import Checkbox from "expo-checkbox";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

interface FilterOptions {
  category: string;
  location: string;
  priceMin: number;
  priceMax: number;
  bedrooms: number;
  bathrooms: number;
  amenities: string[];
  guestCount: number;
  startDate: string | null;
  endDate: string | null;
}

interface FiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
}

const categories = [
  { category: "All", title: "All" },
  { category: "Apartment", title: "Apartment" },
  { category: "House", title: "House" },
  { category: "Villa", title: "Villa" },
  { category: "Farmhouse", title: "Farmhouse" },
  // Add more categories as needed
];

const amenitiesList = [
  "WiFi",
  "Pool",
  "Air Conditioning",
  "Parking",
  "Gym",
  "Kitchen",
  // Add more amenities as needed
];

const Filters: React.FC<FiltersProps> = ({ onFilterChange }) => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isModalVisible, setIsModalVisible] = useState(false);
  
  // Additional Filters States
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState([50, 500]); // [min, max]
  const [bedrooms, setBedrooms] = useState(0);
  const [bathrooms, setBathrooms] = useState(0);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [guestCount, setGuestCount] = useState(1);
  
  // Date Filters
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((item) => item !== amenity)
        : [...prev, amenity]
    );
  };

  const applyFilters = () => {
    onFilterChange({
      category: selectedCategory,
      location,
      priceMin: priceRange[0],
      priceMax: priceRange[1],
      bedrooms,
      bathrooms,
      amenities: selectedAmenities,
      guestCount,
      startDate: startDate ? startDate.toISOString().split('T')[0] : null, // Format as YYYY-MM-DD
      endDate: endDate ? endDate.toISOString().split('T')[0] : null,
    });
    setIsModalVisible(false);
  };

  const resetFilters = () => {
    setSelectedCategory("All");
    setLocation("");
    setPriceRange([50, 500]);
    setBedrooms(0);
    setBathrooms(0);
    setSelectedAmenities([]);
    setGuestCount(1);
    setStartDate(null);
    setEndDate(null);
    onFilterChange({
      category: "All",
      location: "",
      priceMin: 50,
      priceMax: 500,
      bedrooms: 0,
      bathrooms: 0,
      amenities: [],
      guestCount: 1,
      startDate: null,
      endDate: null,
    });
    setIsModalVisible(false);
  };

  const onChangeStartDate = (event: any, selectedDate: Date | undefined) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
      // If endDate is before startDate, reset endDate
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
      }
    }
  };

  const onChangeEndDate = (event: any, selectedDate: Date | undefined) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      {/* Category Filters with "Additional Filters" Button */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((item, index) => (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory(item.category);
              onFilterChange({
                category: item.category,
                location,
                priceMin: priceRange[0],
                priceMax: priceRange[1],
                bedrooms,
                bathrooms,
                amenities: selectedAmenities,
                guestCount,
                startDate: startDate ? startDate.toISOString().split('T')[0] : null,
                endDate: endDate ? endDate.toISOString().split('T')[0] : null,
              });
            }}
            key={index}
            style={[
              styles.button,
              selectedCategory === item.category
                ? styles.selectedButton
                : styles.unselectedButton,
            ]}
          >
            <Text
              style={[
                styles.text,
                selectedCategory === item.category
                  ? styles.selectedText
                  : styles.unselectedText,
              ]}
            >
              {item.title}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Additional Filters Button as part of ScrollView */}
        <TouchableOpacity
          style={styles.additionalFiltersButton}
          onPress={() => setIsModalVisible(true)}
        >
          <Ionicons name="filter" size={20} color="#fff" />
          <Text style={styles.additionalFiltersText}>More Filters</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal for Additional Filters */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={false}
      >
        <ScrollView style={styles.modalContainer}>
          <Text style={styles.modalTitle}>Additional Filters</Text>

          {/* Location Filter */}
          <Text style={styles.filterLabel}>Location</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter city or neighborhood"
            value={location}
            onChangeText={setLocation}
          />

          {/* Price Range Filter */}
          <Text style={styles.filterLabel}>Price Range (${priceRange[0]} - ${priceRange[1]})</Text>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>Min: ${priceRange[0]}</Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={0}
              maximumValue={1000}
              step={10}
              value={priceRange[0]}
              onValueChange={(value) => setPriceRange([value, Math.max(value, priceRange[1])])}
              minimumTrackTintColor="#70d7c7"
              maximumTrackTintColor="#ccc"
            />
            <Text style={styles.sliderLabel}>Max: ${priceRange[1]}</Text>
            <Slider
              style={{ width: "100%", height: 40 }}
              minimumValue={priceRange[0]} // Ensure max slider doesn't go below min
              maximumValue={1000}
              step={10}
              value={priceRange[1]}
              onValueChange={(value) => setPriceRange([priceRange[0], value])}
              minimumTrackTintColor="#70d7c7"
              maximumTrackTintColor="#ccc"
            />
          </View>

          {/* Bedrooms Filter */}
          <Text style={styles.filterLabel}>Bedrooms</Text>
          <Picker
            selectedValue={bedrooms.toString()} // Convert number to string
            onValueChange={(itemValue) => setBedrooms(parseInt(itemValue))}
            style={styles.picker}
          >
            <Picker.Item label="Any" value="0" />
            <Picker.Item label="1" value="1" />
            <Picker.Item label="2" value="2" />
            <Picker.Item label="3+" value="3" />
          </Picker>

          {/* Bathrooms Filter */}
          <Text style={styles.filterLabel}>Bathrooms</Text>
          <Picker
            selectedValue={bathrooms.toString()} // Convert number to string
            onValueChange={(itemValue) => setBathrooms(parseInt(itemValue))}
            style={styles.picker}
          >
            <Picker.Item label="Any" value="0" />
            <Picker.Item label="1" value="1" />
            <Picker.Item label="2" value="2" />
            <Picker.Item label="3+" value="3" />
          </Picker>

          {/* Amenities Filter */}
          <Text style={styles.filterLabel}>Amenities</Text>
          {amenitiesList.map((amenity, index) => (
            <View key={index} style={styles.checkboxContainer}>
              <Checkbox
                value={selectedAmenities.includes(amenity)}
                onValueChange={() => toggleAmenity(amenity)}
                color={selectedAmenities.includes(amenity) ? "#70d7c7" : undefined}
              />
              <Text style={styles.checkboxLabel}>{amenity}</Text>
            </View>
          ))}

          {/* Guest Count Filter */}
          <Text style={styles.filterLabel}>Guest Count</Text>
          <Picker
            selectedValue={guestCount.toString()} // Convert number to string
            onValueChange={(itemValue) => setGuestCount(parseInt(itemValue))}
            style={styles.picker}
          >
            <Picker.Item label="1 Guest" value="1" />
            <Picker.Item label="2 Guests" value="2" />
            <Picker.Item label="3 Guests" value="3" />
            <Picker.Item label="4 Guests" value="4" />
            <Picker.Item label="5+ Guests" value="5" />
          </Picker>

          {/* Date Filters */}
          <Text style={styles.filterLabel}>Check-in Date</Text>
          <TouchableOpacity onPress={() => setShowStartDatePicker(true)} style={styles.datePicker}>
            <Text>{startDate ? startDate.toDateString() : "Select Check-in Date"}</Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeStartDate}
              minimumDate={new Date()}
            />
          )}

          <Text style={styles.filterLabel}>Check-out Date</Text>
          <TouchableOpacity onPress={() => setShowEndDatePicker(true)} style={styles.datePicker}>
            <Text>{endDate ? endDate.toDateString() : "Select Check-out Date"}</Text>
          </TouchableOpacity>
          {showEndDatePicker && (
            <DateTimePicker
              value={endDate || new Date()}
              mode="date"
              display="default"
              onChange={onChangeEndDate}
              minimumDate={startDate || new Date()}
            />
          )}

          {/* Apply and Reset Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.applyButton} onPress={applyFilters}>
              <Text style={styles.buttonText}>Apply Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
              <Text style={styles.buttonText}>Reset Filters</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // Flex direction row to align ScrollView and potential indicators
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    position: "relative", // For positioning the fade gradient
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: "center",
    paddingRight: 20, // Extra padding to ensure the last item is fully visible
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
  },
  selectedButton: {
    backgroundColor: "#70d7c7",
    borderColor: "#70d7c7",
  },
  unselectedButton: {
    backgroundColor: "#f0f0f0",
    borderColor: "#ccc",
  },
  text: {
    fontSize: 14,
  },
  selectedText: {
    color: "#fff",
    fontWeight: "bold",
  },
  unselectedText: {
    color: "#333",
  },
  additionalFiltersButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#70d7c7",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  additionalFiltersText: {
    color: "#fff",
    marginLeft: 5,
    fontSize: 14,
    fontWeight: "bold",
  },
  modalContainer: {
    padding: 20,
    backgroundColor: "#fff",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 16,
  },
  picker: {
    height: 50,
    width: "100%",
  },
  checkboxContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
  },
  checkboxLabel: {
    marginLeft: 8,
    fontSize: 14,
  },
  datePicker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  sliderContainer: {
    width: "100%",
    alignItems: "stretch",
  },
  sliderLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 5,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 30,
  },
  applyButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  resetButton: {
    backgroundColor: "#ff4d4d",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default Filters;
