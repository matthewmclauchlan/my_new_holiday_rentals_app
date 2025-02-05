import React, { useState } from 'react';
import { 
  SafeAreaView, 
  ScrollView, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { useGlobalContext } from '../../global-provider';
import { useRouter } from 'expo-router';
import icons from '@/constants/icons';

const statusFilters = ['Upcoming', 'Current', 'Check Out'];

const HostDashboard = () => {
  const { user } = useGlobalContext();
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState('Upcoming');

  // Dummy next stay data – replace with real API data as needed.
  const nextStay = {
    guestName: 'John Doe',
    propertyName: 'Sunny Apartment',
    checkIn: '2025-03-01',
    checkOut: '2025-03-05',
    // For example, if the check-in is late, we show a warning.
    checkInStatus: 'Late' // or 'On Time'
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Welcome Header */}
        <View style={styles.header}>
          <Text style={styles.welcomeText}>
            Welcome back, {user ? user.name : 'Host'}!
          </Text>
        </View>

        {/* Status Filter */}
        <View style={styles.filterContainer}>
          {statusFilters.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterButton,
                selectedStatus === status && styles.activeFilterButton,
              ]}
              onPress={() => setSelectedStatus(status)}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  selectedStatus === status && styles.activeFilterButtonText,
                ]}
              >
                {status}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Next Stay Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next Stay</Text>
          <Text style={styles.cardText}>Guest: {nextStay.guestName}</Text>
          <Text style={styles.cardText}>Property: {nextStay.propertyName}</Text>
          <Text style={styles.cardText}>Check-in: {nextStay.checkIn}</Text>
          <Text style={styles.cardText}>Check-out: {nextStay.checkOut}</Text>
          <View style={styles.cardFooter}>
            <TouchableOpacity
              style={styles.outlinedButton}
              onPress={() => router.push('/(host)/hostTabs/messages')}
            >
              <Text style={styles.outlinedButtonText}>Message Guest</Text>
            </TouchableOpacity>
            <View style={styles.statusIndicator}>
              <Text style={styles.statusText}>
                {nextStay.checkInStatus === 'Late' ? '⚠️ Late' : '✔️ On Time'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: '#0061FF',
  },
  filterButtonText: {
    color: '#333',
    fontSize: 16,
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  cardText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#555',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  outlinedButton: {
    borderWidth: 1,
    borderColor: '#0061FF',
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  outlinedButtonText: {
    color: '#0061FF',
    fontSize: 16,
  },
  statusIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#d32f2f',
  },
});

export default HostDashboard;
