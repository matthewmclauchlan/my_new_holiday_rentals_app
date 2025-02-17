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
import { createProperty } from "../../../lib/appwrite";


import AmenitiesPicker from "../../../components/AmenitiesPicker";
import BottomSheetPicker from "../../../components/BottomSheetPicker";
import { useGlobalContext } from "../../global-provider";
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

// --- Normalization and Mapping for Amenities ---
const normalizeAmenity = (amenity: string): string =>
  amenity.toLowerCase().replace(/\s+/g, '');

const allowedAmenitiesMapping: Record<string, string> = {
  "coffeemachine": "coffeemachine",
  "garden": "garden",
  "towels": "towels",
  "fridge": "fridge",
  "centralheating": "centralheating",
  "washingmachine": "washingmachine",
};

export default function PropertySetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useGlobalContext();

  const handleFinalSubmit = async (values: typeof initialValues) => {
    if (!user?.$id) {
      Alert.alert("Error", "User not found");
      return;
    }
    setIsSubmitting(true);
    try {
      // --- Normalize and Map the Selected Amenities ---
      const mappedAmenities = values.selectedAmenities
        .map((amenity) => {
          const normalized = normalizeAmenity(amenity);
          return allowedAmenitiesMapping[normalized];
        })
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

  // New: Card for updating amenities
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", padding: 16, marginBottom: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  infoText: { fontSize: 16, color: "#333", marginTop: 8 },
  infoBlock: { marginBottom: 10 },
  noInfoText: { fontStyle: "italic", color: "#888", marginBottom: 10 },
  
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, marginBottom: 10 },
  closeButton: { padding: 10 },
  closeIcon: { width: 24, height: 24, tintColor: "#000" },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  headerSpacer: { width: 44 },
  centeredImageContainer: { alignItems: "center", marginBottom: 20 },
  imageWrapper: { position: "relative", width: 200, height: 200 },
  mainImageCentered: { width: "100%", height: "100%", borderRadius: 10 },
  imageEditButton: { position: "absolute", top: 5, right: 5, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 15, padding: 5 },
  editIcon: { width: 24, height: 24, tintColor: "#70d7c7" },
  noImagePlaceholderCentered: { width: 200, height: 200, borderRadius: 10, backgroundColor: "#eee", justifyContent: "center", alignItems: "center", padding: 5 },
  noImageText: { marginBottom: 5, fontSize: 14, color: "#666", textAlign: "center" },
  uploadButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#70d7c7", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5, marginTop: 10 },
  addImageButtonText: { color: "#fff", fontWeight: "bold" },
  
  modalContent: { padding: 20 },
  sheetTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", marginVertical: 8 },
  inputLabel: { width: 130, fontSize: 16, color: "#333" },
  inputField: { flex: 1, borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, fontSize: 16 },
  saveButton: { backgroundColor: "#70d7c7", paddingVertical: 12, borderRadius: 10, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  modalTitle: { fontSize: 18, fontWeight: "bold", flex: 1, textAlign: "center" },
  modalCloseIcon: { width: 24, height: 24, tintColor: "#000" },
  fullScreenModal: { margin: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  section: { marginBottom: 20 },
  mainImageContainer: { alignItems: "center" },
  mainImage: { width: 200, height: 200, borderRadius: 10 },
  mainImageEditRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginTop: 8, padding: 8 },
  replaceText: { fontSize: 16, color: "#70d7c7" },
  editIconSmall: { width: 20, height: 20, tintColor: "#70d7c7", marginLeft: 5 },
  addMainImageButton: { flexDirection: "row", alignItems: "center", backgroundColor: "#70d7c7", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 5 },
  galleryScrollView: { paddingHorizontal: 10 },
  galleryCard: { width: 200, height: 200, marginRight: 10, alignItems: "center" },
  galleryImage: { width: "100%", height: "100%", borderRadius: 10 },
  galleryImageInput: { borderWidth: 1, borderColor: "#ccc", borderRadius: 5, padding: 4, marginTop: 4, fontSize: 12, width: "100%" },
  galleryDeleteButton: { position: "absolute", top: 4, right: 4, padding: 2 },
  galleryDeleteIcon: { width: 16, height: 16, tintColor: "#000" },
  addGalleryCard: { width: 200, height: 200, borderRadius: 10, borderWidth: 1, borderColor: "#ccc", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  addGalleryText: { fontSize: 16, color: "#70d7c7" },
  fixedSaveButtonContainer: { padding: 20, backgroundColor: "#fff" },
  uploadIcon: { width: 20, height: 20, tintColor: "#70d7c7" },
  policyCard: { borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 10, borderRadius: 8 },
  selectedPolicyCard: { borderColor: "#70d7c7", backgroundColor: "#e6f7ff" },
  policyTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  policyDescription: { fontSize: 14, color: "#555" },
  cancellationModalContent: { padding: 20, paddingBottom: 80 },
  cancellationSaveContainer: { padding: 20, borderTopWidth: 1, borderColor: "#ccc", backgroundColor: "#fff" },
  policyLink: { color: "#70d7c7", textDecorationLine: "underline", marginTop: 5 },
});
