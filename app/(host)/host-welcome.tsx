import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import icons from "@/constants/icons";
import { Card, FeaturedCard } from "@/components/Cards";
import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "../global-provider";
import { getLatestProperties, getProperties } from "@/lib/appwrite";
import { FilterOptions } from "@/lib/types";
import { Models } from "react-native-appwrite";
import { useDebounce } from "@/hooks/useDebounce";

const HostDashboard = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ query?: string }>();

  // For host dashboard we might show a welcome message plus recent property listings
  const [filters] = useState<FilterOptions>({
    category: "All",
    location: "",
    priceMin: 0,
    priceMax: 10000,
    bedrooms: 0,
    bathrooms: 0,
    amenities: [],
    guestCount: 1,
    startDate: null,
    endDate: null,
  });

  // If you need to debounce filters (e.g. if you allow filtering in your dashboard)
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch featured properties (for example, properties the host has listed)
  const { data: latestProperties, loading: latestPropertiesLoading } =
    useAppwrite<Models.Document[] | null, Record<string, string | number>>({
      fn: getLatestProperties,
      params: {},
      skip: false,
    });

  // Optionally fetch properties with filters (you might use a user‑specific API here)
  const {
    data: properties,
    refetch,
    loading,
  } = useAppwrite<Models.Document[] | null, { filter: string; query: string; limit: number }>({
    fn: getProperties,
    params: {
      filter: JSON.stringify(debouncedFilters),
      query: params.query || "",
      limit: 6,
    },
    skip: true,
  });

  // Example: Trigger a refetch when debounced filters change (if filtering is needed)
  useEffect(() => {
    refetch({
      filter: JSON.stringify(debouncedFilters),
      query: params.query || "",
      limit: 6,
    });
  }, [debouncedFilters, params.query]);

  const handleCardPress = useCallback((id: string) => {
    router.push(`/properties/${id}`);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={properties || []}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item.$id)} />
        )}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={
          <>
            {/* Host Greeting */}
            <View style={styles.header}>
              <View style={styles.userInfo}>
                <Image
                  source={{ uri: user?.avatar || "https://via.placeholder.com/100" }}
                  style={styles.avatar}
                />
                <View style={styles.userText}>
                  <Text style={styles.greeting}>Welcome,</Text>
                  <Text style={styles.userName}>{user?.name || "Host"}</Text>
                </View>
              </View>
            </View>

            {/* Featured Section */}
            <View style={styles.featuredSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Listings</Text>
              </View>
              {latestPropertiesLoading ? (
                <ActivityIndicator size="large" color="#70d7c7" style={styles.loader} />
              ) : latestProperties && latestProperties.length > 0 ? (
                <FlatList
                  data={latestProperties}
                  renderItem={({ item }) => (
                    <FeaturedCard item={item} onPress={() => handleCardPress(item.$id)} />
                  )}
                  keyExtractor={(item) => item.$id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.featuredList}
                />
              ) : (
                <Text style={styles.noResults}>No listings yet.</Text>
              )}
            </View>
          </>
        }
        ListEmptyComponent={loading ? null : <Text style={styles.noResults}>No properties available.</Text>}
        contentContainerStyle={styles.flatListContent}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  flatListContent: {
    paddingBottom: 32,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userText: {
    marginLeft: 10,
  },
  greeting: {
    fontSize: 14,
    color: "#555",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  featuredSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  loader: {
    marginTop: 20,
  },
  featuredList: {
    marginTop: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
  noResults: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
  },
});

export default HostDashboard
