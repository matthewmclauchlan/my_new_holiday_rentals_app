// app/(host)/properties/[id].tsx

import React, { useEffect, useState } from "react";
import { 
  SafeAreaView, 
  ScrollView, 
  Text, 
  View, 
  Button, 
  Alert, 
  StyleSheet 
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getPropertyById } from "@/lib/appwrite"; // Ensure getPropertyById is exported from your Appwrite lib
import { useGlobalContext } from "@/app/global-provider"; // Adjust path as needed

const HostPropertyDetail = () => {
  // Retrieve the dynamic property id from the route parameters.
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useGlobalContext();
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

  // Instead of editing inline, we navigate to a dedicated edit page.
  const handleEdit = () => {
    // Navigate to the host-specific edit page. The property ID is passed as a query parameter.
    router.push(`/(host)/propertyProfile/editProperty?id=${id}`);
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
        <Text style={styles.title}>{property.name}</Text>
        <Text style={styles.detail}>{property.description}</Text>
        {/* Add additional property details as needed */}
        <View style={styles.buttonRow}>
          <Button title="Edit Property" onPress={handleEdit} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 20 
  },
  content: { 
    paddingBottom: 32 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 20 
  },
  detail: { 
    fontSize: 16, 
    marginBottom: 20 
  },
  buttonRow: { 
    flexDirection: "row", 
    justifyContent: "space-between" 
  },
});

export default HostPropertyDetail;
