import React, { useState } from "react";
import { SafeAreaView, View, Text, TextInput, StyleSheet } from "react-native";

const SearchPage = () => {
  const [searchText, setSearchText] = useState("");

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Search</Text>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Start your search"
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          Search results will appear here.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
  },
  searchContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  searchInput: {
    fontSize: 16,
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultsText: {
    fontSize: 16,
    color: "#666",
  },
});

export default SearchPage;
