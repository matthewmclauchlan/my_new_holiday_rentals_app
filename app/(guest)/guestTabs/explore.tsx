// app/(root)/(tabs)/explore.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import Search from "@/components/Search";
import Filters from "@/components/Filters";
import NoResults from "@/components/NoResults";
import { Card } from "@/components/Cards";

import { useAppwrite } from "@/lib/useAppwrite";
import { getProperties } from "@/lib/appwrite";
import { FilterOptions } from "@/lib/types";
import { Models } from "react-native-appwrite";

import { useDebounce } from "@/hooks/useDebounce";

const Explore = () => {
  const params = useLocalSearchParams<{ query?: string; filter?: string }>();

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <Search />
      <Filters onFilterChange={handleFilterChange} />

      <FlatList
  data={properties || []}
  renderItem={({ item }) => <Card item={item} />}
  keyExtractor={(item) => item.$id}
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
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
});

export default Explore;
