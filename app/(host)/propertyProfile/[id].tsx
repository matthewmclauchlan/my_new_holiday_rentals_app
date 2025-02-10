// app/(host)/properties/[id].tsx
import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Button,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  getPropertyById,
  getPriceRulesForProperty,
  updatePriceRulesForProperty,
} from "@/lib/appwrite"; // Make sure these functions are implemented & exported.
import { useGlobalContext } from "@/app/global-provider";
import { Modalize } from "react-native-modalize";

// Define (or import) types for pricing rules if available.
interface PriceRules {
  basePricePerNight: number;
  basePricePerNightWeekend: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  petFee?: number;
}

interface PriceRulesUpdate {
  basePricePerNight: number;
  basePricePerNightWeekend: number;
  weeklyDiscount?: number;
  monthlyDiscount?: number;
  cleaningFee?: number;
  petFee?: number;
}

const HostPropertyDetail = () => {
  // Retrieve the dynamic property id from the route parameters.
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useGlobalContext();
  const [property, setProperty] = useState<any>(null);
  const [pricingRules, setPricingRules] = useState<PriceRules | null>(null);
  const [loading, setLoading] = useState(true);

  // Reference to control the Modalize bottom sheet.
  const modalizeRef = useRef<Modalize>(null);

  // Local state to hold pricing details (as strings for form input).
  const [pricingDetails, setPricingDetails] = useState({
    basePricePerNight: "",
    basePricePerNightWeekend: "",
    weeklyDiscount: "",
    monthlyDiscount: "",
    cleaningFee: "",
    petFee: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch the property details.
        const propertyData = await getPropertyById(id);
        setProperty(propertyData);

        // Fetch the pricing rules from the priceRules collection.
        const pricingData = await getPriceRulesForProperty(id);
        setPricingRules(pricingData);

        // Pre-populate form values if pricing data exists.
        if (pricingData) {
          setPricingDetails({
            basePricePerNight: pricingData.basePricePerNight?.toString() || "",
            basePricePerNightWeekend:
              pricingData.basePricePerNightWeekend?.toString() || "",
            weeklyDiscount: pricingData.weeklyDiscount?.toString() || "",
            monthlyDiscount: pricingData.monthlyDiscount?.toString() || "",
            cleaningFee: pricingData.cleaningFee?.toString() || "",
            petFee: pricingData.petFee?.toString() || "",
          });
        }
      } catch (error) {
        console.error("Error fetching property or pricing rules:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Navigate to a dedicated edit page for other property details.
  const handleEdit = () => {
    router.push(`/(host)/propertyProfile/editProperty?id=${id}`);
  };

  // Called when saving pricing rule updates.
  const savePricingDetails = async () => {
    // Convert string inputs to numbers.
    const updatedPricing: PriceRulesUpdate = {
      basePricePerNight: parseFloat(pricingDetails.basePricePerNight) || 0,
      basePricePerNightWeekend:
        parseFloat(pricingDetails.basePricePerNightWeekend) || 0,
      weeklyDiscount: parseFloat(pricingDetails.weeklyDiscount) || 0,
      monthlyDiscount: parseFloat(pricingDetails.monthlyDiscount) || 0,
      cleaningFee: parseFloat(pricingDetails.cleaningFee) || 0,
      petFee: parseFloat(pricingDetails.petFee) || 0,
    };

    try {
      // Call your API to update the pricing rules for the property.
      const updatedRules = await updatePriceRulesForProperty(id, updatedPricing);
      setPricingRules(updatedRules);
      Alert.alert("Success", "Pricing details updated successfully");
      modalizeRef.current?.close();
    } catch (error) {
      console.error("Error updating pricing details:", error);
      Alert.alert("Error", "Failed to update pricing details");
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Loading property...</Text>
      </SafeAreaView>
    );
  }

  if (!property) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Property not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{property.name}</Text>
        <Text style={styles.detail}>{property.description}</Text>

        {/* Pricing Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pricing</Text>
          {pricingRules ? (
            <View style={styles.pricingInfo}>
              <Text>
                Base Price Per Night: {pricingRules.basePricePerNight} {property.currency || "EUR"}
              </Text>
              <Text>
                Base Price (Weekend): {pricingRules.basePricePerNightWeekend} {property.currency || "EUR"}
              </Text>
              {pricingRules.weeklyDiscount !== undefined && (
                <Text>Weekly Discount: {pricingRules.weeklyDiscount}%</Text>
              )}
              {pricingRules.monthlyDiscount !== undefined && (
                <Text>Monthly Discount: {pricingRules.monthlyDiscount}%</Text>
              )}
              {pricingRules.cleaningFee !== undefined && (
                <Text>
                  Cleaning Fee: {pricingRules.cleaningFee} {property.currency || "EUR"}
                </Text>
              )}
              {pricingRules.petFee !== undefined && (
                <Text>
                  Pet Fee: {pricingRules.petFee} {property.currency || "EUR"}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noPricingText}>Set your prices</Text>
          )}
          <TouchableOpacity
            style={styles.editPricingButton}
            onPress={() => modalizeRef.current?.open()}
          >
            <Text style={styles.editPricingButtonText}>Edit Pricing</Text>
          </TouchableOpacity>
        </View>

        {/* Other property details */}
        <View style={styles.buttonRow}>
          <Button title="Edit Property" onPress={handleEdit} />
          <Button title="Back" onPress={() => router.back()} />
        </View>
      </ScrollView>

      {/* Modalize Bottom Sheet for Editing Pricing Details */}
      <Modalize ref={modalizeRef} adjustToContentHeight>
        <View style={styles.modalContent}>
          <Text style={styles.sheetTitle}>Edit Pricing Details</Text>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Base Price Per Night:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.basePricePerNight}
              onChangeText={(text) =>
                setPricingDetails({ ...pricingDetails, basePricePerNight: text })
              }
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Weekend Price:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.basePricePerNightWeekend}
              onChangeText={(text) =>
                setPricingDetails({
                  ...pricingDetails,
                  basePricePerNightWeekend: text,
                })
              }
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Weekly Discount (%):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.weeklyDiscount}
              onChangeText={(text) =>
                setPricingDetails({ ...pricingDetails, weeklyDiscount: text })
              }
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Monthly Discount (%):</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.monthlyDiscount}
              onChangeText={(text) =>
                setPricingDetails({ ...pricingDetails, monthlyDiscount: text })
              }
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Cleaning Fee:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.cleaningFee}
              onChangeText={(text) =>
                setPricingDetails({ ...pricingDetails, cleaningFee: text })
              }
            />
          </View>

          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Pet Fee:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={pricingDetails.petFee}
              onChangeText={(text) =>
                setPricingDetails({ ...pricingDetails, petFee: text })
              }
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={savePricingDetails}>
            <Text style={styles.saveButtonText}>Save Pricing</Text>
          </TouchableOpacity>
        </View>
      </Modalize>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#fff", 
    padding: 20 
  },
  content: { 
    paddingBottom: 32 
  },
  title: { 
    fontSize: 24, 
    fontWeight: "bold", 
    marginBottom: 20 
  },
  detail: { 
    fontSize: 16, 
    marginBottom: 20 
  },
  buttonRow: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    marginTop: 20 
  },
  card: {
    backgroundColor: "#f9f9f9",
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  pricingInfo: {
    marginBottom: 10,
  },
  noPricingText: {
    fontStyle: "italic",
    color: "#888",
    marginBottom: 10,
  },
  editPricingButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 10,
    borderRadius: 5,
    alignItems: "center",
  },
  editPricingButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  modalContent: {
    padding: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  inputLabel: {
    width: 180,
    fontSize: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
  },
  saveButton: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HostPropertyDetail;
