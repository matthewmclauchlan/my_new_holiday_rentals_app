// app/index.tsx
import React from "react";
import { Redirect } from "expo-router";
import { useGlobalContext } from "./global-provider";

export default function Main() {
  const { user, loading } = useGlobalContext();

  if (loading) return null; // Or a loading indicator
  if (!user) return <Redirect href="/sign-in" />;

  // If the user has an approved host profile, redirect to the host tabs.
  const isApprovedHost = user.hostProfile && user.hostProfile.isApproved;
  return isApprovedHost ? (
    <Redirect href="/(host)/hostTabs" />
  ) : (
    <Redirect href="/(guest)/guestTabs" />
  );
}

