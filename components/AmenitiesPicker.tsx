// components/AmenitiesPicker.tsx
import React, { useEffect, useState } from "react";
import {
  SectionList,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useAppwrite } from "@/lib/useAppwrite";
import { getAmenities } from "@/lib/data"; // Verify this import is correct!
import { Amenity, AmenitySection } from "@/lib/types";
import { groupAmenitiesByFirstLetter } from "@/lib/utils";

interface AmenitiesPickerProps {
  selectedAmenities: string[];
  onToggle: (id: string) => void;
}

export default function AmenitiesPicker({
  selectedAmenities,
  onToggle,
}: AmenitiesPickerProps) {
  const { data, loading, error } = useAppwrite<Amenity[], {}>({
    fn: getAmenities,
    params: {},
    skip: false,
  });

  const [sections, setSections] = useState<AmenitySection[]>([]);

  useEffect(() => {
    if (data) {
      console.log("Amenities data fetched:", data);
      const grouped = groupAmenitiesByFirstLetter(data);
      console.log("Grouped Amenities:", grouped);
      setSections(grouped);
    }
  }, [data]);

  if (loading) {
    return <ActivityIndicator style={styles.loader} />;
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <SectionList
      nestedScrollEnabled={true} // Allows inner list to scroll when nested
      sections={sections}
      keyExtractor={(item) => item.$id}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => (
        <View style={styles.itemRow}>
          <TouchableOpacity onPress={() => onToggle(item.$id)} style={styles.checkbox}>
            <Text style={styles.checkboxText}>
              {selectedAmenities.includes(item.$id) ? "✓" : ""}
            </Text>
          </TouchableOpacity>
          <Text style={styles.itemText}>{item.name}</Text>
        </View>
      )}
      contentContainerStyle={styles.listContainer}
    />
  );
}

const styles = StyleSheet.create({
  loader: { marginVertical: 20 },
  errorContainer: { padding: 10 },
  errorText: { color: "red" },
  sectionHeader: {
    backgroundColor: "#eee",
    paddingVertical: 5,
    paddingHorizontal: 10,
    fontWeight: "bold",
  },
  listContainer: { paddingBottom: 20 },
  itemRow: { flexDirection: "row", alignItems: "center", padding: 10 },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: "#ccc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  checkboxText: { fontSize: 16 },
  itemText: { fontSize: 16 },
});