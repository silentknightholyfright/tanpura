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
import { getMyLessons, MyLessonRow } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'TeacherSchedule'>;

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const dayStr = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
  if (diff === 0) return `Today — ${dayStr}`;
  if (diff === 1) return `Tomorrow — ${dayStr}`;
  return dayStr;
}

function formatTime(t: string | null): string {
  if (!t) return '—';
  // t is "HH:MM:SS" or "HH:MM"
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? 'pm' : 'am';
  const h12 = hour % 12 || 12;
  return `${h12}:${m}${ampm}`;
}

interface GroupedLessons {
  date: string;
  label: string;
  lessons: MyLessonRow[];
}

function groupByDate(lessons: MyLessonRow[]): GroupedLessons[] {
  const map = new Map<string, MyLessonRow[]>();
  for (const lesson of lessons) {
    const existing = map.get(lesson.date) ?? [];
    existing.push(lesson);
    map.set(lesson.date, existing);
  }
  return Array.from(map.entries()).map(([date, ls]) => ({
    date,
    label: formatDate(date),
    lessons: ls,
  }));
}

function StatusChip({ status }: { status: string }) {
  const isDone = status === 'done';
  return (
    <View style={[styles.chip, isDone ? styles.chipDone : styles.chipScheduled]}>
      <Text style={[styles.chipText, isDone ? styles.chipTextDone : styles.chipTextScheduled]}>
        {isDone ? 'Done' : 'Upcoming'}
      </Text>
    </View>
  );
}

export function TeacherScheduleScreen({ navigation }: Props) {
  const { profile } = useAuth();
  const [lessons, setLessons] = useState<MyLessonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (showRefresh = false) => {
    if (!profile?.id) return;
    if (showRefresh) setRefreshing(true);
    else setLoading(true);

    const result = await getMyLessons(profile.id);
    if (result.error) {
      setError(result.error);
    } else {
      setLessons(result.data ?? []);
      setError(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const grouped = groupByDate(lessons);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => load()} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      {grouped.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No lessons in the next 14 days.</Text>
        </View>
      ) : (
        grouped.map(group => (
          <View key={group.date}>
            <Text style={styles.dateHeader}>{group.label}</Text>
            {group.lessons.map(lesson => (
              <Pressable
                key={lesson.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() =>
                  navigation.navigate('TeacherAttendance', {
                    instanceId: lesson.id,
                    templateId: lesson.template_id ?? '',
                    date: lesson.date,
                    startTime: lesson.start_time,
                    instrumentName: lesson.instrument?.name ?? '—',
                    lessonType: lesson.type,
                    room: lesson.room,
                    isDone: lesson.status === 'done',
                  })
                }
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardTime}>{formatTime(lesson.start_time)}</Text>
                    {lesson.duration_mins != null && (
                      <Text style={styles.cardDuration}>{lesson.duration_mins} min</Text>
                    )}
                  </View>
                  <View style={styles.cardMiddle}>
                    <Text style={styles.cardInstrument}>{lesson.instrument?.name ?? '—'}</Text>
                    <Text style={styles.cardMeta}>
                      {lesson.type ?? '—'}
                      {lesson.room ? ` · ${lesson.room}` : ''}
                    </Text>
                  </View>
                  <StatusChip status={lesson.status} />
                </View>
              </Pressable>
            ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  retryBtn: { padding: 10 },
  retryText: { color: '#1a73e8', fontWeight: '600' },
  empty: { alignItems: 'center', marginTop: 40 },
  emptyText: { color: '#666', fontSize: 15 },
  dateHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e8e8e8',
    padding: 14,
    marginBottom: 10,
  },
  cardPressed: { opacity: 0.75 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardLeft: { width: 60, alignItems: 'flex-start' },
  cardTime: { fontSize: 15, fontWeight: '600', color: '#111' },
  cardDuration: { fontSize: 12, color: '#888', marginTop: 2 },
  cardMiddle: { flex: 1 },
  cardInstrument: { fontSize: 15, fontWeight: '600', color: '#111' },
  cardMeta: { fontSize: 13, color: '#666', marginTop: 2 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  chipScheduled: { backgroundColor: '#e8f0fe' },
  chipDone: { backgroundColor: '#e6f4ea' },
  chipText: { fontSize: 12, fontWeight: '600' },
  chipTextScheduled: { color: '#1a73e8' },
  chipTextDone: { color: '#188038' },
});
