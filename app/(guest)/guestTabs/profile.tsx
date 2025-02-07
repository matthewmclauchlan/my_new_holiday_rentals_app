// app/(guest)/guestTabs/profile.tsx

import React, { useEffect, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Button,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { logout, getPropertiesByUser, getHostProfileByUserId } from "@/lib/appwrite";
import { useGlobalContext } from "../../global-provider";
import icons from "@/constants/icons";

const Profile = () => {
  const { user, refetch } = useGlobalContext();
  const router = useRouter();
  const [propertyCount, setPropertyCount] = useState<number | null>(null);
  // Local state to store the normalized approval status
  const [normalizedStatus, setNormalizedStatus] = useState<string>("");
  const [loadingHostProfile, setLoadingHostProfile] = useState<boolean>(true);

  // Log the user object whenever it changes.
  useEffect(() => {
    console.log("User object:", user);
    if (user && user.hostProfile) {
      console.log("Host profile from user:", user.hostProfile);
    }
  }, [user]);

  // Refetch host profile from Appwrite on mount (or when user changes) to get the latest status.
  useEffect(() => {
    const fetchHostProfile = async () => {
      if (user && user.$id) {
        try {
          const profile = await getHostProfileByUserId(user.$id);
          console.log("Fetched host profile:", profile);
          if (profile && profile.approvalStatus) {
            const norm = profile.approvalStatus.toString().toLowerCase();
            console.log("Normalized approvalStatus:", norm);
            setNormalizedStatus(norm);
          } else {
            setNormalizedStatus("");
          }
        } catch (error) {
          console.error("Error fetching host profile:", error);
          setNormalizedStatus("");
        } finally {
          setLoadingHostProfile(false);
        }
      } else {
        setLoadingHostProfile(false);
      }
    };

    fetchHostProfile();
  }, [user, refetch]);

  // Fetch property count if a host profile exists.
  useEffect(() => {
    const fetchProperties = async () => {
      if (user && user.$id && user.hostProfile) {
        try {
          const properties = await getPropertiesByUser(user.$id);
          setPropertyCount(properties.length);
          console.log("Fetched property count:", properties.length);
        } catch (error) {
          console.error("Error fetching properties:", error);
          setPropertyCount(0);
        }
      } else {
        setPropertyCount(0);
      }
    };
    fetchProperties();
  }, [user]);

  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      Alert.alert("Success", "Logged out successfully");
      refetch();
    } else {
      Alert.alert("Error", "Failed to logout");
    }
  };

  // Determine the host action button text based on host profile status.
  let hostActionTitle = "";
  if (!user?.hostProfile) {
    hostActionTitle = "Become a Host";
  } else if (normalizedStatus === "approved") {
    hostActionTitle = "Go to Host Dashboard";
  } else {
    hostActionTitle = "View Application Status";
  }

  const handleHostAction = () => {
    console.log("handleHostAction called");
    if (!user?.hostProfile) {
      console.log("No host profile exists. Routing to host signup.");
      router.push("/(guest)/host-signup");
    } else if (normalizedStatus === "approved") {
      console.log("Host approved. Routing to host dashboard.");
      router.push("/(host)/hostTabs");
    } else {
      console.log("Host exists but not approved. Routing to application processing.");
      router.push("/(guest)/applicationProcessing");
    }
  };

  // If user data is not available, redirect to sign in.
  if (!user) {
    return <Redirect href="/sign-in" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: "bold" }}>Profile</Text>
          <Image source={icons.bell} style={{ width: 24, height: 24 }} />
        </View>

        {/* User Info */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 20 }}>
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Image
              source={{ uri: user?.avatar }}
              style={{ width: 100, height: 100, borderRadius: 50 }}
            />
            <TouchableOpacity style={{ position: "absolute", bottom: 10, right: 10 }}>
              <Image source={icons.edit} style={{ width: 24, height: 24 }} />
            </TouchableOpacity>
            <Text style={{ fontSize: 22, fontWeight: "bold", marginTop: 10 }}>{user?.name}</Text>
            <Text style={{ fontSize: 16, color: "#555", marginTop: 5 }}>{user?.email}</Text>
          </View>
        </View>

        {/* Other Settings */}
        <View style={{ marginTop: 20 }}>
          <Button title="Payments" onPress={() => router.push("/(guest)/payments")} color="#70d7c7" />
        </View>

        {/* Host Action Section */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 }}>
          {loadingHostProfile ? (
            <ActivityIndicator color="#70d7c7" />
          ) : (
            <Button title={hostActionTitle} onPress={handleHostAction} color="#70d7c7" />
          )}
        </View>

        {/* Logout Section */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 }}>
          <Button title="Logout" color="red" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
