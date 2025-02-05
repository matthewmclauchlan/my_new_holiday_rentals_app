

import React from "react";
import { View, Text, StyleSheet } from "react-native";

const Payments = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Payments</Text>
      {/* Implement payments management features here */}
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

export default Payments;
