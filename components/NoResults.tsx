// app/components/NoResults.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface NoResultsProps {
  message: string;
}

const NoResults: React.FC<NoResultsProps> = ({ message }) => (
  <View style={styles.container}>
    <Text style={styles.message}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    // Center the content
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  message: {
    // Style the message text
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default NoResults;
