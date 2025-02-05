// app/(host)/addProperty.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ManageProperty() {
  return (
    <View style={styles.container}>
      <Text>Add Property Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
