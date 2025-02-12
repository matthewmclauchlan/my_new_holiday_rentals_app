// app/(host)/property-setup.tsx
import React, { useState, useEffect } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
} from "react-native";
import { Formik } from "formik";
import * as Yup from "yup";
import { useRouter } from "expo-router";
import { createProperty, getHouseRules } from "@/lib/appwrite"; // using getHouseRules (a callable function)
import AmenitiesPicker from "@/components/AmenitiesPicker";
import BottomSheetPicker from "@/components/BottomSheetPicker";
import { useGlobalContext } from "../global-provider";
import { AmenityTypeEnum } from "../../lib/types"; // Use the imported enum

// Note: The local enum declaration for AmenityTypeEnum was removed to avoid duplicate declarations.

// Initial form values with selectedAmenities typed as an array of string IDs.
const initialValues = {
  name: "",
  propertyType: "Apartment",
  description: "",
  address: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
  catastro: "",
  vutNumber: "",
  selectedAmenities: [] as string[],
};

const propertyTypes = [
  "House",
  "Condo",
  "Apartment",
  "Townhouse",
  "Villa",
  "Cottage",
  "Bungalow",
  "Duplex",
  "Loft",
  "Penthouse",
  "Studio",
  "Mansion",
  "Cabin",
  "Farmhouse",
  "Other",
];

const validationSchemas = [
  // Step 1: Basic Info
  Yup.object().shape({
    name: Yup.string()
      .max(100, "Maximum 100 characters")
      .required("Property Title is required"),
    propertyType: Yup.string()
      .oneOf(propertyTypes, "Invalid property type")
      .required("Property type is required"),
    description: Yup.string()
      .max(300, "Maximum 300 characters")
      .required("Property Description is required"),
  }),
  // Step 2: Location
  Yup.object().shape({
    address: Yup.string().required("Property Address is required"),
  }),
  // Step 3: Details
  Yup.object().shape({
    bedrooms: Yup.number()
      .typeError("Must be a number")
      .min(0, "At least 0")
      .required("Number of bedrooms is required"),
    bathrooms: Yup.number()
      .typeError("Must be a number")
      .min(0, "At least 0")
      .required("Number of bathrooms is required"),
    area: Yup.number()
      .typeError("Must be a number")
      .min(0, "At least 0")
      .required("Property size is required"),
  }),
  // Step 4: Additional Info for Catastro and VUT Number
  Yup.object().shape({
    catastro: Yup.string().required("Catastro is required"),
    vutNumber: Yup.string().required("VUT Number is required"),
  }),
  // Step 5: Amenities – no extra required fields
  Yup.object().shape({}),
  // Step 6: Review – no additional validation
  Yup.object().shape({}),
];

export default function PropertySetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [houseRulesData, setHouseRulesData] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch house rules on component mount.
  useEffect(() => {
    (async () => {
      try {
        const fetchedHouseRules = await getHouseRules();
        setHouseRulesData(fetchedHouseRules);
      } catch (err) {
        console.error("Error fetching house rules:", err);
      }
    })();
  }, []);

  const { user } = useGlobalContext();

  const handleFinalSubmit = async (values: typeof initialValues) => {
    if (!user?.$id) {
      Alert.alert("Error", "User not found");
      return;
    }
    setIsSubmitting(true);
    try {
      // Mapping: Convert the selected names (normalized to lowercase) to the allowed values.
      // Allowed values: Coffeemachine, garden, centralheating, towels, fridge
      const allowedAmenitiesMapping: Record<string, string> = {
        "coffeemachine": "Coffeemachine",
        "garden": "garden",
        "centralheating": "centralheating",
        "towels": "towels",
        "fridge": "fridge",
      };
  
      const mappedAmenities = values.selectedAmenities
        .map((amenity) => allowedAmenitiesMapping[amenity.toLowerCase()])
        .filter((amenity) => amenity !== undefined);
  
      await createProperty({
        name: values.name,
        type: values.propertyType as any,
        description: values.description,
        address: values.address,
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        rating: "5",
        area: Number(values.area),
        // Pass the mapped amenity values (which should now be in the allowed format).
        amenities: mappedAmenities,
        houseRulesId: "", // Not implemented in this example.
        isFeatured: false,
        pricePerNight: 120,
        userId: user.$id,
        geolocation: "latitude,longitude",
        mediaIds: [],
        status: "active",
        catastro: values.catastro,
        vutNumber: values.vutNumber,
      });
      Alert.alert("Success", "Property created successfully");
      router.replace("../(host)/hostTabs");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create property");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  

  const renderStepContent = (formikProps: any) => {
    switch (step) {
      case 0:
        return (
          <View>
            <Text style={styles.stepTitle}>Basic Info</Text>
            <Text style={styles.label}>Property Title</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.name}
              onChangeText={formikProps.handleChange("name")}
              onBlur={formikProps.handleBlur("name")}
              maxLength={100}
              placeholder="Enter property title"
            />
            <BottomSheetPicker
              label="Property Type"
              selectedValue={formikProps.values.propertyType}
              onValueChange={(value) =>
                formikProps.setFieldValue("propertyType", value)
              }
              options={propertyTypes.map((type) => ({ label: type, value: type }))}
            />
            <Text style={styles.label}>Property Description</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={formikProps.values.description}
              onChangeText={formikProps.handleChange("description")}
              onBlur={formikProps.handleBlur("description")}
              maxLength={300}
              multiline
              placeholder="Enter a short description"
            />
          </View>
        );
      case 1:
        return (
          <View>
            <Text style={styles.stepTitle}>Location</Text>
            <Text style={styles.label}>Property Address</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.address}
              onChangeText={formikProps.handleChange("address")}
              onBlur={formikProps.handleBlur("address")}
              placeholder="Enter property address"
            />
          </View>
        );
      case 2:
        return (
          <View>
            <Text style={styles.stepTitle}>Details</Text>
            <Text style={styles.label}>Number of Bedrooms</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.bedrooms.toString()}
              onChangeText={formikProps.handleChange("bedrooms")}
              keyboardType="numeric"
              placeholder="Enter number of bedrooms"
            />
            <Text style={styles.label}>Number of Bathrooms</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.bathrooms.toString()}
              onChangeText={formikProps.handleChange("bathrooms")}
              keyboardType="numeric"
              placeholder="Enter number of bathrooms"
            />
            <Text style={styles.label}>Property Size (sqm)</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.area.toString()}
              onChangeText={formikProps.handleChange("area")}
              keyboardType="numeric"
              placeholder="Enter property size in sqm"
            />
          </View>
        );
      case 3:
        return (
          <View>
            <Text style={styles.stepTitle}>Additional Information</Text>
            <Text style={styles.label}>Catastro</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.catastro}
              onChangeText={formikProps.handleChange("catastro")}
              onBlur={formikProps.handleBlur("catastro")}
              placeholder="Enter Catastro information"
            />
            <Text style={styles.label}>VUT Number</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.vutNumber}
              onChangeText={formikProps.handleChange("vutNumber")}
              onBlur={formikProps.handleBlur("vutNumber")}
              placeholder="Enter VUT Number"
            />
          </View>
        );
      case 4:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Amenities</Text>
            {/* Removed the options prop because AmenitiesPicker fetches data internally */}
            <AmenitiesPicker
              selectedAmenities={formikProps.values.selectedAmenities}
              onToggle={(value: string) => {
                const current = formikProps.values.selectedAmenities;
                if (current.includes(value)) {
                  formikProps.setFieldValue(
                    "selectedAmenities",
                    current.filter((item: string) => item !== value)
                  );
                } else {
                  formikProps.setFieldValue("selectedAmenities", [
                    ...current,
                    value,
                  ]);
                }
              }}
            />
          </View>
        );
      case 5:
        return (
          <View>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.info}>Property Title: {formikProps.values.name}</Text>
            <Text style={styles.info}>Property Type: {formikProps.values.propertyType}</Text>
            <Text style={styles.info}>Description: {formikProps.values.description}</Text>
            <Text style={styles.info}>Address: {formikProps.values.address}</Text>
            <Text style={styles.info}>Bedrooms: {formikProps.values.bedrooms}</Text>
            <Text style={styles.info}>Bathrooms: {formikProps.values.bathrooms}</Text>
            <Text style={styles.info}>Size (sqm): {formikProps.values.area}</Text>
            <Text style={styles.info}>Catastro: {formikProps.values.catastro}</Text>
            <Text style={styles.info}>VUT Number: {formikProps.values.vutNumber}</Text>
            <Text style={styles.info}>
              Amenities:{" "}
              {formikProps.values.selectedAmenities.length
                ? formikProps.values.selectedAmenities.join(", ")
                : "None"}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const isFinalStep = step === 5;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchemas[step]}
      onSubmit={(values) => handleFinalSubmit(values)}
    >
      {(formikProps) => (
        <SafeAreaView style={styles.container}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 20 }}>
            {renderStepContent(formikProps)}
            <View style={styles.navRow}>
              {step > 0 && (
                <Button title="Back" onPress={() => setStep(step - 1)} color="#999" />
              )}
              {!isFinalStep ? (
                <Button title="Next" onPress={() => setStep(step + 1)} color="#70d7c7" />
              ) : (
                <Button
                  title="Submit"
                  onPress={() => formikProps.handleSubmit()}
                  color="#70d7c7"
                  disabled={isSubmitting}
                />
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      )}
    </Formik>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  stepTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  label: { fontSize: 16, marginBottom: 5, color: "#555" },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 15,
    fontSize: 16,
    color: "#333",
  },
  multilineInput: { height: 80, textAlignVertical: "top" },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  info: { fontSize: 14, color: "#333", marginBottom: 5 },
});
