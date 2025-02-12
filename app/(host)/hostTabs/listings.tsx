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
    // Try to use the "images" field (an array of stringified objects)
    // to determine the main image.
    let imageUrl = localPlaceholder;

    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      try {
        const parsedImages = item.images.map((imgString: string) =>
          JSON.parse(imgString)
        );
        // Look for the image marked as main; if not found, take the first image.
        const mainImg = parsedImages.find((img: any) => img.isMain) || parsedImages[0];
        if (mainImg) {
          imageUrl = { uri: mainImg.remoteUrl || mainImg.localUri };
        }
      } catch (err) {
        console.error("Error parsing property images", err);
      }
    }
    
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
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

  // Render the Add New Listing element as a footer.
  const renderFooter = () => (
    <TouchableOpacity
      style={styles.addListingContainer}
      onPress={() => router.push("../property-setup")}
    >
      <Text style={styles.addListingText}>Add New Listing</Text>
      <Image source={require('@/assets/icons/add.png')} style={styles.addIcon} />
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
            <Text style={styles.noPropertiesText}>No listings available.</Text>
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
    backgroundColor: "#fff",
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    // Removed rounded corners from card container if desired:
    borderRadius: 0,
  },
  cardImage: {
    width: 60,
    height: 60,
    // Apply curved corners to the image
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
  addListingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  addListingText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#70d7c7",
  },
  addIcon: {
    width: 20,
    height: 20,
    tintColor: "#70d7c7",
    marginLeft: 5,
  },
});

export default Listings;
