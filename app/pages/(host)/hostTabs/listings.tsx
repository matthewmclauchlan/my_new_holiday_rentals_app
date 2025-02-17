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
import { getPropertiesByUser } from "../../../../lib/appwrite";
import { useGlobalContext } from "../../global-provider";

// Fallback placeholder image for properties
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

  // Function to extract the main image from the property images array.
  const getPropertyImageSource = (item: any) => {
    let imageSource = localPlaceholder;
    if (item.images && Array.isArray(item.images) && item.images.length > 0) {
      try {
        const parsedImages = item.images.map((imgString: string) =>
          JSON.parse(imgString)
        );
        // Look for the image marked as main; if not found, take the first image.
        const mainImg =
          parsedImages.find((img: any) => img.isMain) || parsedImages[0];
        if (mainImg) {
          imageSource = { uri: mainImg.remoteUrl || mainImg.localUri };
        }
      } catch (err) {
        console.error("Error parsing property images", err);
      }
    }
    return imageSource;
  };

  const renderItem = ({ item }: { item: any }) => {
    const imageSource = getPropertyImageSource(item);
    return (
      <TouchableOpacity
        style={styles.propertyCard}
        onPress={() => router.push(`../propertyProfile/${item.$id}`)}
      >
        <View style={styles.cardContent}>
          <Image source={imageSource} style={styles.propertyImage} />
          <Text style={styles.propertyCardText}>{item.name}</Text>
          <Image
            source={require('../../../assets/icons/edit.png')}
            style={styles.editIcon}
          />
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
      <Image source={require('../../../assets/icons/add.png')} style={styles.addIcon} />
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
  // Card styling (same as HostCalendarPage)
  propertyCard: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    marginHorizontal: 10,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  propertyImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    marginRight: 10,
    resizeMode: "cover",
  },
  propertyCardText: {
    flex: 1,
    fontSize: 18,
    color: "#333",
  },
  editIcon: {
    width: 24,
    height: 24,
    tintColor: "#70d7c7",
    marginLeft: 10,
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
