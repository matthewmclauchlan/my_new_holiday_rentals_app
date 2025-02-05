// app/(host)/hostTabs/messages.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function Messages() {
  return (
    <View style={styles.container}>
      <Text>Messages Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
});
