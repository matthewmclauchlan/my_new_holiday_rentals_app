import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Switch,
  Pressable,
  Modal,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useGlobalContext } from "../global-provider";
// Import functions from your Appwrite lib
import { upsertHostProfile, addOwnerRole, config, storage } from "@/lib/appwrite";

import * as ImagePicker from "expo-image-picker";
import { ID, Databases, Client } from "react-native-appwrite";
import * as FileSystem from "expo-file-system";

// Create an instance of Databases (if needed)
const client = new Client().setEndpoint(config.endpoint).setProject(config.projectId);
const databases = new Databases(client);

enum WizardStep {
  BASIC_INFO = 0,
  DOC_UPLOAD = 1,
  TERMS = 2,
  REVIEW = 3,
}

/**
 * (Optional) upsertHostApplication is defined if you need a separate document.
 * For now, we are only using upsertHostProfile.
 */
async function upsertHostApplication(data: {
  userId: string;
  fullName: string;
  phoneNumber: string;
  hostDocumentId: string;
}): Promise<void> {
  const collectionId = "67a6563a0032861f4b60";
  const now = new Date().toISOString();
  const docData = {
    userId: data.userId,
    fullName: data.fullName,
    phoneNumber: data.phoneNumber,
    approvalStatus: "pending",  // Set initial status to "pending"
    createdAt: now,
    updatedAt: now,
    hostDocumentId: data.hostDocumentId,
  };

  if (!docData.hostDocumentId) {
    throw new Error("Missing required attribute 'hostDocumentId'");
  }

  try {
    await databases.createDocument(
      config.databaseId,
      collectionId,
      ID.unique(), // Updated here
      docData
    );
  } catch (error) {
    console.error("Error creating/updating host application document:", error);
    throw error;
  }
}

/**
 * Uploads a file using the Appwrite SDK’s storage.createFile method.
 * Uses expo-file-system to get file info and creates a file object with the required properties.
 */
async function uploadFileWithSDK(fileUri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(fileUri);
  if (!fileInfo.exists) {
    throw new Error("File does not exist at the given URI.");
  }

  const file = {
    uri: fileUri,
    name: `id-photo-${Date.now()}.jpg`,
    type: "image/jpeg",
    size: fileInfo.size || 0,
  };

  const fileResponse = await storage.createFile(
    config.bucketId,
    ID.unique(), // Updated here
    file
  );

  const endpoint = config.endpoint.includes("/v1")
    ? config.endpoint
    : `${config.endpoint}/v1`;
  const fileUrl = `${endpoint}/storage/buckets/${config.bucketId}/files/${fileResponse.$id}/preview?project=${config.projectId}`;
  return fileUrl;
}

export default function HostSignupWizard() {
  const router = useRouter();
  const { user, refetch } = useGlobalContext();
  const extendedUser = user as { $id: string; roles?: string[] } | null;

  if (extendedUser && extendedUser.roles && extendedUser.roles.includes("owner")) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.title}>Application Submitted</Text>
        <Text style={styles.body}>
          You have already submitted your host application. Please check your application status.
        </Text>
        <Button
          title="View Application Status"
          onPress={() => router.replace("/(guest)/applicationProcessing")}
          color="#70d7c7"
        />
      </SafeAreaView>
    );
  }

  const [step, setStep] = useState<WizardStep>(WizardStep.BASIC_INFO);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState(""); // Regular text input for phone number
  const [docUri, setDocUri] = useState<string | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

  const handleNext = () => {
    if (step < WizardStep.REVIEW) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > WizardStep.BASIC_INFO) {
      setStep(step - 1);
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Camera permissions are required to take a photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        setDocUri(result.assets[0].uri);
      } else {
        Alert.alert("Photo Capture", "No photo was taken.");
      }
    } catch (error) {
      Alert.alert("Camera Error", "An error occurred while taking the photo.");
    }
  };

  const handleFinalSubmit = async () => {
    if (!extendedUser?.$id) {
      Alert.alert("Error", "You must be logged in.");
      return;
    }
    if (!fullName.trim() || !phone.trim()) {
      Alert.alert("Error", "Full name and phone number are required.");
      return;
    }
    if (!docUri) {
      Alert.alert("Error", "Please take a photo of your government-issued ID.");
      return;
    }
    if (!hasReadTerms || !acceptTerms) {
      Alert.alert("Error", "You must read and accept the terms before submitting.");
      return;
    }
    try {
      // First, upload the captured ID photo using the SDK's storage method.
      const fileUrl = await uploadFileWithSDK(docUri);
      console.log("Uploaded file URL:", fileUrl);
      if (!fileUrl) {
        throw new Error("File URL is empty");
      }

      // Call upsertHostProfile to create or update the host profile.
      // Note: We now pass the uploaded fileUrl as hostDocumentUrl.
      await upsertHostProfile({
        userId: extendedUser.$id,
        fullName,
        phoneNumber: phone, // Use the phone number from the regular TextInput
        hostDocumentUrl: fileUrl,
        termsAccepted: acceptTerms,
      });

      // Ensure the owner role is added.
      await addOwnerRole(extendedUser.$id);

      // (Optional) If you need a separate host application document, uncomment the following:
      // await upsertHostApplication({
      //   userId: extendedUser.$id,
      //   fullName,
      //   phoneNumber: phone,
      //   hostDocumentId: fileUrl,
      // });

      await refetch();
      router.replace("/(guest)/applicationProcessing");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to update host profile");
    }
  };

  const renderTermsModal = () => (
    <Modal visible={showTermsModal} animationType="slide">
      <SafeAreaView style={modalStyles.container}>
        <ScrollView style={modalStyles.scrollContainer}>
          <Text style={modalStyles.heading}>Terms of Service</Text>
          <Text style={modalStyles.body}>
            Last Updated: [Insert Date]
            {"\n\n"}
            1. Acceptance of Terms{"\n"}
            By accessing or using our Service, you agree to be bound by these Terms.
            {"\n\n"}
            2. Use of the Service{"\n"}
            You agree to use the Service only for lawful purposes.
            {"\n\n"}
            3. Intellectual Property{"\n"}
            All content in the Service is the property of [Your Company Name].
            {"\n\n"}
            4. Disclaimer{"\n"}
            The Service is provided "AS IS" without warranties.
            {"\n\n"}
            5. Limitation of Liability{"\n"}
            [Your Company Name] is not liable for any damages.
            {"\n\n"}
            6. Governing Law{"\n"}
            These Terms are governed by the laws of [Your State/Country].
            {"\n\n"}
            7. Changes to Terms{"\n"}
            We reserve the right to modify these Terms at any time.
            {"\n\n"}
            8. Contact Us{"\n"}
            For any questions, contact us at: your-email@example.com.
          </Text>
        </ScrollView>
        <View style={modalStyles.buttonRow}>
          <Button
            title="I have read the Terms"
            onPress={() => {
              setHasReadTerms(true);
              setShowTermsModal(false);
            }}
            color="#70d7c7"
          />
        </View>
      </SafeAreaView>
    </Modal>
  );

  const renderStepContent = () => {
    switch (step) {
      case WizardStep.BASIC_INFO:
        return (
          <View>
            <Text style={styles.heading}>Step 1: Basic Info</Text>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your legal name"
              style={styles.input}
            />
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.phoneRow}>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                style={[styles.input, { flex: 1 }]}
              />
            </View>
          </View>
        );
      case WizardStep.DOC_UPLOAD:
        return (
          <View>
            <Text style={styles.heading}>Step 2: Capture ID Photo</Text>
            <Text style={styles.label}>
              Please take a clear photo of your government-issued ID
            </Text>
            <Button title="Take Photo" onPress={takePhoto} color="#70d7c7" />
            <Text style={styles.info}>
              {docUri ? `Photo captured: ${docUri}` : "No photo captured yet."}
            </Text>
          </View>
        );
      case WizardStep.TERMS:
        return (
          <View>
            <Text style={styles.heading}>Step 3: Terms & Conditions</Text>
            <Text style={styles.termsText}>
              Please read our{" "}
              <Pressable onPress={() => setShowTermsModal(true)}>
                <Text style={styles.linkText}>Terms of Service</Text>
              </Pressable>{" "}
              before signing up.
            </Text>
            <View style={styles.termsRow}>
              <Switch
                value={acceptTerms}
                onValueChange={setAcceptTerms}
                trackColor={{ false: "#ccc", true: "#70d7c7" }}
                thumbColor={acceptTerms ? "#fff" : "#f4f3f4"}
                disabled={!hasReadTerms}
              />
              <Text style={styles.info}>
                {acceptTerms ? "Accepted" : "Not Accepted"}
              </Text>
            </View>
            {!hasReadTerms && (
              <Text style={styles.warningText}>
                You must read the Terms of Service before you can accept them.
              </Text>
            )}
          </View>
        );
      case WizardStep.REVIEW:
        return (
          <View>
            <Text style={styles.heading}>Step 4: Review & Submit</Text>
            <Text style={styles.info}>Full Name: {fullName}</Text>
            <Text style={styles.info}>Phone: {phone}</Text>
            <Text style={styles.info}>ID Photo: {docUri || "None"}</Text>
            <Text style={styles.info}>
              Terms Accepted: {acceptTerms ? "Yes" : "No"}
            </Text>
          </View>
        );
      default:
        return null;
    }
  };

  const isFinalStep = step === WizardStep.REVIEW;

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Become a Host</Text>
      {renderStepContent()}
      {renderTermsModal()}
      <View style={styles.navRow}>
        {step > WizardStep.BASIC_INFO && (
          <Button title="Back" onPress={handleBack} color="#999" />
        )}
        {!isFinalStep ? (
          <Button title="Next" onPress={handleNext} color="#70d7c7" />
        ) : (
          <Button
            title="Submit"
            onPress={handleFinalSubmit}
            color="#70d7c7"
            disabled={!acceptTerms || !hasReadTerms}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
    color: "#333",
  },
  body: { fontSize: 16, textAlign: "center", color: "#333", marginBottom: 20 },
  heading: { fontSize: 18, fontWeight: "600", color: "#333", marginBottom: 10 },
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
  phoneRow: { flexDirection: "row", alignItems: "center", marginBottom: 15 },
  info: { fontSize: 14, color: "#333", marginBottom: 5 },
  termsRow: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  termsText: { fontSize: 14, color: "#333", marginBottom: 10 },
  linkText: { color: "blue", textDecorationLine: "underline" },
  warningText: { fontSize: 12, color: "red", marginTop: 5 },
  navRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
});

const modalStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  body: { fontSize: 16, lineHeight: 24, color: "#333" },
  buttonRow: { padding: 20 },
});
