import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Platform,
  Pressable, StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { approveUser, getPendingUsers, PendingUserRow, rejectUser } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPendingApprovals'>;

export function PendingApprovalsScreen({ navigation }: Props) {
  const [users,   setUsers]   = useState<PendingUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getPendingUsers();
    if (r.error) setError(r.error);
    else setUsers(r.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const onApprove = async (user: PendingUserRow) => {
    const name = user.full_name ?? user.email;
    if (Platform.OS === 'web') {
      if (!window.confirm(`Approve ${name}?\nThey will be able to log in and use the app.`)) return;
      const r = await approveUser(user.id);
      if (r.error) window.alert(`Error: ${r.error}`);
      else load();
      return;
    }
    Alert.alert(
      `Approve ${name}?`,
      'They will be able to log in and use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            const r = await approveUser(user.id);
            if (r.error) Alert.alert('Error', r.error);
            else load();
          },
        },
      ],
    );
  };

  const onReject = async (user: PendingUserRow) => {
    const name = user.full_name ?? user.email;
    if (Platform.OS === 'web') {
      if (!window.confirm(`Delete account for ${name}?\nThis cannot be undone.`)) return;
      const r = await rejectUser(user.id);
      if (r.error) window.alert(`Error: ${r.error}`);
      else load();
      return;
    }
    Alert.alert(
      `Reject ${name}?`,
      'This will permanently delete their account. They can re-register if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: async () => {
            const r = await rejectUser(user.id);
            if (r.error) Alert.alert('Error', r.error);
            else load();
          },
        },
      ],
    );
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      contentContainerStyle={styles.list}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✓</Text>
          <Text style={styles.empty}>No pending registrations.</Text>
        </View>
      }
      renderItem={({ item: u }) => (
        <View style={styles.card}>
          <View style={styles.info}>
            <Text style={styles.name}>{u.full_name ?? '—'}</Text>
            <Text style={styles.email}>{u.email}</Text>
            <View style={styles.metaRow}>
              <View style={[styles.roleBadge, u.role === 'parent' ? styles.roleBadgeParent : styles.roleBadgeStudent]}>
                <Text style={styles.roleBadgeText}>{u.role}</Text>
              </View>
              <Text style={styles.date}>Registered {new Date(u.created_at).toLocaleDateString()}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.approveBtn]}
              onPress={() => onApprove(u)}
            >
              <Text style={styles.approveBtnText}>Approve</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.rejectBtn]}
              onPress={() => onReject(u)}
            >
              <Text style={styles.rejectBtnText}>Reject</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  center:         { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:           { padding: 16 },
  error:          { color: '#b00020', padding: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyIcon:      { fontSize: 32, color: '#22c55e', marginBottom: 8 },
  empty:          { color: '#666', fontSize: 16 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 12, backgroundColor: '#fafafa',
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  info:           { flex: 1 },
  name:           { fontWeight: '600', fontSize: 15 },
  email:          { color: '#555', marginTop: 2 },
  metaRow:        { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  date:           { color: '#aaa', fontSize: 12 },
  roleBadge:      { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roleBadgeStudent: { backgroundColor: '#e8f0fe' },
  roleBadgeParent:  { backgroundColor: '#fef3e2' },
  roleBadgeText:  { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: '#555' },
  actions:        { gap: 8 },
  btn: {
    borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, alignItems: 'center',
  },
  approveBtn:     { backgroundColor: '#1f2937' },
  approveBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  rejectBtn:      { borderWidth: 1, borderColor: '#b00020' },
  rejectBtnText:  { color: '#b00020', fontWeight: '600', fontSize: 13 },
});
