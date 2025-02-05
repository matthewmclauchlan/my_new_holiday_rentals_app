// app/(guest)/applicationProcessing.tsx
import React from 'react';
import { SafeAreaView, ScrollView, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';

export default function ApplicationProcessing() {
  const router = useRouter();

  const handleReturn = () => {
    // Navigate to your host profile screen. Adjust the path as needed.
    router.push('/(guest)/guestTabs');
  };

  const handleContactPress = () => {
    // Open the user's mail client with a preset email address.
    Linking.openURL('mailto:contact@example.com');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Application Processing</Text>
        <Text style={styles.body}>
          Thank you for submitting your host application. Our team is currently reviewing your information and verifying your credentials. This process may take up to 48 hours.
        </Text>
        <Text style={styles.body}>
          We appreciate your patience during this time. If you have any questions or need further assistance, please feel free to contact us at{' '}
          <Text style={styles.email} onPress={handleContactPress}>
            contact@example.com
          </Text>.
        </Text>
        <Text style={styles.body}>
          Once your application is approved, you will be notified via email. You can also return to your host profile at any time.
        </Text>
        <Pressable style={styles.returnButton} onPress={handleReturn}>
          <Text style={styles.returnButtonText}>All done</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  email: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  returnButton: {
    backgroundColor: '#70d7c7',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  returnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
