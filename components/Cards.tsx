// components/Cards.tsx

import React from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { Models } from "react-native-appwrite";
import icons from "@/constants/icons";
import images from "@/constants/images";

const localPlaceholder = require("../assets/images/japan.png");

// Define the Props interface
interface CardProps {
  item: Models.Document & { media?: string[] };
  onPress?: () => void;
}

/** 
 * FeaturedCard: For your featured section
 */
export const FeaturedCard: React.FC<CardProps> = React.memo(({ item, onPress }) => {
  const imageUrl =
    Array.isArray(item.media) && item.media.length > 0
      ? { uri: item.media[0] }
      : localPlaceholder;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.featuredCardContainer}
      accessibilityLabel={`View details for ${item.name}`}
    >
      <Image
        source={imageUrl}
        style={styles.featuredImage}
        defaultSource={localPlaceholder}
        onError={() =>
          console.log(`❌ FeaturedCard image failed to load: ${item.media?.[0]}`)
        }
      />

      <Image source={images.cardGradient} style={styles.featuredGradient} resizeMode="cover" />

      {item.rating != null && (
        <View style={styles.ratingBadge}>
          <Image source={icons.star} style={styles.starIcon} />
          <Text style={styles.ratingText}>
            {typeof item.rating === "number" ? item.rating.toFixed(1) : "N/A"}
          </Text>
        </View>
      )}

      <View style={styles.featuredDetails}>
        <Text style={styles.featuredName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.featuredAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.featuredPriceHeart}>
          <Text style={styles.featuredPrice}>${item.pricePerNight}</Text>
          <Image source={icons.heart} style={styles.heartIcon} tintColor="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

/**
 * Card: Standard property card
 */
export const Card: React.FC<CardProps> = React.memo(({ item, onPress }) => {
  const imageUrl =
    Array.isArray(item.media) && item.media.length > 0
      ? { uri: item.media[0] }
      : localPlaceholder;

  return (
    <TouchableOpacity
      style={styles.cardContainer}
      onPress={onPress}
      accessibilityLabel={`View details for ${item.name}`}
      activeOpacity={0.8}
    >
      {item.rating != null && (
        <View style={styles.ratingBadgeCard}>
          <Image source={icons.star} style={styles.starIcon} />
          <Text style={styles.ratingTextCard}>
            {typeof item.rating === "number" ? item.rating.toFixed(1) : "N/A"}
          </Text>
        </View>
      )}

      <Image
        source={imageUrl}
        style={styles.cardImage}
        defaultSource={localPlaceholder}
        onError={() =>
          console.log(`❌ Card image failed to load: ${item.media?.[0]}`)
        }
      />

      <View style={styles.cardDetails}>
        <Text style={styles.cardName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.cardAddress} numberOfLines={1}>
          {item.address}
        </Text>
        <View style={styles.cardPriceHeart}>
          <Text style={styles.cardPrice}>
            {item.pricePerNight != null ? `$${item.pricePerNight}/night` : "N/A"}
          </Text>
          <Image source={icons.heart} style={styles.heartIconCard} tintColor="#191D31" />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  featuredCardContainer: {
    width: 150,
    height: 220,
    marginRight: 10,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  featuredImage: {
    width: "100%",
    height: "70%",
  },
  featuredGradient: {
    position: "absolute",
    width: "100%",
    height: "70%",
    bottom: 0,
  },
  ratingBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
  },
  starIcon: {
    width: 14,
    height: 14,
    resizeMode: "contain",
  },
  ratingText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  featuredDetails: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  featuredName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  featuredAddress: {
    fontSize: 12,
    color: "#fff",
    marginTop: 2,
  },
  featuredPriceHeart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  featuredPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#fff",
  },
  heartIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },

  cardContainer: {
    flex: 1,
    marginVertical: 10,
    marginHorizontal: 5,
    borderRadius: 15,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  ratingBadgeCard: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    zIndex: 1,
  },
  ratingTextCard: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
  cardImage: {
    width: "100%",
    height: 150,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    resizeMode: "cover",
  },
  cardDetails: {
    position: "absolute",
    bottom: 10,
    left: 10,
    right: 10,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  cardAddress: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  cardPriceHeart: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#70d7c7",
  },
  heartIconCard: {
    width: 18,
    height: 18,
    resizeMode: "contain",
  },
});

export default Card;
