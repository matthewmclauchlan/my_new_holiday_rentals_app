// app/index.tsx
import React from "react";
import { Text, View } from "react-native";
import { ID } from "react-native-appwrite";
import { Redirect } from "expo-router";
import { useGlobalContext } from "./global-provider";

// Temporary test: generate and log IDs.
if (__DEV__) {  // __DEV__ is true in development mode in React Native.
  const testIDs: string[] = [];
  for (let i = 0; i < 10; i++) {
    testIDs.push(ID.unique());
  }
  console.log("Test Generated IDs:", testIDs);
}

export default function Main() {
  const { user, loading } = useGlobalContext();

  if (loading) return null; // Or a loading indicator
  if (!user) return <Redirect href="/sign-in" />;

  // If the user has an approved host profile, redirect to the host tabs.
  const approvalStatusHost = user.hostProfile && user.hostProfile.approvalStatus;
  return approvalStatusHost ? (
    <Redirect href="/(host)/hostTabs" />
  ) : (
    <Redirect href="/(guest)/guestTabs" />
  );
}
