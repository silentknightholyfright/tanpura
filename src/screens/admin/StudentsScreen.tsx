import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getStudents, StudentRow, studentDisplayName, studentDisplayEmail } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminStudents'>;

export function StudentsScreen({ navigation }: Props) {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getStudents();
    if (result.error) setError(result.error);
    else setStudents(result.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Refresh when returning from add/detail screen
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <>
      <FlatList
        data={students}
        keyExtractor={(s) => s.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No students yet. Add them directly or approve registrations from the Pending Approvals screen.
          </Text>
        }
        renderItem={({ item: s }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('AdminStudentDetail', { studentId: s.id })}
          >
            <View style={styles.nameRow}>
              <Text style={styles.name}>{studentDisplayName(s)}</Text>
              {s.pending_review && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              )}
            </View>
            <Text style={styles.sub}>{studentDisplayEmail(s) ?? '—'}</Text>
            {!s.user && (
              <Text style={styles.noAccount}>No app account</Text>
            )}
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AdminAddStudent')}
      >
        <Text style={styles.fabText}>+ Add student</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:        { padding: 16, paddingBottom: 88 },
  error:       { color: '#b00020', padding: 16 },
  empty:       { color: '#666', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 16, marginBottom: 12, backgroundColor: '#fafafa',
  },
  cardPressed:      { backgroundColor: '#f0f0f0' },
  nameRow:          { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name:             { fontSize: 16, fontWeight: '600' },
  sub:              { color: '#666', marginTop: 2 },
  noAccount:        { color: '#b06000', fontSize: 12, marginTop: 4, fontWeight: '500' },
  pendingBadge:     { backgroundColor: '#fef3e2', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  pendingBadgeText: { fontSize: 11, fontWeight: '700', color: '#92400e', textTransform: 'uppercase' },
  fab: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  fabText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
