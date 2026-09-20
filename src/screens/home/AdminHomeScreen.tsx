import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '@/lib/auth';
import { getPendingUsers } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

const SECTIONS: Array<{
  title: string;
  subtitle: string;
  screen: keyof AppStackParamList | null;
}> = [
  { title: 'Students',         subtitle: 'Profiles, parents, enrolments',  screen: 'AdminStudents' },
  { title: 'Lesson templates', subtitle: 'Recurring weekly schedule',       screen: 'AdminLessonTemplates' },
  { title: 'Teachers',         subtitle: 'Bios and assigned lessons',       screen: 'AdminTeachers' },
  { title: 'Pricing',          subtitle: 'Rates by instrument and teacher', screen: 'AdminPricing' },
  { title: 'Catalogue',        subtitle: 'Instruments and OFAAL grades',    screen: null },
];

export function AdminHomeScreen({ navigation }: Props) {
  const { profile, signOut } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);

  const loadPending = useCallback(async () => {
    const r = await getPendingUsers();
    if (!r.error) setPendingCount(r.data.length);
  }, []);

  useEffect(() => { loadPending(); }, [loadPending]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', loadPending);
    return unsub;
  }, [navigation, loadPending]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Welcome, {profile?.full_name ?? 'Admin'}</Text>
      <Text style={styles.role}>Administrator</Text>

      {/* Pending approvals — shown prominently when there are registrations to review */}
      <Pressable
        style={({ pressed }) => [
          styles.card,
          styles.approvalCard,
          pressed && styles.cardPressed,
          pendingCount === 0 && styles.approvalCardEmpty,
        ]}
        onPress={() => navigation.navigate('AdminPendingApprovals')}
      >
        <View style={styles.approvalRow}>
          <Text style={[styles.cardTitle, pendingCount > 0 && styles.approvalTitleActive]}>
            Pending approvals
          </Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.cardSubtitle}>
          {pendingCount > 0
            ? `${pendingCount} student${pendingCount !== 1 ? 's' : ''} waiting for approval`
            : 'No pending registrations'}
        </Text>
      </Pressable>

      {SECTIONS.map((s) => (
        <Pressable
          key={s.title}
          style={({ pressed }) => [
            styles.card,
            pressed && styles.cardPressed,
            !s.screen && styles.cardDisabled,
          ]}
          onPress={() => s.screen && navigation.navigate(s.screen as any)}
          disabled={!s.screen}
        >
          <Text style={styles.cardTitle}>{s.title}</Text>
          <Text style={styles.cardSubtitle}>{s.subtitle}</Text>
          {!s.screen && <Text style={styles.comingSoon}>Coming soon</Text>}
        </Pressable>
      ))}

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:           { padding: 16 },
  greeting:            { fontSize: 24, fontWeight: '700' },
  role:                { color: '#666', marginBottom: 16 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 16, marginBottom: 12, backgroundColor: '#fafafa',
  },
  cardPressed:         { backgroundColor: '#f0f0f0' },
  cardDisabled:        { opacity: 0.5 },
  cardTitle:           { fontSize: 16, fontWeight: '600' },
  cardSubtitle:        { color: '#666', marginTop: 4 },
  comingSoon:          { color: '#aaa', fontSize: 12, marginTop: 4 },
  approvalCard:        { borderColor: '#e5e7eb' },
  approvalCardEmpty:   { opacity: 0.6 },
  approvalRow:         { flexDirection: 'row', alignItems: 'center', gap: 8 },
  approvalTitleActive: { color: '#1f2937' },
  badge: {
    backgroundColor: '#b00020', borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 2,
  },
  badgeText:           { color: '#fff', fontSize: 12, fontWeight: '700' },
  signOut:             { padding: 14, alignItems: 'center', marginTop: 24 },
  signOutText:         { color: '#b00020', fontWeight: '600' },
});
