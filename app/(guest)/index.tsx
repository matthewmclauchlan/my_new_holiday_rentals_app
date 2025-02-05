// app/(guest)/index.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function GuestHome() {
  return (
    <View style={styles.container}>
      <Text>Welcome to the Guest Home Screen!</Text>
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
