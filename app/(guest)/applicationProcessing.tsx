// app/(guest)/applicationProcessing.tsx

import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { getHostProfileByUserId } from "../../lib/appwrite";
import { useGlobalContext } from "../global-provider";

type ApprovalStatus = "pending" | "approved" | "rejected";

export default function ApplicationProcessing() {
  const router = useRouter();
  const { user } = useGlobalContext();
  const [status, setStatus] = useState<ApprovalStatus | null>(null);
  const [decisionDate, setDecisionDate] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user || !user.$id) return;
    
    console.log("Fetching host profile for user:", user.$id);
    getHostProfileByUserId(user.$id)
      .then(profile => {
        console.log("Fetched host profile:", profile);
        if (profile) {
          // Normalize approval status to lowercase for consistency.
          const normalizedStatus = profile.approvalStatus?.toString().toLowerCase() || "";
          console.log("Normalized approvalStatus:", normalizedStatus);
          setStatus(normalizedStatus as ApprovalStatus);
          setDecisionDate(profile.decisionDate || profile.approvedAt || null);
        } else {
          console.log("No host profile found.");
          setStatus(null);
        }
      })
      .catch(err => {
        console.error("Error fetching host profile:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  // Automatically redirect if approved.
  useEffect(() => {
    if (!loading && status === "approved") {
      console.log("Status approved, auto-redirecting to host dashboard.");
      router.replace("/(host)/hostTabs");
    }
  }, [loading, status, router]);

  const handleReturn = () => {
    // For pending or rejected, route back to the guest dashboard.
    console.log("Return button pressed. Routing to guest dashboard.");
    router.push("/(guest)/guestTabs");
  };

  const handleContactPress = () => {
    Linking.openURL("mailto:contact@example.com");
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#70d7c7" />
        <Text style={styles.body}>Checking your application status...</Text>
      </SafeAreaView>
    );
  }

  let statusMessage = "";
  if (status === "pending") {
    statusMessage =
      "Your host application is currently under review. Please allow up to 48 hours for processing.";
  } else if (status === "approved") {
    statusMessage = `Congratulations! Your host application was approved${decisionDate ? " on " + new Date(decisionDate).toLocaleDateString() : ""}.`;
  } else if (status === "rejected") {
    statusMessage = `We regret to inform you that your host application was rejected${decisionDate ? " on " + new Date(decisionDate).toLocaleDateString() : ""}. Please contact support for further information.`;
  } else {
    statusMessage = "Unable to determine your application status at this time.";
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Application Status</Text>
        <Text style={styles.body}>{statusMessage}</Text>
        <Text style={styles.body}>
          If you have any questions, please contact us at{" "}
          <Text style={styles.email} onPress={handleContactPress}>
            contact@example.com
          </Text>.
        </Text>
        {/* Only show the Return button if the status is not approved */}
        {(status === "pending" || status === "rejected") && (
          <Pressable style={styles.returnButton} onPress={handleReturn}>
            <Text style={styles.returnButtonText}>Return to Dashboard</Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  email: {
    color: "blue",
    textDecorationLine: "underline",
  },
  returnButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  returnButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
