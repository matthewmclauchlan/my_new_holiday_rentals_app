import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  View,
  Text,
  Image,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { getPropertiesByUser } from "@/lib/appwrite";
import { useGlobalContext } from "../../global-provider";

// In case no media is provided, we fall back to a placeholder.
// (You can remove this if you always expect a valid image URL.)
const localPlaceholder = require("../../../assets/images/no-result.png");

const Listings = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      if (user && user.$id) {
        try {
          const result = await getPropertiesByUser(user.$id);
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

  const renderItem = ({ item }: { item: any }) => {
    // Use the first media URL if available; otherwise fall back.
    const imageUrl =
      Array.isArray(item.media) && item.media.length > 0
        ? { uri: item.media[0] }
        : localPlaceholder;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          // Update the route below to match your file structure.
          // If your file is named "editProperty.tsx" inside app/(host)/properties/,
          // then the route below should work.
          router.push(`../propertyProfile/${item.$id}`)

        }
      >
        <Image source={imageUrl} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Option 1: Render the Add New Listing button as a footer on the FlatList.
  const renderFooter = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={() =>
        // Use the full route without the file extension.
        router.push("../property-setup")
      }
    >
      <Text style={styles.addButtonText}>+ Add New Listing</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Your Listings</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#0061FF" />
      ) : (
        <FlatList
          data={properties}
          keyExtractor={(item) => item.$id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <Text style={styles.noPropertiesText}>
              No listings available.
            </Text>
          }
          ListFooterComponent={renderFooter}
        />
      )}
    </SafeAreaView>
  );
};

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
  noPropertiesText: {
    textAlign: "center",
    color: "#666",
    marginTop: 20,
    fontSize: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
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

export default Listings;
