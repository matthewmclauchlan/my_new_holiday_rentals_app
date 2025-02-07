// app/(host)/hostTabs/index.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useGlobalContext } from "../../global-provider";
import { getPropertiesByUser } from "@/lib/appwrite";
import icons from "@/constants/icons";

const statusFilters = ["Upcoming", "Current", "Check Out"];

const HostDashboard = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("Upcoming");

  // Determine if the user is an approved host.
  const isHost = Boolean(user?.hostProfile?.approvalStatus);

  // Fetch properties for the host if the user is approved.
  useEffect(() => {
    const fetchProperties = async () => {
      if (user?.$id && isHost) {
        try {
          const props = await getPropertiesByUser(user.$id);
          setProperties(props);
        } catch (error) {
          console.error("Error fetching properties:", error);
          setProperties([]);
        }
      } else {
        setProperties([]);
      }
      setLoadingProperties(false);
    };
    fetchProperties();
  }, [user, isHost]);

  // When tapping the Next Stay card, navigate to that property’s profile.
  const handleNextStayPress = useCallback(() => {
    if (properties.length > 0) {
      router.push(`/(host)/propertyProfile/${properties[0].$id}`);
    }
  }, [router, properties]);

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {loadingProperties ? (
        <ActivityIndicator size="large" color="#70d7c7" />
      ) : (
        <View style={styles.dashboardContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Image
                source={{ uri: user?.avatar || "https://via.placeholder.com/100" }}
                style={styles.avatar}
              />
              <View style={styles.userText}>
                <Text style={styles.greeting}>Welcome,</Text>
                <Text style={styles.userName}>{user?.name || "Host"}</Text>
              </View>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterContainer}>
            {statusFilters.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterButton,
                  selectedStatus === status && styles.activeFilterButton,
                ]}
                onPress={() => setSelectedStatus(status)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    selectedStatus === status && styles.activeFilterButtonText,
                  ]}
                >
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Next Stay Card */}
          {properties.length > 0 ? (
            <TouchableOpacity onPress={handleNextStayPress}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Next Stay</Text>
                <Text style={styles.cardText}>
                  Guest: {properties[0]?.guestName || "N/A"}
                </Text>
                <Text style={styles.cardText}>
                  Property: {properties[0]?.name || properties[0]?.propertyName || "N/A"}
                </Text>
                <Text style={styles.cardText}>
                  Check-in: {properties[0]?.checkIn || "N/A"}
                </Text>
                <Text style={styles.cardText}>
                  Check-out: {properties[0]?.checkOut || "N/A"}
                </Text>
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.outlinedButton}
                    onPress={() => router.push("/(host)/hostTabs/messages")}
                  >
                    <Text style={styles.outlinedButtonText}>Message Guest</Text>
                  </TouchableOpacity>
                  <View style={styles.statusIndicator}>
                    <Text style={styles.statusText}>
                      {properties[0]?.checkInStatus === "Late" ? "⚠️ Late" : "✔️ On Time"}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ) : (
            // Get Started view when there are no listings.
            <View style={styles.getStartedContainer}>
              <Text style={styles.getStartedTitle}>Get Started</Text>
              <Text style={styles.getStartedBody}>
                You have no property listings yet. List your first property to start hosting!
              </Text>
              <TouchableOpacity
                style={styles.listButton}
                onPress={() => router.push("../property-setup")}
              >
                <Text style={styles.listButtonText}>List Your First Property</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Button to view all listings */}
          {properties.length > 0 && (
            <TouchableOpacity
              style={styles.listingsButton}
              onPress={() => router.push("/(host)/listings")}
            >
              <Text style={styles.listingsButtonText}>View All Listings</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  dashboardContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  header: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userText: {
    marginLeft: 10,
  },
  greeting: {
    fontSize: 14,
    color: "#555",
  },
  userName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#e0e0e0",
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: "#0061FF",
  },
  filterButtonText: {
    fontSize: 16,
    color: "#333",
  },
  activeFilterButtonText: {
    color: "#fff",
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: "#0061FF",
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  outlinedButtonText: {
    fontSize: 16,
    color: "#0061FF",
  },
  statusIndicator: {
    justifyContent: "center",
    alignItems: "center",
  },
  statusText: {
    fontSize: 16,
    color: "#d32f2f",
  },
  getStartedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  getStartedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  getStartedBody: {
    fontSize: 16,
    color: "#555",
    marginBottom: 20,
    textAlign: "center",
  },
  listButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  listButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
  listingsButton: {
    backgroundColor: "#0061FF",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  listingsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HostDashboard;
