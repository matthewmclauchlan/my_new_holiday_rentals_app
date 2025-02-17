// app/(root)/(tabs)/index.tsx
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

import icons from "../../../../constants/icons";
import Filters from "../../../../components/Filters";
import NoResults from "../../../../components/NoResults";
import { Card } from "../../../../components/Cards";

import { useAppwrite } from "../../../../lib/useAppwrite";
import { useGlobalContext } from "../../../global-provider";
import { getProperties } from "../../../../lib/appwrite";
import { FilterOptions } from "../../../../lib/types";
import { Models } from "react-native-appwrite";
import { useDebounce } from "../../../../hooks/useDebounce";

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

  // Debounce filters to avoid too frequent refetches.
  const debouncedFilters = useDebounce(filters, 300);

  // Fetch properties based on debounced filters.
  const {
    data: properties,
    refetch,
    loading,
  } = useAppwrite<Models.Document[] | null, { filter: string; query: string; limit: number }>(
    {
      fn: getProperties,
      params: {
        filter: JSON.stringify(debouncedFilters),
        query: params.query || "",
        limit: 6,
      },
      skip: false,
    }
  );

  // Refetch when filters or query change.
  useEffect(() => {
    if (debouncedFilters) {
      console.log("Refetching with Filters:", debouncedFilters);
      refetch({
        filter: JSON.stringify(debouncedFilters),
        query: params.query || "",
        limit: 6,
      });
    }
  }, [debouncedFilters, params.query]);

  // Handler for when filters change.
  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
  }, []);

  // When a property card is pressed, navigate to the guest property detail page.
  const handleCardPress = useCallback((id: string) => {
    router.push(`/properties/${id}?view=guest`);
  }, [router]);

  // Render the header containing the custom search bar and filters.
  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Custom Search Bar Button */}
      <TouchableOpacity
        style={styles.searchBar}
        onPress={() => router.push("/search")}
      >
        <Text style={styles.searchBarText}>Start your search</Text>
        <View style={styles.searchIconContainer}>
          <Image source={require("../../../assets/icons/search.png")} style={styles.searchIcon} />
        </View>
      </TouchableOpacity>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <Filters onFilterChange={handleFilterChange} />
      </View>

      {/* A small spacer to push the first card down a bit */}
      <View style={styles.headerSpacer} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={properties || []}
        renderItem={({ item }) => (
          <Card item={item} onPress={() => handleCardPress(item.$id)} />
        )}
        keyExtractor={(item) => item.$id}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={[0]} // Makes the header stationary.
        ListEmptyComponent={
          loading ? null : <NoResults message="No properties match your filters." />
        }
        contentContainerStyle={styles.flatListContent}
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
    backgroundColor: "#fff",
  },
  headerContainer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingTop: 5, // Reduced top padding
    paddingBottom: 5, // Reduced bottom padding
  },
  searchBar: {
    marginTop: 0, // Reduced margin
    backgroundColor: "#f2f2f2",
    borderRadius: 25,
    paddingVertical: 10, // Reduced vertical padding
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    color: "#888",
  },
  searchIconContainer: {
    position: "absolute",
    right: 20,
  },
  searchIcon: {
    width: 20,
    height: 20,
    tintColor: "#70d7c7",
  },
  filtersContainer: {
    paddingVertical: 10, // Reduced vertical padding for the filter section
  },
  headerSpacer: {
    height: 10, // Spacer to push the first card down a bit
  },
});

export default Home;
