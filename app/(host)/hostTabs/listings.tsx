// app/(host)/hostTabs/addProperty.tsx

import React, { useState, useEffect } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  ActivityIndicator 
} from "react-native";
import { useGlobalContext } from "../../global-provider";
import { useRouter } from "expo-router";
import { getPropertiesByUser } from "@/lib/appwrite"; // Ensure this function is implemented and exported

export default function AddListings() {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (user && user.$id) {
        try {
          console.log(`Fetching properties for user: ${user.$id}`);
          const result = await getPropertiesByUser(user.$id);
          console.log("Fetched properties:", result);
          setProperties(result);
        } catch (error) {
          console.error("Error fetching properties:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [user]);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.propertyItem} 
      onPress={() => router.push(`/properties/${item.$id}`)}
    >
      <Text style={styles.propertyTitle}>{item.name}</Text>
      <Text style={styles.propertyType}>{item.type}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Your Listed Properties</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0061FF" />
      ) : properties.length === 0 ? (
        <Text style={styles.noPropertiesText}>No properties listed yet.</Text>
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />
      )}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => router.push("/(host)/hostTabs/property-setup")}
      >
        <Text style={styles.addButtonText}>+ List a New Property</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  heading: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  listContainer: {
    paddingBottom: 20,
  },
  propertyItem: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginBottom: 10,
  },
  propertyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  propertyType: {
    fontSize: 14,
    color: "#666",
  },
  noPropertiesText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: "#0061FF",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
