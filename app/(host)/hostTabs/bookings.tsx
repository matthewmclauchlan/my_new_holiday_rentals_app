// app/(host)hostTabs/bookings.tsx

import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Bookings = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bookings</Text>
      {/* Implement bookings management features here */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
});

export default Bookings;
