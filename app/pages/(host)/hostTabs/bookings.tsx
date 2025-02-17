// app/(host)/hostTabs/bookings.tsx
import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useGlobalContext } from "../../global-provider";
import { getBookingsByHost } from "../../../../lib/appwrite"; // Ensure this function is correctly implemented.
import { Models } from "react-native-appwrite";
import { parse } from "date-fns";

const Bookings = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [bookings, setBookings] = useState<Models.Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      if (user?.$id) {
        try {
          const data = await getBookingsByHost(user.$id);
          console.log("Fetched bookings:", data);
          setBookings(data);
        } catch (error) {
          console.error("Error fetching bookings:", error);
          setBookings([]);
        }
      } else {
        setBookings([]);
      }
      setLoading(false);
    };

    fetchBookings();
  }, [user]);

  const renderBookingItem = ({ item }: { item: Models.Document }) => {
    let checkInDate: Date | null = null;
    try {
      // Parse startDate using date-fns.
      checkInDate = parse(item.startDate, "dd/MM/yyyy HH:mm:ss.SSS", new Date());
    } catch (error) {
      console.error("Error parsing startDate for booking", item.$id, error);
    }

    return (
      <TouchableOpacity
        onPress={() =>
          router.push(`/(host)/propertyProfile/${item.propertyId}?view=host`)
        }
      >
        <View style={styles.bookingItem}>
          <Text style={styles.bookingTitle}>Guest: {item.guestName}</Text>
          <Text style={styles.bookingDetail}>
            Property: {item.propertyName || item.name || "N/A"}
          </Text>
          <Text style={styles.bookingDetail}>
            Check-in: {item.startDate || "N/A"}
          </Text>
          <Text style={styles.bookingDetail}>
            Check-out: {item.checkOut || "N/A"}
          </Text>
          {checkInDate && (
            <Text style={styles.bookingDetail}>
              Parsed Date: {checkInDate.toLocaleDateString()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Please log in to view your bookings.</Text>
        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Bookings</Text>
      {loading ? (
        <ActivityIndicator size="large" color="#70d7c7" />
      ) : bookings.length === 0 ? (
        <Text style={styles.noBookingsText}>No bookings available.</Text>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.$id}
          renderItem={renderBookingItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 20,
    textAlign: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  bookingItem: {
    padding: 15,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    marginBottom: 15,
  },
  bookingTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#333",
  },
  bookingDetail: {
    fontSize: 16,
    color: "#555",
    marginBottom: 3,
  },
  noBookingsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 20,
  },
  loginButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  loginButtonText: {
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Bookings;
