// components/Cards.tsx
import React from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from "react-native";
import { Models } from "react-native-appwrite";

// Placeholder image in case no images are provided.
const localPlaceholder = require("../assets/images/japan.png");

// Get screen width and set card width to 90% of the screen.
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.8;

interface CardProps {
  item: Models.Document & {
    images?: string[];
    description?: string;
    pricePerNight?: number;
  };
  onPress?: () => void;
}

/**
 * Card Component
 * - The card container is 90% of the screen width and centered.
 * - The image is displayed as a square (CARD_WIDTH x CARD_WIDTH) with curved corners.
 * - The property title, description, and price are shown underneath the image.
 */
export const Card: React.FC<CardProps> = React.memo(({ item, onPress }) => {
  let imageUrl = localPlaceholder;

  if (item.images && Array.isArray(item.images) && item.images.length > 0) {
    try {
      const parsedImages = item.images.map((imgString: string) => JSON.parse(imgString));
      // Use the image marked as main; if none, use the first image.
      const mainImg = parsedImages.find((img: any) => img.isMain) || parsedImages[0];
      if (mainImg) {
        imageUrl = { uri: mainImg.remoteUrl || mainImg.localUri };
      }
    } catch (error) {
      console.error("Error parsing images:", error);
    }
  }

  return (
    <TouchableOpacity style={styles.cardContainer} onPress={onPress} activeOpacity={0.9}>
      <Image
        source={imageUrl}
        style={styles.cardImage}
        resizeMode="cover"
        defaultSource={localPlaceholder}
        onError={() => console.log("Error loading image")}
      />
      <View style={styles.cardTextContainer}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description || "No description available"}
        </Text>
        <Text style={styles.cardPrice}>
          {item.pricePerNight != null ? `$${item.pricePerNight}/night` : "N/A"}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  cardContainer: {
    width: CARD_WIDTH,          // 90% of screen width
    alignSelf: "center",        // Center the card horizontally
    backgroundColor: "#fff",
    marginBottom: 20,
    marginTop: 20,            // Space below the card so the next card peeks in
  },
  cardImage: {
    width: "100%",
    height: CARD_WIDTH,         // Square image
    borderRadius: 15,
  },
  cardTextContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 16,
    color: "#666",
    marginBottom: 5,
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#70d7c7",
  },
});

export default { Card };
