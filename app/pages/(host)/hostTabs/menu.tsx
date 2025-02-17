// app/(host)/hostTabs/menu.tsx
import React from "react";
import {
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Button,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { logout } from "../../../../lib/appwrite";
import { useGlobalContext } from "../../../global-provider";
import icons from "../../../../constants/icons";

const Menu= () => {
  const { user, refetch } = useGlobalContext();
  const router = useRouter();

  const handleLogout = async () => {
    const result = await logout();
    if (result) {
      Alert.alert("Success", "Logged out successfully");
      refetch();
    } else {
      Alert.alert("Error", "Failed to logout");
    }
  };

  // For an approved host, show "Go to Guest Dashboard"
  const handleHostAction = () => {
    // In this screen, we assume the user is a host.
    router.push("/(guest)/guestTabs");
  };

  if (!user) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.headerText}>Host Profile</Text>
          <Image source={icons.bell} style={styles.bellIcon} />
        </View>

        <View style={styles.profileContainer}>
          <Image source={{ uri: user?.avatar }} style={styles.avatar} />
          <TouchableOpacity style={styles.editButton}>
            <Image source={icons.edit} style={styles.editIcon} />
          </TouchableOpacity>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>

        {/* Host Action Section */}
        <View style={styles.actionSection}>
          <Button
            title="Manage Properties"
            onPress={() => router.push("/(host)/hostTabs/manage-properties")}
            color="#70d7c7"
          />
          <Button
            title="View Bookings"
            onPress={() => router.push("/(host)/hostTabs/bookings")}
            color="#70d7c7"
          />
          <Button
            title="Go to Guest Dashboard"
            onPress={handleHostAction}
            color="#70d7c7"
          />
        </View>

        <View style={styles.logoutSection}>
          <Button title="Logout" color="red" onPress={handleLogout} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { paddingBottom: 32, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
  },
  headerText: { fontSize: 20, fontWeight: "bold" },
  bellIcon: { width: 24, height: 24 },
  profileContainer: { alignItems: "center", marginTop: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  editButton: { position: "absolute", bottom: 10, right: 10 },
  editIcon: { width: 24, height: 24 },
  name: { fontSize: 22, fontWeight: "bold", marginTop: 10 },
  email: { fontSize: 16, color: "#555", marginTop: 5 },
  actionSection: { marginTop: 20 },
  logoutSection: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
});

export default Menu;
