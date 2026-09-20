import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '@/lib/auth';
import { getMyChildren, ChildRow } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'Home'>;

export function ParentHomeScreen({ navigation }: Props) {
  const { profile, signOut } = useAuth();
  const [children,   setChildren]   = useState<ChildRow[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await getMyChildren();
    if (result.error) setError(result.error);
    else { setChildren(result.data ?? []); setError(null); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <Text style={styles.greeting}>Welcome, {profile?.full_name ?? 'Parent'}</Text>
      <Text style={styles.role}>Parent</Text>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My children</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('ParentAddChild')}
        >
          <Text style={styles.addBtnText}>+ Add child</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : children.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>No children linked yet</Text>
          <Text style={styles.emptyBody}>
            Tap "+ Add child" to submit your child's details for admin approval.
          </Text>
        </View>
      ) : (
        children.map(child => (
          <View key={child.student_id} style={styles.childCard}>
            <View style={styles.childHeader}>
              <Text style={styles.childName}>{child.full_name}</Text>
              {child.pending_review && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending approval</Text>
                </View>
              )}
            </View>
            {child.date_of_birth ? (
              <Text style={styles.childMeta}>DOB: {child.date_of_birth}</Text>
            ) : null}
            <Text style={styles.childMeta}>
              {child.relationship}{child.is_primary ? ' · Primary contact' : ''}
            </Text>
          </View>
        ))
      )}

      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:    { padding: 16 },
  greeting:     { fontSize: 24, fontWeight: '700' },
  role:         { color: '#666', marginBottom: 20 },
  sectionHeader:{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  addBtn:       { backgroundColor: '#1f2937', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  addBtnText:   { color: '#fff', fontSize: 13, fontWeight: '600' },
  errorText:    { color: '#b00020' },
  emptyCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    backgroundColor: '#fafafa',
  },
  emptyTitle:  { fontWeight: '600', fontSize: 15, marginBottom: 6 },
  emptyBody:   { color: '#666', lineHeight: 20 },
  childCard: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
    backgroundColor: '#fafafa',
  },
  childHeader:      { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  childName:        { fontSize: 16, fontWeight: '600' },
  childMeta:        { color: '#666', marginTop: 3, fontSize: 13 },
  pendingBadge:     { backgroundColor: '#fef3e2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  signOut:     { padding: 14, alignItems: 'center', marginTop: 32 },
  signOutText: { color: '#b00020', fontWeight: '600' },
});
