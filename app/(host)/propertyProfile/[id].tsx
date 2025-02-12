import React, { useEffect, useState, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  Alert,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Dimensions,
  Switch,
  Button,
  Pressable,
  Linking,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Modalize } from "react-native-modalize";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import Constants from "expo-constants";
import {
  getPropertyById,
  getPriceRulesForProperty,
  updatePriceRulesForProperty,
  createOrUpdateBookingRulesForProperty,
  getHouseRulesForProperty,
  updateHouseRulesForProperty,
  storage,
  databases,
} from "@/lib/appwrite";
import { getBookingRulesForProperty } from "@/lib/bookingHelper";
import { useGlobalContext } from "@/app/global-provider";

// Import types
import type {
  PriceRules,
  PriceRulesUpdate,
  CancellationPolicy,
  BookingRules,
  BookingRulesUpdate,
  HouseRules,
  HouseRulesUpdate,
} from "@/lib/appwrite";

// ------------------ Environment Variables ------------------
const {
  EXPO_PUBLIC_APPWRITE_ENDPOINT,
  EXPO_PUBLIC_APPWRITE_PROJECT_ID,
  EXPO_PUBLIC_APPWRITE_MEDIA_BUCKET_ID,
  EXPO_PUBLIC_APPWRITE_DATABASE_ID,
  EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
} = Constants.manifest?.extra || process.env;

// ------------------ Cancellation Policy Options ------------------
const cancellationPolicyOptions: {
  key: CancellationPolicy;
  title: string;
  description: string;
  link: string;
}[] = [
  {
    key: "Firm",
    title: "Firm",
    description:
      "Guests get full refund if cancelled up to 28 days before check‑in.",
    link: "https://yourdomain.com/policies/firm",
  },
  {
    key: "Strict",
    title: "Strict",
    description:
      "Full refund if cancelled within 48 hours of booking and at least 28 days before check‑in.",
    link: "https://yourdomain.com/policies/strict",
  },
  {
    key: "Free",
    title: "Free",
    description: "Free cancellation available.",
    link: "https://yourdomain.com/policies/free",
  },
  {
    key: "Non-refundable",
    title: "Non-refundable",
    description: "Non-refundable except in certain circumstances.",
    link: "https://yourdomain.com/policies/nonrefundable",
  },
];

const getCancellationPolicyTitle = (
  key: CancellationPolicy | string
): string => {
  const option = cancellationPolicyOptions.find((opt) => opt.key === key);
  return option ? option.title : "Not set";
};

// ------------------ SaveButton Component ------------------
interface SaveButtonProps {
  onPress: () => void;
  isSaving: boolean;
  title: string;
}
const SaveButton: React.FC<SaveButtonProps> = ({ onPress, isSaving, title }) => (
  <TouchableOpacity
    style={[styles.saveButton, isSaving && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={isSaving}
  >
    {isSaving ? (
      <ActivityIndicator color="#fff" />
    ) : (
      <Text style={styles.saveButtonText}>{title}</Text>
    )}
  </TouchableOpacity>
);

// ------------------ Local Helper: Update Property Images ------------------
const updatePropertyImages = async (propertyId: string, images: any[]) => {
  try {
    const databaseId = EXPO_PUBLIC_APPWRITE_DATABASE_ID;
    const collectionId = EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID;
    const imagesArray = images.map((img) => JSON.stringify(img));
    const updatedProperty = await databases.updateDocument(
      databaseId,
      collectionId,
      propertyId,
      { images: imagesArray }
    );
    return updatedProperty;
  } catch (error) {
    console.error("Error updating property images:", error);
    throw error;
  }
};

// ------------------ Helper: Update Property Title & Description ------------------
const updatePropertyDetails = async (
  propertyId: string,
  title: string,
  description: string
) => {
  try {
    const updatedProperty = await databases.updateDocument(
      EXPO_PUBLIC_APPWRITE_DATABASE_ID,
      EXPO_PUBLIC_APPWRITE_PROPERTIES_COLLECTION_ID,
      propertyId,
      { name: title, description }
    );
    return updatedProperty;
  } catch (error) {
    console.error("Error updating property details:", error);
    throw error;
  }
};

// ------------------ Component ------------------
const HostPropertyDetail = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useGlobalContext();

  const [property, setProperty] = useState<any>(null);
  const [pricingRules, setPricingRules] = useState<PriceRules | null>(null);
  const [bookingRules, setBookingRules] = useState<BookingRules | null>(null);
  const [houseRules, setHouseRules] = useState<HouseRules | null>(null);
  const [loading, setLoading] = useState(true);

  const [propertyTitle, setPropertyTitle] = useState("");
  const [propertyDescription, setPropertyDescription] = useState("");

  // Each image object may include a documentId when saved.
  const [images, setImages] = useState<
    Array<{
      localUri: string;
      remoteUrl?: string;
      description: string;
      isMain: boolean;
      fileId?: string;
      documentId?: string;
    }>
  >([]);
  const imageModalRef = useRef<Modalize>(null);
  const galleryScrollRef = useRef<ScrollView>(null);

  // Modal refs for editing sections
  const propertyInfoModalRef = useRef<Modalize>(null);
  const pricingModalRef = useRef<Modalize>(null);
  const bookingRulesModalRef = useRef<Modalize>(null);
  const cancellationModalRef = useRef<Modalize>(null);
  const houseRulesModalRef = useRef<Modalize>(null);

  const [pricingDetails, setPricingDetails] = useState({
    basePricePerNight: "",
    basePricePerNightWeekend: "",
    weeklyDiscount: "",
    monthlyDiscount: "",
    cleaningFee: "",
    petFee: "",
  });
  const [bookingRulesDetails, setBookingRulesDetails] = useState({
    instantBook: false,
    minStay: "",
    maxStay: "",
    advanceNotice: "",
  });
  const [selectedCancellationPolicy, setSelectedCancellationPolicy] =
    useState<CancellationPolicy>("Firm");
  const [houseRulesDetails, setHouseRulesDetails] = useState<HouseRulesUpdate>({
    checkIn: "",
    checkOut: "",
    petsAllowed: false,
    guestsMax: 0,
    smokingAllowed: false,
  });

  // Refs and UI states for saving actions
  const savingPropertyInfoRef = useRef(false);
  const savingPricingRef = useRef(false);
  const savingBookingRulesRef = useRef(false);
  const savingHouseRulesRef = useRef(false);
  const savingImagesRef = useRef(false);
  const [isSavingPropertyInfo, setIsSavingPropertyInfo] = useState(false);
  const [isSavingPricing, setIsSavingPricing] = useState(false);
  const [isSavingBookingRules, setIsSavingBookingRules] = useState(false);
  const [isSavingHouseRules, setIsSavingHouseRules] = useState(false);
  const [isSavingImages, setIsSavingImages] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch property details
        const propertyData = await getPropertyById(id);
        setProperty(propertyData);
        setPropertyTitle(propertyData?.name || "");
        setPropertyDescription(propertyData?.description || "");
        if (propertyData?.images && Array.isArray(propertyData.images)) {
          try {
            const parsedImages = propertyData.images.map((imgString: string) =>
              JSON.parse(imgString)
            );
            setImages(parsedImages);
          } catch (e) {
            console.error("Error parsing images", e);
          }
        }
        // Fetch pricing rules
        const pricingData = await getPriceRulesForProperty(id);
        setPricingRules(pricingData);
        if (pricingData) {
          setPricingDetails({
            basePricePerNight: pricingData.basePricePerNight.toString(),
            basePricePerNightWeekend: pricingData.basePricePerNightWeekend.toString(),
            weeklyDiscount: pricingData.weeklyDiscount?.toString() || "",
            monthlyDiscount: pricingData.monthlyDiscount?.toString() || "",
            cleaningFee: pricingData.cleaningFee?.toString() || "",
            petFee: pricingData.petFee?.toString() || "",
          });
        }
        // Fetch booking rules
        if (user) {
          let bookingData = await getBookingRulesForProperty(id);
          if (!bookingData) {
            const defaultBookingRules: any = {
              cancellationPolicy: "Firm",
              instantBook: false,
              minStay: 0,
              maxStay: 0,
              advanceNotice: 0,
              propertyId: id,
            };
            bookingData = await createOrUpdateBookingRulesForProperty(
              id,
              defaultBookingRules,
              user.$id
            );
          }
          setBookingRules(bookingData as BookingRules);
          setSelectedCancellationPolicy(bookingData.cancellationPolicy);
          setBookingRulesDetails({
            instantBook: bookingData.instantBook,
            minStay: bookingData.minStay.toString(),
            maxStay: bookingData.maxStay.toString(),
            advanceNotice: bookingData.advanceNotice.toString(),
          });
        } else {
          Alert.alert("Error", "User not logged in");
        }
        // Fetch house rules
        const houseData = await getHouseRulesForProperty(id);
        setHouseRules(houseData);
        if (houseData) {
          setHouseRulesDetails({
            checkIn: houseData.checkIn,
            checkOut: houseData.checkOut,
            petsAllowed: houseData.petsAllowed,
            guestsMax: houseData.guestsMax,
            smokingAllowed: houseData.smokingAllowed,
          });
        }
      } catch (error) {
        console.error("Error fetching property or rules:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id, user]);

  // Compute main image and gallery images.
  const mainImage = images.find((img) => img.isMain);
  const galleryImages = images.filter((img) => !img.isMain);

  // Scroll gallery to end when new gallery images are added.
  useEffect(() => {
    if (galleryImages.length > 0) {
      galleryScrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [galleryImages.length]);

  const handleClose = () => {
    router.back();
  };

  const handleUpdatePropertyDetails = async () => {
    if (savingPropertyInfoRef.current) return;
    savingPropertyInfoRef.current = true;
    setIsSavingPropertyInfo(true);
    try {
      const updatedProperty = await updatePropertyDetails(
        id,
        propertyTitle,
        propertyDescription
      );
      setProperty(updatedProperty);
      Alert.alert("Success", "Property details updated successfully");
      propertyInfoModalRef.current?.close();
    } catch (error) {
      console.error("Error updating property details:", error);
      Alert.alert("Error", "Failed to update property details");
    } finally {
      savingPropertyInfoRef.current = false;
      setIsSavingPropertyInfo(false);
    }
  };

  // ------------------ Image Picker Functions ------------------
  const openMainImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Permission to access camera roll is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImages((prev) => {
        const withoutMain = prev.filter((img) => !img.isMain);
        return [{ localUri: asset.uri, description: "", isMain: true }, ...withoutMain];
      });
    }
  };

  const openGalleryImagePicker = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Permission to access camera roll is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newGalleryImages = result.assets.map((asset) => ({
        localUri: asset.uri,
        description: "",
        isMain: false,
      }));
      setImages((prev) => {
        const mainImages = prev.filter((img) => img.isMain);
        const gallery = prev.filter((img) => !img.isMain);
        return [...mainImages, ...gallery, ...newGalleryImages];
      });
    }
  };

  const updateImageDescription = (uri: string, description: string) => {
    const updatedImages = images.map((img) =>
      img.localUri === uri ? { ...img, description } : img
    );
    setImages(updatedImages);
  };

  const uploadImageToAppwrite = async (fileUri: string) => {
    try {
      const fileName = fileUri.split("/").pop() || "photo.jpg";
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const fileSize = (fileInfo as any).size || 0;
      const fileData = {
        uri: fileUri,
        name: fileName,
        type: "image/jpeg",
        size: fileSize,
      };
      const uploadedFile = await storage.createFile(
        EXPO_PUBLIC_APPWRITE_MEDIA_BUCKET_ID,
        "unique()",
        fileData
      );
      return uploadedFile;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  const handleSaveImages = async () => {
    if (savingImagesRef.current) return;
    savingImagesRef.current = true;
    setIsSavingImages(true);
    try {
      const savedImages = await Promise.all(
        images.map(async (img) => {
          if (img.documentId) return img;
          const uploadedFile = await uploadImageToAppwrite(img.localUri);
          const remoteUrl = `${EXPO_PUBLIC_APPWRITE_ENDPOINT}/storage/buckets/${EXPO_PUBLIC_APPWRITE_MEDIA_BUCKET_ID}/files/${uploadedFile.$id}/view?project=${EXPO_PUBLIC_APPWRITE_PROJECT_ID}`;
          const mediaDocument = await databases.createDocument(
            EXPO_PUBLIC_APPWRITE_DATABASE_ID,
            process.env.EXPO_PUBLIC_APPWRITE_MEDIA_COLLECTION_ID || "",
            "unique()",
            {
              fileId: uploadedFile.$id,
              description: img.description,
              isMain: img.isMain,
              propertyId: id,
            }
          );
          return { ...img, remoteUrl, documentId: mediaDocument.$id };
        })
      );
      await updatePropertyImages(id, savedImages);
      setImages(savedImages);
      Alert.alert("Success", "Images updated successfully");
      imageModalRef.current?.close();
    } catch (error) {
      console.error("Error saving images:", error);
      Alert.alert("Error", "Failed to save images");
    } finally {
      savingImagesRef.current = false;
      setIsSavingImages(false);
    }
  };

  const savePricingDetails = async () => {
    if (savingPricingRef.current) return;
    savingPricingRef.current = true;
    try {
      const updatedPricing: PriceRulesUpdate = {
        basePricePerNight: parseFloat(pricingDetails.basePricePerNight) || 0,
        basePricePerNightWeekend: parseFloat(pricingDetails.basePricePerNightWeekend) || 0,
        weeklyDiscount: parseFloat(pricingDetails.weeklyDiscount) || 0,
        monthlyDiscount: parseFloat(pricingDetails.monthlyDiscount) || 0,
        cleaningFee: parseFloat(pricingDetails.cleaningFee) || 0,
        petFee: parseFloat(pricingDetails.petFee) || 0,
      };
      const updatedRules = await updatePriceRulesForProperty(id, updatedPricing);
      setPricingRules(updatedRules);
      Alert.alert("Success", "Pricing details updated successfully");
      pricingModalRef.current?.close();
    } catch (error) {
      console.error("Error updating pricing details:", error);
      Alert.alert("Error", "Failed to update pricing details");
    } finally {
      savingPricingRef.current = false;
    }
  };

  const saveBookingRulesDetails = async () => {
    if (!user || savingBookingRulesRef.current) return;
    savingBookingRulesRef.current = true;
    try {
      const updatedBookingRules: BookingRulesUpdate = {
        cancellationPolicy: selectedCancellationPolicy,
        instantBook: bookingRulesDetails.instantBook,
        minStay: parseInt(bookingRulesDetails.minStay, 10) || 0,
        maxStay: parseInt(bookingRulesDetails.maxStay, 10) || 0,
        advanceNotice: parseInt(bookingRulesDetails.advanceNotice, 10) || 0,
      };
      const updatedRules = await createOrUpdateBookingRulesForProperty(
        id,
        updatedBookingRules,
        user.$id
      );
      setBookingRules(updatedRules);
      Alert.alert("Success", "Booking rules updated successfully");
      bookingRulesModalRef.current?.close();
      cancellationModalRef.current?.close();
    } catch (error) {
      console.error("Error updating booking rules:", error);
      Alert.alert("Error", "Failed to update booking rules");
    } finally {
      savingBookingRulesRef.current = false;
    }
  };

  const saveHouseRulesDetails = async () => {
    if (savingHouseRulesRef.current) return;
    savingHouseRulesRef.current = true;
    try {
      const updatedHouseRules: HouseRulesUpdate = {
        checkIn: houseRulesDetails.checkIn,
        checkOut: houseRulesDetails.checkOut,
        petsAllowed: houseRulesDetails.petsAllowed,
        guestsMax: houseRulesDetails.guestsMax,
        smokingAllowed: houseRulesDetails.smokingAllowed,
      };
      const updatedRules = await updateHouseRulesForProperty(id, updatedHouseRules);
      setHouseRules(updatedRules);
      Alert.alert("Success", "House rules updated successfully");
      houseRulesModalRef.current?.close();
    } catch (error) {
      console.error("Error updating house rules:", error);
      Alert.alert("Error", "Failed to update house rules");
    } finally {
      savingHouseRulesRef.current = false;
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
      {/* Main Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Image source={require('@/assets/icons/cross.png')} style={styles.closeIcon} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Property Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Image Section */}
        <View style={styles.centeredImageContainer}>
          {mainImage ? (
            <View style={styles.imageWrapper}>
              <Image
                source={{ uri: mainImage.remoteUrl || mainImage.localUri }}
                style={styles.mainImageCentered}
              />
              <TouchableOpacity style={styles.imageEditButton} onPress={() => imageModalRef.current?.open()}>
                <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noImagePlaceholderCentered}>
              <Text style={styles.noImageText}>No Main Image</Text>
              <TouchableOpacity onPress={() => imageModalRef.current?.open()} style={styles.uploadButton}>
                <Image source={require('@/assets/icons/upload.png')} style={styles.uploadIcon} />
                <Text style={styles.addImageButtonText}>Add Images</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Property Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Title</Text>
            <TouchableOpacity onPress={() => propertyInfoModalRef.current?.open()}>
              <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          <Text style={styles.infoText}>{propertyTitle}</Text>
        </View>

        {/* Pricing Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Pricing</Text>
            <TouchableOpacity onPress={() => pricingModalRef.current?.open()}>
              <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          {pricingRules ? (
            <View style={styles.infoBlock}>
              <Text>
                Base Price Per Night: {pricingRules.basePricePerNight} {property.currency || "EUR"}
              </Text>
              <Text>
                Weekend Price: {pricingRules.basePricePerNightWeekend} {property.currency || "EUR"}
              </Text>
              {pricingRules.weeklyDiscount !== undefined && <Text>Weekly Discount: {pricingRules.weeklyDiscount}%</Text>}
              {pricingRules.monthlyDiscount !== undefined && <Text>Monthly Discount: {pricingRules.monthlyDiscount}%</Text>}
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
            <Text style={styles.noInfoText}>No pricing details set.</Text>
          )}
        </View>

        {/* Booking Rules Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Booking Rules</Text>
            <TouchableOpacity onPress={() => bookingRulesModalRef.current?.open()}>
              <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          {bookingRules ? (
            <View style={styles.infoBlock}>
              <Text>Activate Instant Bookings: {bookingRules.instantBook ? "Yes" : "No"}</Text>
              <Text>Min Stay: {bookingRules.minStay} nights</Text>
              <Text>Max Stay: {bookingRules.maxStay} nights</Text>
              <Text>Advance Notice: {bookingRules.advanceNotice} days</Text>
            </View>
          ) : (
            <Text style={styles.noInfoText}>No booking rules set.</Text>
          )}
        </View>

        {/* Cancellation Policy Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Cancellation Policy</Text>
            <TouchableOpacity onPress={() => cancellationModalRef.current?.open()}>
              <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoBlock}>
            <Text>
              Current Policy: {getCancellationPolicyTitle(selectedCancellationPolicy).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* House Rules Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>House Rules</Text>
            <TouchableOpacity onPress={() => houseRulesModalRef.current?.open()}>
              <Image source={require('@/assets/icons/edit.png')} style={styles.editIcon} />
            </TouchableOpacity>
          </View>
          {houseRules ? (
            <View style={styles.infoBlock}>
              <Text>Check-In: {houseRules.checkIn}</Text>
              <Text>Check-Out: {houseRules.checkOut}</Text>
              <Text>Pets Allowed: {houseRules.petsAllowed ? "Yes" : "No"}</Text>
              <Text>Max Guests: {houseRules.guestsMax}</Text>
              <Text>Smoking Allowed: {houseRules.smokingAllowed ? "Yes" : "No"}</Text>
            </View>
          ) : (
            <Text style={styles.noInfoText}>No house rules set.</Text>
          )}
        </View>
      </ScrollView>

      {/* ------------------ Modals for Editing ------------------ */}

      {/* Modal for Editing Property Info */}
      <Modalize ref={propertyInfoModalRef} modalHeight={300}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.sheetTitle}>Edit Property Info</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Title:</Text>
            <TextInput
              style={styles.inputField}
              value={propertyTitle}
              placeholder="Enter title"
              onChangeText={setPropertyTitle}
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Description:</Text>
            <TextInput
              style={[styles.inputField, { height: 80 }]}
              value={propertyDescription}
              placeholder="Enter description"
              onChangeText={setPropertyDescription}
              multiline
            />
          </View>
          <SaveButton onPress={handleUpdatePropertyDetails} isSaving={isSavingPropertyInfo} title="Save" />
        </ScrollView>
      </Modalize>

      {/* Modal for Editing Pricing */}
      <Modalize ref={pricingModalRef} modalHeight={350}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.sheetTitle}>Edit Pricing</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Base Price/Night:</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.basePricePerNight}
              placeholder="Enter base price"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, basePricePerNight: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Weekend Price:</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.basePricePerNightWeekend}
              placeholder="Enter weekend price"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, basePricePerNightWeekend: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Weekly Discount (%):</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.weeklyDiscount}
              placeholder="Enter weekly discount"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, weeklyDiscount: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Monthly Discount (%):</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.monthlyDiscount}
              placeholder="Enter monthly discount"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, monthlyDiscount: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Cleaning Fee:</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.cleaningFee}
              placeholder="Enter cleaning fee"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, cleaningFee: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Pet Fee:</Text>
            <TextInput
              style={styles.inputField}
              value={pricingDetails.petFee}
              placeholder="Enter pet fee"
              keyboardType="numeric"
              onChangeText={(text) =>
                setPricingDetails((prev) => ({ ...prev, petFee: text }))
              }
            />
          </View>
          <SaveButton onPress={savePricingDetails} isSaving={isSavingPricing} title="Save Pricing" />
        </ScrollView>
      </Modalize>

      {/* Modal for Editing Booking Rules */}
      <Modalize ref={bookingRulesModalRef} modalHeight={350}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.sheetTitle}>Edit Booking Rules</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Min Stay (nights):</Text>
            <TextInput
              style={styles.inputField}
              value={bookingRulesDetails.minStay}
              placeholder="Enter min stay"
              keyboardType="numeric"
              onChangeText={(text) =>
                setBookingRulesDetails((prev) => ({ ...prev, minStay: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Max Stay (nights):</Text>
            <TextInput
              style={styles.inputField}
              value={bookingRulesDetails.maxStay}
              placeholder="Enter max stay"
              keyboardType="numeric"
              onChangeText={(text) =>
                setBookingRulesDetails((prev) => ({ ...prev, maxStay: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Advance Notice (days):</Text>
            <TextInput
              style={styles.inputField}
              value={bookingRulesDetails.advanceNotice}
              placeholder="Enter advance notice"
              keyboardType="numeric"
              onChangeText={(text) =>
                setBookingRulesDetails((prev) => ({ ...prev, advanceNotice: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Instant Book:</Text>
            <Switch
              value={bookingRulesDetails.instantBook}
              onValueChange={(val) =>
                setBookingRulesDetails((prev) => ({ ...prev, instantBook: val }))
              }
            />
          </View>
          <SaveButton onPress={saveBookingRulesDetails} isSaving={isSavingBookingRules} title="Save Booking Rules" />
        </ScrollView>
      </Modalize>

      {/* Modal for Editing Cancellation Policy */}
      <Modalize ref={cancellationModalRef} modalHeight={Dimensions.get("window").height * 0.9}>
        <View style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.cancellationModalContent}>
            <Text style={styles.sheetTitle}>Select Cancellation Policy</Text>
            {cancellationPolicyOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.policyCard,
                  option.key === selectedCancellationPolicy && styles.selectedPolicyCard,
                ]}
                onPress={() => setSelectedCancellationPolicy(option.key)}
              >
                <Text style={styles.policyTitle}>{option.title}</Text>
                <Text style={styles.policyDescription}>{option.description}</Text>
                <TouchableOpacity onPress={() => Linking.openURL(option.link)}>
                  <Text style={styles.policyLink}>View Full Policy</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.cancellationSaveContainer}>
            <SaveButton onPress={() => cancellationModalRef.current?.close()} isSaving={false} title="Save Policy" />
          </View>
        </View>
      </Modalize>

      {/* Modal for Editing House Rules */}
      <Modalize ref={houseRulesModalRef} modalHeight={350}>
        <ScrollView contentContainerStyle={styles.modalContent}>
          <Text style={styles.sheetTitle}>Edit House Rules</Text>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Check-In Time:</Text>
            <TextInput
              style={styles.inputField}
              value={houseRulesDetails.checkIn}
              placeholder="e.g. 3:00 PM"
              onChangeText={(text) =>
                setHouseRulesDetails((prev) => ({ ...prev, checkIn: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Check-Out Time:</Text>
            <TextInput
              style={styles.inputField}
              value={houseRulesDetails.checkOut}
              placeholder="e.g. 11:00 AM"
              onChangeText={(text) =>
                setHouseRulesDetails((prev) => ({ ...prev, checkOut: text }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Pets Allowed:</Text>
            <Switch
              value={houseRulesDetails.petsAllowed}
              onValueChange={(val) =>
                setHouseRulesDetails((prev) => ({ ...prev, petsAllowed: val }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Max Guests:</Text>
            <TextInput
              style={styles.inputField}
              value={houseRulesDetails.guestsMax.toString()}
              placeholder="Enter max guests"
              keyboardType="numeric"
              onChangeText={(text) =>
                setHouseRulesDetails((prev) => ({ ...prev, guestsMax: parseInt(text) || 0 }))
              }
            />
          </View>
          <View style={styles.inputRow}>
            <Text style={styles.inputLabel}>Smoking Allowed:</Text>
            <Switch
              value={houseRulesDetails.smokingAllowed}
              onValueChange={(val) =>
                setHouseRulesDetails((prev) => ({ ...prev, smokingAllowed: val }))
              }
            />
          </View>
          <SaveButton onPress={saveHouseRulesDetails} isSaving={isSavingHouseRules} title="Save House Rules" />
        </ScrollView>
      </Modalize>

      {/* Image Management Modal */}
      <Modalize
        ref={imageModalRef}
        modalHeight={Dimensions.get("window").height}
        modalStyle={styles.fullScreenModal}
        closeOnOverlayTap={false}
        panGestureEnabled={false}
      >
        <View style={{ flex: 1 }}>
          {/* Custom Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => imageModalRef.current?.close()}>
              <Image source={require('@/assets/icons/cross.png')} style={styles.modalCloseIcon} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Manage Images</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.modalContent, { flexGrow: 1 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Main Image Section */}
            <View style={styles.section}>
              {mainImage ? (
                <View style={styles.mainImageContainer}>
                  <Image
                    source={{ uri: mainImage.remoteUrl || mainImage.localUri }}
                    style={styles.mainImage}
                  />
                  <View style={styles.mainImageEditRow}>
                    <Text style={styles.replaceText}>Replace Main Image</Text>
                    <TouchableOpacity onPress={openMainImagePicker}>
                      <Image source={require('@/assets/icons/edit.png')} style={styles.editIconSmall} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.addMainImageButton} onPress={openMainImagePicker}>
                  <Image source={require('@/assets/icons/upload.png')} style={styles.uploadIcon} />
                  <Text style={styles.addImageButtonText}>Add Main Image</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Gallery Images Section */}
            <View style={[styles.section, { marginTop: 20 }]}>
              <ScrollView
                horizontal
                ref={galleryScrollRef}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.galleryScrollView}
              >
                {galleryImages.map((img) => (
                  <View key={img.localUri} style={styles.galleryCard}>
                    <Image
                      source={{ uri: img.remoteUrl || img.localUri }}
                      style={styles.galleryImage}
                    />
                    <TextInput
                      style={styles.galleryImageInput}
                      placeholder="Description"
                      value={img.description}
                      onChangeText={(text) => updateImageDescription(img.localUri, text)}
                    />
                    <TouchableOpacity
                      style={styles.galleryDeleteButton}
                      onPress={() =>
                        Alert.alert("Delete Image", "Are you sure you want to delete this image?", [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => {
                              setImages(images.filter((item) => item.localUri !== img.localUri));
                            },
                          },
                        ])
                      }
                    >
                      <Image source={require('@/assets/icons/trash.png')} style={styles.galleryDeleteIcon} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Add Gallery Card */}
                <TouchableOpacity style={styles.galleryCard} onPress={openGalleryImagePicker}>
                  <View style={styles.addGalleryCard}>
                    <Image source={require('@/assets/icons/upload.png')} style={styles.uploadIcon} />
                    <Text style={styles.addGalleryText}>Add Gallery Image</Text>
                  </View>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </ScrollView>
          <View style={styles.fixedSaveButtonContainer}>
            <SaveButton onPress={handleSaveImages} isSaving={isSavingImages} title="Save Images" />
          </View>
        </View>
      </Modalize>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  content: { paddingBottom: 32 },
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
  card: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", padding: 16, marginBottom: 20 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cardTitle: { fontSize: 18, fontWeight: "bold" },
  infoText: { fontSize: 16, color: "#333", marginTop: 8 },
  infoBlock: { marginBottom: 10 },
  noInfoText: { fontStyle: "italic", color: "#888", marginBottom: 10 },
  modalContent: { padding: 20 },
  sheetTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 20 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginVertical: 10 },
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
  galleryUploadIcon: { width: 20, height: 20, tintColor: "#70d7c7", marginRight: 5 },
  addGalleryText: { fontSize: 16, color: "#70d7c7" },
  fixedSaveButtonContainer: { padding: 20, backgroundColor: "#fff" },
  uploadIcon: { width: 20, height: 20, tintColor: "#70d7c7" },
  policyCard: { borderWidth: 1, borderColor: "#ccc", padding: 12, marginBottom: 10, borderRadius: 8 },
  selectedPolicyCard: { borderColor: "#70d7c7", backgroundColor: "#e6f7ff" },
  policyTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  policyDescription: { fontSize: 14, color: "#555" },
  // New styles for the Cancellation Policy modal:
  cancellationModalContent: {
    padding: 20,
    paddingBottom: 80, // Extra space for the save button
  },
  cancellationSaveContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
  },
  policyLink: {
    color: "#70d7c7",
    textDecorationLine: "underline",
    marginTop: 5,
  },
  // Styles for inline input rows in modals
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  inputLabel: {
    width: 130,
    fontSize: 16,
    color: "#333",
  },
  inputField: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
});

export default HostPropertyDetail;
