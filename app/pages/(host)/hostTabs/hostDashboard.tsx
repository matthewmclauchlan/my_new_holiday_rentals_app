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
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useGlobalContext } from "../../../global-provider";
import { getPropertiesByUser } from "../../../../lib/appwrite";
import icons from "../../../../constants/icons";
import { parse } from "date-fns";

const statusFilters = ["Upcoming", "Current", "Check Out"];

const HostDashboard = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [properties, setProperties] = useState<any[]>([]);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("Upcoming");

  // If no user is logged in, show a login prompt.
  if (!user) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Please log in to view your dashboard.</Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push("/login")}
          >
            <Text style={styles.loginButtonText}>Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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

  // --- BOOKING AGGREGATION LOGIC ---

  // Filter properties that have booking info (i.e. guestName and startDate defined)
  const bookingProperties = properties.filter(
    (prop) => prop.guestName && prop.startDate
  );

  // Map each property to include a parsed checkInDate.
  const bookings = bookingProperties
    .map((prop) => {
      let checkInDate;
      try {
        // Parse startDate. Ensure the format exactly matches your stored date format.
        // For example, if the date string is "28/02/2025 00:35:10.881", use the format below:
        checkInDate = parse(prop.startDate, "dd/MM/yyyy HH:mm:ss.SSS", new Date());
      } catch (error) {
        console.error("Error parsing startDate for property", prop.$id, error);
      }
      return { ...prop, checkInDate };
    })
    .filter((b) => b.checkInDate && !isNaN(b.checkInDate.getTime()));

  // Filter for upcoming bookings (checkInDate in the future)
  const now = new Date();
  const upcomingBookings = bookings.filter((b) => b.checkInDate >= now);

  // Sort upcoming bookings by checkInDate (ascending)
  upcomingBookings.sort((a, b) => a.checkInDate.getTime() - b.checkInDate.getTime());

  // Group bookings that occur on the same day
  const groupBookingsByDate = (bookingsArray: any[]) => {
    const groups: { [key: string]: any[] } = {};
    bookingsArray.forEach((booking) => {
      const d = booking.checkInDate;
      // Use year-month-day as the key
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(booking);
    });
    return groups;
  };

  const bookingGroups = groupBookingsByDate(upcomingBookings);
  const groupKeys = Object.keys(bookingGroups);
  groupKeys.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  // Select the earliest group of bookings as the next stay
  const nextStayBookings = groupKeys.length > 0 ? bookingGroups[groupKeys[0]] : [];

  // When tapping the Next Stay card (or booking item), navigate to that property's profile.
  const handleNextStayPress = useCallback(() => {
    if (nextStayBookings.length > 0) {
      router.push(`/(host)/propertyProfile/${nextStayBookings[0].$id}`);
    }
  }, [router, nextStayBookings]);

  // Render the Next Stay section.
  const renderNextStay = () => {
    if (nextStayBookings.length === 0) {
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Stay</Text>
          <Image
            source={{ uri: "https://via.placeholder.com/300x200?text=No+Bookings" }}
            style={styles.placeholderImage}
            resizeMode="cover"
          />
          <Text style={styles.cardText}>No Bookings</Text>
        </View>
      );
    } else if (nextStayBookings.length === 1) {
      const booking = nextStayBookings[0];
      return (
        <TouchableOpacity onPress={handleNextStayPress}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Next Stay</Text>
            <Text style={styles.cardText}>Guest: {booking.guestName}</Text>
            <Text style={styles.cardText}>
              Property: {booking.name || booking.propertyName || "N/A"}
            </Text>
            <Text style={styles.cardText}>
              Check-in: {booking.startDate || "N/A"}
            </Text>
            <Text style={styles.cardText}>
              Check-out: {booking.checkOut || "N/A"}
            </Text>
            <View style={styles.cardFooter}>
              <TouchableOpacity
                style={styles.outlinedButton}
                onPress={() => router.push("/(host)/messages")}
              >
                <Text style={styles.outlinedButtonText}>Message Guest</Text>
              </TouchableOpacity>
              <View style={styles.statusIndicator}>
                <Text style={styles.statusText}>
                  {booking.checkInStatus === "Late" ? "⚠️ Late" : "✔️ On Time"}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    } else {
      // Render multiple bookings on the same day in a list.
      return (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Stay</Text>
          <FlatList
            data={nextStayBookings}
            keyExtractor={(item) => item.$id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(host)/propertyProfile/${item.$id}`)
                }
              >
                <View style={styles.bookingItem}>
                  <Text style={styles.cardText}>Guest: {item.guestName}</Text>
                  <Text style={styles.cardText}>
                    Property: {item.name || item.propertyName || "N/A"}
                  </Text>
                  <Text style={styles.cardText}>
                    Check-in: {item.startDate || "N/A"}
                  </Text>
                  <Text style={styles.cardText}>
                    Check-out: {item.checkOut || "N/A"}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            showsVerticalScrollIndicator={false}
          />
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.outlinedButton}
              onPress={() => router.push("/(host)/messages")}
            >
              <Text style={styles.outlinedButtonText}>Message Guest</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }
  };

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
                source={{
                  uri: user?.avatar || "https://via.placeholder.com/100",
                }}
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
          {renderNextStay()}

          {/* Button to view all bookings */}
          {properties.length > 0 && (
            <TouchableOpacity
              style={styles.listingsButton}
              onPress={() => router.push("/(host)/bookings")}
            >
              <Text style={styles.listingsButtonText}>View All Bookings</Text>
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
  placeholderImage: {
    width: "100%",
    height: 150,
    marginBottom: 10,
    borderRadius: 10,
  },
  bookingItem: {
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 10,
  },
  // Login styles
  loginContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  loginText: {
    fontSize: 18,
    marginBottom: 20,
    color: "#333",
  },
  loginButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loginButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default HostDashboard;
