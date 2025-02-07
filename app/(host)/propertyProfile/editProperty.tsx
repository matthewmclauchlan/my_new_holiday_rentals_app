import React, { useState, useEffect } from "react";
import { SafeAreaView, ScrollView, View, Text, TextInput, Button, StyleSheet, TouchableOpacity } from "react-native";
import Collapsible from "react-native-collapsible";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getPropertyById, updateProperty } from "@/lib/appwrite";
import { useGlobalContext } from "@/app/global-provider";
import { Alert } from "react-native";


const EditProperty = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useGlobalContext();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Control collapsible sections
  const [isBasicInfoOpen, setBasicInfoOpen] = useState(true);
  const [isAvailabilityOpen, setAvailabilityOpen] = useState(false);
  const [isAmenitiesOpen, setAmenitiesOpen] = useState(false);
  // ... add more sections as needed

  useEffect(() => {
    const fetchProperty = async () => {
      try {
        const data = await getPropertyById(id);
        setProperty(data);
      } catch (error) {
        console.error("Error fetching property:", error);
      } finally {
        setLoading(false);
      }
    };
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const handleSave = async () => {
    try {
      // Prepare updated data from state or refs
      const updatedData = {
        // For example, updating the description
        description: property.description,
        // Include other updated fields...
      };
      const updatedProperty = await updateProperty(id, updatedData);
      setProperty(updatedProperty);
      Alert.alert("Success", "Property updated successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update property");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading property...</Text>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Property not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Edit Property: {property.name}</Text>
        
        {/* Basic Info Section */}
        <TouchableOpacity onPress={() => setBasicInfoOpen(!isBasicInfoOpen)}>
          <Text style={styles.sectionHeader}>Basic Info</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!isBasicInfoOpen}>
          <TextInput
            style={styles.input}
            value={property.description}
            onChangeText={(text) => setProperty({ ...property, description: text })}
            placeholder="Property Description"
          />
          {/* Add more basic info fields as needed */}
        </Collapsible>

        {/* Availability Section */}
        <TouchableOpacity onPress={() => setAvailabilityOpen(!isAvailabilityOpen)}>
          <Text style={styles.sectionHeader}>Availability</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!isAvailabilityOpen}>
          {/* Add availability fields, such as check-in and check-out dates */}
          <TextInput
            style={styles.input}
            value={property.checkIn}
            onChangeText={(text) => setProperty({ ...property, checkIn: text })}
            placeholder="Check-in Date"
          />
          <TextInput
            style={styles.input}
            value={property.checkOut}
            onChangeText={(text) => setProperty({ ...property, checkOut: text })}
            placeholder="Check-out Date"
          />
        </Collapsible>

        {/* Amenities Section */}
        <TouchableOpacity onPress={() => setAmenitiesOpen(!isAmenitiesOpen)}>
          <Text style={styles.sectionHeader}>Amenities</Text>
        </TouchableOpacity>
        <Collapsible collapsed={!isAmenitiesOpen}>
          {/* Render a list of amenities or use a custom picker */}
          <TextInput
            style={styles.input}
            value={property.amenities ? property.amenities.join(", ") : ""}
            onChangeText={(text) =>
              setProperty({ ...property, amenities: text.split(",").map((a) => a.trim()) })
            }
            placeholder="Amenities (comma separated)"
          />
        </Collapsible>

        {/* Save Button */}
        <View style={styles.buttonRow}>
          <Button title="Save Changes" onPress={handleSave} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  content: { paddingBottom: 32 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginTop: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginVertical: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
});

export default EditProperty;
