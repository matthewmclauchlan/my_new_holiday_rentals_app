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
  ImageSourcePropType,
} from "react-native";
import { useRouter, Redirect } from "expo-router";
import { logout, getPropertiesByUser } from "@/lib/appwrite";
import { useGlobalContext } from "../../global-provider";
import icons from "@/constants/icons";

const Profile = () => {
  const { user, refetch } = useGlobalContext();
  const router = useRouter();
  // propertyCount is initialized to null (data not loaded yet)
  const [propertyCount, setPropertyCount] = useState<number | null>(null);

  // Fetch properties for the current user (if they are an approved host)
  useEffect(() => {
    const fetchProperties = async () => {
      if (user && user.$id && user.hostProfile && user.hostProfile.isApproved) {
        try {
          const properties = await getPropertiesByUser(user.$id);
          setPropertyCount(properties.length);
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

  // Determine if the user is an approved host
  const isHost = Boolean(user && user.hostProfile && user.hostProfile.isApproved);

  const handleHostAction = () => {
    if (!isHost) {
      // For non-hosts, redirect to the host sign-up wizard.
      router.push("/(guest)/host-signup");
    } else {
      if (propertyCount === null) {
        Alert.alert("Please wait", "Loading your property data...");
      } else if (propertyCount > 0) {
        // If properties exist, go to the new host dashboard screen.
        router.push("/(host)/hostTabs");
      } else {
        // Otherwise, go to property setup.
        router.push("/(host)/hostTabs/property-setup");
      }
    }
  };

  // If user data is not available, you can optionally return a loading indicator.
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
          <Button
            title="Payments"
            onPress={() => router.push("/(guest)/payments")}
            color="#70d7c7"
          />

        </View>

        {/* Host Action Section */}
        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 10 }}>
          {isHost && propertyCount === null ? (
            <ActivityIndicator color="#70d7c7" />
          ) : (
            <Button
              title={
                !isHost
                  ? "Become a Host"
                  : propertyCount && propertyCount > 0
                  ? "Go to Host Dashboard"
                  : "List a Property"
              }
              onPress={handleHostAction}
              color="#70d7c7"
            />
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
