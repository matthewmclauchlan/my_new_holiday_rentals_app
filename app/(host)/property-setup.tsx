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
import { useGlobalContext } from "../global-provider";
import { Amenity } from "@/lib/types"; // Ensure your Amenity interface is defined here

// Update wizard steps to include an additional details step.
enum WizardStep {
  BASIC_INFO = 0,
  LOCATION = 1,
  DETAILS = 2,
  ADDITIONAL = 3,  // New step for catastro and vutNumber
  AMENITIES = 4,
  REVIEW = 5,
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
  catastro: "",   // New field
  vutNumber: "",  // New field
};

const validationSchemas = [
  // Step 0: Basic Info
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
  // Step 1: Location
  Yup.object().shape({
    address: Yup.string().required("Property Address is required"),
  }),
  // Step 2: Details
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
  // Step 3: Additional Details
  Yup.object().shape({
    catastro: Yup.string().required("Catastro is required"),
    vutNumber: Yup.string().required("Vut Number is required"),
  }),
  // Step 4: Amenities – no extra required fields
  Yup.object().shape({}),
  // Step 5: Review – no additional fields
  Yup.object().shape({}),
];

export default function PropertySetupWizard() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(WizardStep.BASIC_INFO);
  const [amenitiesData, setAmenitiesData] = useState<Amenity[]>([]);
  const [houseRulesData, setHouseRulesData] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const fetchedAmenities = await getAmenities();
        console.log("Fetched amenities:", fetchedAmenities);
        setAmenitiesData(fetchedAmenities);
      } catch (err) {
        console.error("Error fetching amenities:", err);
      }
      try {
        const fetchedHouseRules = await getHouseRules();
        console.log("Fetched house rules:", fetchedHouseRules);
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
    console.log("Submitting property with values:", values);
    try {
      const property = await createProperty({
        name: values.name,
        type: values.propertyType as any,
        description: values.description,
        address: values.address,
        bedrooms: Number(values.bedrooms),
        bathrooms: Number(values.bathrooms),
        rating: "Noratings",
        area: Number(values.area),
        amenities: values.selectedAmenities,
        houseRulesId: "",
        isFeatured: false,
        pricePerNight: 120,
        userId: user.$id,
        geolocation: "latitude,longitude",
        mediaIds: [],
        status: "active",
        catastro: values.catastro,    // New field
        vutNumber: values.vutNumber,   // New field
      });
      console.log("Property successfully created:", property);
      Alert.alert("Success", "Property created successfully");
      router.replace("../(host)/hostTabs");
    } catch (error: any) {
      console.error("Submission error:", error);
      Alert.alert("Error", error.message || "Failed to create property");
    } finally {
      setIsSubmitting(false);
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
      case WizardStep.ADDITIONAL:
        return (
          <View>
            <Text style={styles.stepTitle}>Additional Details</Text>
            <Text style={styles.label}>Catastro</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.catastro}
              onChangeText={formikProps.handleChange("catastro")}
              onBlur={formikProps.handleBlur("catastro")}
              placeholder="Enter cadastral information"
            />
            <Text style={styles.label}>Vut Number</Text>
            <TextInput
              style={styles.input}
              value={formikProps.values.vutNumber}
              onChangeText={formikProps.handleChange("vutNumber")}
              onBlur={formikProps.handleBlur("vutNumber")}
              placeholder="Enter Vut Number"
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
                  formikProps.setFieldValue("selectedAmenities", [
                    ...current,
                    id,
                  ]);
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
            <Text style={styles.info}>Catastro: {formikProps.values.catastro}</Text>
            <Text style={styles.info}>Vut Number: {formikProps.values.vutNumber}</Text>
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
                  disabled={isSubmitting}
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
                  disabled={isSubmitting}
                />
              ) : (
                <Button
                  title={isSubmitting ? "Submitting..." : "Submit"}
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
  charCount: { textAlign: "right", marginBottom: 10, color: "#666" },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  info: { fontSize: 14, color: "#333", marginBottom: 5 },
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
  noResults: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
    marginVertical: 20,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 20,
  },
});
