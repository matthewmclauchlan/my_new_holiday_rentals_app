// app/(host)/hostTabs/property-setup.tsx
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
import { createProperty, getAmenities, getHouseRules } from "@/lib/appwrite";
import AmenitiesPicker from "@/components/AmenitiesPicker";
import BottomSheetPicker from "@/components/BottomSheetPicker";
import { Models } from "react-native-appwrite";
import { useGlobalContext } from "../../global-provider";

enum WizardStep {
  BASIC_INFO = 0,
  LOCATION = 1,
  DETAILS = 2,
  AMENITIES = 3,
  REVIEW = 4,
}

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

const initialValues = {
  name: "",
  propertyType: "Apartment",
  description: "",
  address: "",
  bedrooms: "",
  bathrooms: "",
  area: "",
  selectedAmenities: [] as string[],
};

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
  // Step 4: Amenities – no extra required fields
  Yup.object().shape({}),
  // Step 5: Review – no additional fields
];

export default function PropertySetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(WizardStep.BASIC_INFO);

  // For fetching real data for amenities and house rules
  const [amenitiesData, setAmenitiesData] = useState<Models.Document[]>([]);
  const [houseRulesData, setHouseRulesData] = useState<Models.Document[]>([]);

  useEffect(() => {
    (async () => {
      const fetchedAmenities = await getAmenities();
      setAmenitiesData(fetchedAmenities);
      const fetchedHouseRules = await getHouseRules();
      setHouseRulesData(fetchedHouseRules);
    })();
  }, []);

  const { user } = useGlobalContext();

  const handleFinalSubmit = async (values: typeof initialValues) => {
    if (!user?.$id) {
      Alert.alert("Error", "User not found");
      return;
    }
    try {
      await createProperty({
        name: values.name,
        type: values.propertyType as any,
        description: values.description,
        address: values.address,
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        rating: 0,
        area: Number(values.area),
        amenities: values.selectedAmenities,
        houseRulesId: "", // Not implemented in this example
        isFeatured: false,
        pricePerNight: 120,
        userId: user.$id, // Ensure you pass the userId to your property document
        geolocation: "latitude,longitude",
        mediaIds: [],
        status: "active",
      });
      Alert.alert("Success", "Property created successfully");
      router.replace("/(host)/hostTabs/dashboard");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to create property");
    }
  };

  const renderStepContent = (formikProps: any) => {
    switch (step) {
      case WizardStep.BASIC_INFO:
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
            <Text style={styles.charCount}>
              {formikProps.values.name.length} / 100
            </Text>
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
            <Text style={styles.charCount}>
              {formikProps.values.description.length} / 300
            </Text>
          </View>
        );
      case WizardStep.LOCATION:
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
            {/* Future: Integrate Google Maps/Places autocomplete */}
          </View>
        );
      case WizardStep.DETAILS:
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
      case WizardStep.AMENITIES:
        return (
          <View>
            <Text style={styles.stepTitle}>Select Amenities</Text>
            <AmenitiesPicker
              selectedAmenities={formikProps.values.selectedAmenities}
              onToggle={(id: string) => {
                const current = formikProps.values.selectedAmenities;
                if (current.includes(id)) {
                  formikProps.setFieldValue(
                    "selectedAmenities",
                    current.filter((item: string) => item !== id)
                  );
                } else {
                  formikProps.setFieldValue("selectedAmenities", [...current, id]);
                }
              }}
            />
          </View>
        );
      case WizardStep.REVIEW:
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
              {step > WizardStep.BASIC_INFO && (
                <Button
                  title="Back"
                  onPress={() => setStep(step - 1)}
                  color="#999"
                />
              )}
              {step < WizardStep.REVIEW ? (
                <Button
                  title="Next"
                  onPress={() => {
                    formikProps.validateForm().then((errors: any) => {
                      if (Object.keys(errors).length === 0) {
                        setStep(step + 1);
                      } else {
                        Alert.alert(
                          "Validation Error",
                          "Please fix the errors before proceeding."
                        );
                      }
                    });
                  }}
                  color="#70d7c7"
                />
              ) : (
                <Button
                  title="Submit"
                  onPress={() => formikProps.handleSubmit()}
                  color="#70d7c7"
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
  charCount: { textAlign: "right", marginBottom: 10, color: "#666" },
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  pickerItem: {
    color: "#333",
    fontSize: 16,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  info: { fontSize: 14, color: "#333", marginBottom: 5 },
  subHeading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 10,
    marginBottom: 5,
    color: "#333",
  },
});

