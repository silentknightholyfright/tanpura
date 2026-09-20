import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Pressable,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getLessonTemplates, LessonTemplateRow } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminLessonTemplates'>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatTime(t: string) {
  // t is HH:MM:SS — return HH:MM
  return t.slice(0, 5);
}

export function LessonTemplatesScreen({ navigation }: Props) {
  const [templates, setTemplates] = useState<LessonTemplateRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getLessonTemplates();
    if (r.error) setError(r.error);
    else setTemplates(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', load); return unsub; }, [navigation, load]);

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <>
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No lesson templates yet.</Text>}
        renderItem={({ item: t }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              pressed && styles.cardPressed,
              !t.is_active && styles.cardInactive,
            ]}
            onPress={() => navigation.navigate('AdminLessonTemplateForm', { templateId: t.id })}
          >
            <View style={styles.row}>
              <Text style={styles.day}>{DAYS[t.day_of_week]}</Text>
              <Text style={styles.time}>{formatTime(t.start_time)}</Text>
              <Text style={styles.badge}>{t.type}</Text>
            </View>
            <Text style={styles.name}>{t.instrument?.name}</Text>
            <Text style={styles.sub}>Teacher: {t.teacher?.user?.full_name ?? '—'}</Text>
            <Text style={styles.sub}>{t.duration_mins} min · max {t.max_capacity} students{t.room ? ` · ${t.room}` : ''}</Text>
            {!t.is_active && <Text style={styles.inactive}>Inactive</Text>}
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AdminLessonTemplateForm', {})}
      >
        <Text style={styles.fabText}>+ New template</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  center:      { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:        { padding: 16, paddingBottom: 88 },
  error:       { color: '#b00020', padding: 16 },
  empty:       { color: '#666', textAlign: 'center', marginTop: 40 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 12, backgroundColor: '#fafafa',
  },
  cardPressed: { backgroundColor: '#f0f0f0' },
  cardInactive:{ opacity: 0.5 },
  row:         { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  day:         { fontWeight: '700', fontSize: 15, width: 36 },
  time:        { fontSize: 14, color: '#333' },
  badge: {
    backgroundColor: '#e5e7eb', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2, fontSize: 12, color: '#374151',
  },
  name:        { fontWeight: '600', fontSize: 15 },
  sub:         { color: '#555', marginTop: 2 },
  inactive:    { color: '#b00020', fontSize: 12, marginTop: 4 },
  fab: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  fabText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
