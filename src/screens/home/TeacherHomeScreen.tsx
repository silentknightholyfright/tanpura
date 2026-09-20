import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '@/lib/auth';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function TeacherHomeScreen({ navigation }: Props) {
  const { profile, signOut } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Welcome, {profile?.full_name ?? 'Teacher'}</Text>
      <Text style={styles.role}>Teacher</Text>

      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        onPress={() => navigation.navigate('TeacherSchedule')}
      >
        <Text style={styles.cardTitle}>My schedule</Text>
        <Text style={styles.cardSubtitle}>Upcoming lessons · mark attendance</Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>My students</Text>
        <Text style={styles.cardSubtitle}>Enrolled in your lessons</Text>
      </View>

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  greeting: { fontSize: 24, fontWeight: '700' },
  role: { color: '#666', marginBottom: 16 },
  card: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  cardPressed: { opacity: 0.75 },
  cardTitle: { fontSize: 16, fontWeight: '600' },
  cardSubtitle: { color: '#666', marginTop: 4 },
  signOut: { padding: 14, alignItems: 'center', marginTop: 24 },
  signOutText: { color: '#b00020', fontWeight: '600' },
});
