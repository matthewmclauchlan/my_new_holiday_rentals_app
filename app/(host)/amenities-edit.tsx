import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AmenitiesPicker from '../../components/AmenitiesPicker';
import SaveButton from '../../components/saveButton';
import { getPropertyById, databases } from '../../lib/appwrite';
import Constants from 'expo-constants';
import { useGlobalContext } from '../../app/global-provider';
// Use the normalization functions from your utils file.
import { normalizeString, normalizeAmenity } from "../../lib/utils";

const extra = Constants.manifest?.extra || Constants.expoConfig?.extra || {};
const { appwriteDatabaseId, appwritePropertiesCollectionId } = extra;

console.log("appwriteDatabaseId:", appwriteDatabaseId);
console.log("appwritePropertiesCollectionId:", appwritePropertiesCollectionId);

// Force full-screen modal presentation
export const unstable_settings = {
  presentation: 'modal',
};

// Helper to capitalize the first letter
const capitalizeFirstLetter = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export default function AmenitiesEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { updatePropertyCache } = useGlobalContext();
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch property amenities from the database on mount.
  useEffect(() => {
    async function fetchProperty() {
      try {
        const property = await getPropertyById(id);
        // Normalize amenities from the DB using the imported normalizeAmenity function.
        const amenitiesFromDB: string[] = (property?.amenities || []).map(normalizeAmenity);
        setSelectedAmenities(amenitiesFromDB);
      } catch (error) {
        Alert.alert('Error', 'Failed to load property amenities');
      }
    }
    if (id) {
      fetchProperty();
    }
  }, [id]);

  const handleSaveAmenities = async () => {
    setIsSaving(true);
    try {
      // Save the (normalized) selectedAmenities array.
      const updatedProp = await databases.updateDocument(
        appwriteDatabaseId,
        appwritePropertiesCollectionId,
        id,
        { amenities: selectedAmenities }
      );
      Alert.alert('Success', 'Amenities updated successfully');
      if (updatePropertyCache) {
        updatePropertyCache(updatedProp);
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update amenities');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Text style={styles.closeText}>X</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Amenities</Text>
        <View style={{ width: 40 }} /> {/* Spacer */}
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        {/* Chip List: Display Currently Selected Amenities */}
        <Text style={styles.sectionTitle}>Currently Selected Amenities</Text>
        <View style={styles.chipsContainer}>
          {selectedAmenities.length > 0 ? (
            selectedAmenities.map((amenity, index) => (
              <View key={index} style={styles.amenityChip}>
                <Text style={styles.amenityChipText}>
                  {capitalizeFirstLetter(amenity)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.infoText}>No amenities selected.</Text>
          )}
        </View>
        
        <View style={styles.separator} />

        {/* AmenitiesPicker */}
        <Text style={styles.sectionTitle}>Select Amenities</Text>
        <AmenitiesPicker
          selectedAmenities={selectedAmenities}
          onToggle={(amenity: string) => {
            const normAmenity = normalizeAmenity(amenity);
            setSelectedAmenities((prev) => {
              if (prev.some(a => a === normAmenity)) {
                return prev.filter(a => a !== normAmenity);
              } else {
                return [...prev, normAmenity];
              }
            });
          }}
        />
      </ScrollView>

      {/* Fixed Save Button */}
      <View style={styles.fixedButtonContainer}>
        <SaveButton onPress={handleSaveAmenities} isSaving={isSaving} title="Save Amenities" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderColor: '#ccc' },
  closeButton: { padding: 10 },
  closeText: { fontSize: 18, fontWeight: 'bold' },
  title: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 100 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 10 },
  chipsContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  amenityChip: { backgroundColor: '#70d7c7', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, marginRight: 10, marginBottom: 10 },
  amenityChipText: { color: '#fff', fontSize: 14 },
  infoText: { fontSize: 16, color: '#666' },
  separator: { height: 1, backgroundColor: '#ccc', marginVertical: 20 },
  fixedButtonContainer: { position: 'absolute', bottom: 20, left: 20, right: 20 },
});
