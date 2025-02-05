// app/(guest)/terms-of-service.tsx
import React from "react";
import { SafeAreaView, ScrollView, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";

export default function TermsOfService() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.heading}>Terms of Service</Text>
        <Text style={styles.body}>
          Last Updated: [Insert Date]
          {"\n\n"}
          Please read these Terms of Service ("Terms", "Terms of Service") carefully before using our application ("Service").
          {"\n\n"}
          1. Acceptance of Terms
          {"\n"}
          By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of the Terms, then you may not access the Service.
          {"\n\n"}
          2. Use of the Service
          {"\n"}
          You agree to use the Service only for lawful purposes and in a way that does not infringe on the rights of others.
          {"\n\n"}
          3. Intellectual Property
          {"\n"}
          All content included in the Service, including text, graphics, logos, images, and software, is the property of [Your Company Name] or its licensors and is protected by international copyright laws.
          {"\n\n"}
          4. Disclaimer
          {"\n"}
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis. [Your Company Name] disclaims all warranties, express or implied.
          {"\n\n"}
          5. Limitation of Liability
          {"\n"}
          In no event shall [Your Company Name] be liable for any indirect, incidental, special, consequential, or punitive damages.
          {"\n\n"}
          6. Governing Law
          {"\n"}
          These Terms shall be governed and construed in accordance with the laws of [Your State/Country].
          {"\n\n"}
          7. Changes to Terms
          {"\n"}
          We reserve the right to modify these Terms at any time. It is your responsibility to review these Terms periodically.
          {"\n\n"}
          8. Contact Us
          {"\n"}
          If you have any questions about these Terms, please contact us at: your-email@example.com.
        </Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back to Signup</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scrollContainer: { padding: 20 },
  heading: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  body: { fontSize: 16, lineHeight: 24 },
  backButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#70d7c7",
    borderRadius: 8,
    alignItems: "center",
  },
  backButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});
