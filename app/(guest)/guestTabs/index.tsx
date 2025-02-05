// app/(root)/(tabs)/index.tsx

import React, { useState, useEffect, useCallback, memo } from "react";
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

import Search from "@/components/Search";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import { Card, FeaturedCard } from "@/components/Cards";

import { useAppwrite } from "@/lib/useAppwrite";
import { useGlobalContext } from "../../global-provider";
import { getLatestProperties, getProperties } from "@/lib/appwrite";
import { FilterOptions } from "@/lib/types";
import { Models } from "react-native-appwrite";

import { useDebounce } from "@/hooks/useDebounce";

const Home = () => {
  const { user } = useGlobalContext();
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();

  // State to manage filters
  const [filters, setFilters] = useState<FilterOptions>({
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

  // Debounce the filters to prevent rapid state updates
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch latest properties (featured)
  const { data: latestProperties, loading: latestPropertiesLoading } =
    useAppwrite<Models.Document[] | null, Record<string, string | number>>({
      fn: getLatestProperties,
      params: {}, 
      skip: false,
    });

  // Fetch properties based on debounced filters
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
    skip: true, // We will trigger fetching manually
  });

  // Only refetch if debouncedFilters **actually change**
  useEffect(() => {
    if (debouncedFilters) {
      console.log("🔍 Refetching with Filters:", debouncedFilters);
      refetch({
        filter: JSON.stringify(debouncedFilters),
        query: params.query || "",
        limit: 6,
      });
    }
  }, [debouncedFilters, params.query]);

  // Handler for when filters change
  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters((prevFilters) => {
      if (JSON.stringify(prevFilters) !== JSON.stringify(newFilters)) {
        return newFilters; // Only update if the filters actually changed
      }
      return prevFilters;
    });
  }, []);

  const handleCardPress = useCallback((id: string) => {
    router.push(`/properties/${id}`);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
  data={properties || []} // Ensure 'properties' is an array
  renderItem={({ item }) => (
    <Card item={item} onPress={() => handleCardPress(item.$id)} />
  )}
  keyExtractor={(item) => item.$id}
  ListHeaderComponent={
    <>
      {/* User Greeting and Bell Icon */}
      <View style={styles.userSection}>
        <View style={styles.userInfo}>
          <Image
            source={{ uri: user?.avatar || "https://via.placeholder.com/100" }}
            style={styles.userAvatar}
          />
          <View style={styles.userText}>
            <Text style={styles.greetingText}>Good Morning</Text>
            <Text style={styles.userNameText}>{user?.name || "Guest"}</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Image source={icons.bell} style={styles.bellIcon} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <Search />

      {/* Featured Section */}
      <View style={styles.featuredSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See all</Text>
          </TouchableOpacity>
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
          <NoResults message="No featured properties available." />
        )}
      </View>

      {/* Filters */}
      <Filters onFilterChange={handleFilterChange} />
    </>
  }
  ListEmptyComponent={loading ? null : <NoResults message="No properties match your filters." />}
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
  userSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 20,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    resizeMode: "cover",
  },
  userText: {
    marginLeft: 10,
  },
  greetingText: {
    fontSize: 14,
    color: "#555",
  },
  userNameText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  bellIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  featuredSection: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
  },
  seeAllText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#70d7c7",
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
});

export default Home;
