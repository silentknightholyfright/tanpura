import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getInstanceStudents, upsertAttendance, markInstanceDone, AttendanceStudent } from '@/lib/api';
import { AttendanceStatus } from '@/lib/types';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'TeacherAttendance'>;

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; bg: string }[] = [
  { value: 'present', label: 'Present', color: '#188038', bg: '#e6f4ea' },
  { value: 'late',    label: 'Late',    color: '#b06000', bg: '#fef7e0' },
  { value: 'absent',  label: 'Absent',  color: '#b00020', bg: '#fce8e6' },
];

function StatusToggle({
  current,
  onChange,
  disabled,
}: {
  current: AttendanceStatus | null;
  onChange: (s: AttendanceStatus) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      {STATUS_OPTIONS.map(opt => {
        const active = current === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => !disabled && onChange(opt.value)}
            style={[
              styles.toggleBtn,
              active && { backgroundColor: opt.bg, borderColor: opt.color },
            ]}
          >
            <Text style={[styles.toggleText, active && { color: opt.color, fontWeight: '700' }]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function formatTime(t: string | null): string {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m}${hour >= 12 ? 'pm' : 'am'}`;
}

export function AttendanceScreen({ route, navigation }: Props) {
  const { instanceId, templateId, date, startTime, instrumentName, lessonType, room, isDone } =
    route.params;

  const [students, setStudents] = useState<AttendanceStudent[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus | null>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!templateId) {
      setError('One-off lessons not yet supported for attendance.');
      setLoading(false);
      return;
    }
    setLoading(true);
    const result = await getInstanceStudents(instanceId, templateId);
    if (result.error) {
      setError(result.error);
    } else {
      const list = result.data ?? [];
      setStudents(list);
      const initial: Record<string, AttendanceStatus | null> = {};
      for (const s of list) initial[s.studentId] = s.status;
      setStatuses(initial);
      setError(null);
    }
    setLoading(false);
  }, [instanceId, templateId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    // Require every student to be marked
    const unmarked = students.filter(s => statuses[s.studentId] == null);
    if (unmarked.length > 0) {
      Alert.alert(
        'Incomplete',
        `Please mark attendance for: ${unmarked.map(s => s.fullName).join(', ')}`,
      );
      return;
    }

    setSaving(true);
    const errors: string[] = [];

    for (const student of students) {
      const status = statuses[student.studentId];
      if (!status) continue;
      const r = await upsertAttendance({
        instance_id: instanceId,
        student_id: student.studentId,
        status,
      });
      if (r.error) errors.push(`${student.fullName}: ${r.error}`);
    }

    if (errors.length > 0) {
      setSaving(false);
      Alert.alert('Save failed', errors.join('\n'));
      return;
    }

    // Mark the lesson done
    const doneResult = await markInstanceDone(instanceId);
    setSaving(false);

    if (doneResult.error) {
      Alert.alert('Warning', `Attendance saved but could not mark lesson done: ${doneResult.error}`);
    } else {
      Alert.alert('Saved', 'Attendance recorded.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const allMarked = students.length > 0 && students.every(s => statuses[s.studentId] != null);

  // ── Render ──────────────────────────────────────────────────────────────────

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
        <Pressable onPress={load} style={styles.retryBtn}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Lesson header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{instrumentName}</Text>
        <Text style={styles.headerMeta}>
          {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
            weekday: 'long', day: 'numeric', month: 'long',
          })}
          {startTime ? `  ·  ${formatTime(startTime)}` : ''}
          {lessonType ? `  ·  ${lessonType}` : ''}
          {room ? `  ·  ${room}` : ''}
        </Text>
        {isDone && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Already marked done</Text>
          </View>
        )}
      </View>

      {/* Student list */}
      {students.length === 0 ? (
        <Text style={styles.emptyText}>No students enrolled in this lesson.</Text>
      ) : (
        students.map(student => (
          <View key={student.studentId} style={styles.studentCard}>
            <Text style={styles.studentName}>{student.fullName}</Text>
            <StatusToggle
              current={statuses[student.studentId] ?? null}
              onChange={status =>
                setStatuses(prev => ({ ...prev, [student.studentId]: status }))
              }
              disabled={isDone}
            />
          </View>
        ))
      )}

      {/* Save button — only if not already done and there are students */}
      {!isDone && students.length > 0 && (
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, (!allMarked || saving) && styles.saveBtnDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>
              {allMarked ? 'Save & mark done' : 'Mark all students first'}
            </Text>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: '#b00020', marginBottom: 12, textAlign: 'center' },
  retryBtn: { padding: 10 },
  retryText: { color: '#1a73e8', fontWeight: '600' },

  header: {
    backgroundColor: '#f0f4ff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
  headerMeta: { fontSize: 13, color: '#555', marginTop: 4 },
  doneBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ea',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  doneBadgeText: { fontSize: 12, fontWeight: '600', color: '#188038' },

  emptyText: { color: '#888', textAlign: 'center', marginTop: 32, fontSize: 15 },

  studentCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  studentName: { fontSize: 15, fontWeight: '600', color: '#111', marginBottom: 10 },

  toggleRow: { flexDirection: 'row', gap: 8 },
  toggleBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#ddd',
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  toggleText: { fontSize: 13, color: '#666' },

  saveBtn: {
    marginTop: 24,
    backgroundColor: '#1a73e8',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#aaa' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
