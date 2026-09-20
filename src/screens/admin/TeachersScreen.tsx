import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getTeachers, TeacherRow } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminTeachers'>;

export function TeachersScreen({ navigation }: Props) {
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTeachers();
    if (r.error) setError(r.error);
    else setTeachers(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <>
      <FlatList
        data={teachers}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No teachers yet. Promote a registered user to get started.
          </Text>
        }
        renderItem={({ item: t }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              !t.is_active && styles.cardInactive,
            ]}
            onPress={() => navigation.navigate('AdminTeacherDetail', { teacherId: t.id })}
          >
            <Text style={styles.name}>{t.user?.full_name ?? '—'}</Text>
            <Text style={styles.sub}>{t.user?.email}</Text>
            {!t.is_active && <Text style={styles.inactiveLabel}>Inactive</Text>}
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AdminPromoteTeacher')}
      >
        <Text style={styles.fabText}>+ Promote to teacher</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16, paddingBottom: 88 },
  error:         { color: '#b00020', padding: 16 },
  empty:         { color: '#666', textAlign: 'center', marginTop: 40, lineHeight: 22 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 16, marginBottom: 12, backgroundColor: '#fafafa',
  },
  cardPressed:   { backgroundColor: '#f0f0f0' },
  cardInactive:  { opacity: 0.5 },
  name:          { fontSize: 16, fontWeight: '600' },
  sub:           { color: '#666', marginTop: 2 },
  inactiveLabel: { color: '#b00020', fontSize: 12, marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  fabText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
