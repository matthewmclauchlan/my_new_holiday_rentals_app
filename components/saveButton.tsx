// components/SaveButton.tsx
import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from "react-native";

interface SaveButtonProps {
  onPress: () => Promise<void>;
  isSaving: boolean;
  title: string;
}

const SaveButton: React.FC<SaveButtonProps> = ({ onPress, isSaving, title }) => {
  const handlePress = async () => {
    try {
      await onPress();
    } catch (error) {
      console.error("Error in SaveButton onPress:", error);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, isSaving && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={isSaving}
    >
      {isSaving ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#70d7c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  text: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default SaveButton;
