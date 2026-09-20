import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getStudent, StudentDetail, studentDisplayName, studentDisplayEmail, updateEnrolmentStatus, approveChildRequest } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminStudentDetail'>;

const DAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StudentDetailScreen({ route, navigation }: Props) {
  const { studentId } = route.params;
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getStudent(studentId);
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setStudent(result.data);
      navigation.setOptions({ title: studentDisplayName(result.data) });
    }
    setLoading(false);
  }, [studentId, navigation]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const unsub = navigation.addListener('focus', load); return unsub; }, [navigation, load]);

  const dropEnrolment = async (enrolmentId: string) => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Drop this enrolment? This will mark it as dropped.')) return;
      const r = await updateEnrolmentStatus(enrolmentId, 'dropped');
      if (r.error) window.alert(`Error: ${r.error}`);
      else load();
      return;
    }
    Alert.alert('Drop enrolment?', 'This will mark the enrolment as dropped.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Drop', style: 'destructive',
        onPress: async () => {
          const r = await updateEnrolmentStatus(enrolmentId, 'dropped');
          if (r.error) Alert.alert('Error', r.error);
          else load();
        },
      },
    ]);
  };

  const onApproveChild = async () => {
    if (!student) return;
    const confirm = Platform.OS === 'web'
      ? window.confirm('Approve this child? They will appear as an active student.')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Approve child?',
            'They will appear as an active student and can be enrolled in lessons.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Approve', onPress: () => resolve(true) },
            ],
          );
        });
    if (!confirm) return;
    const r = await approveChildRequest(student.id);
    if (r.error) {
      if (Platform.OS === 'web') window.alert(`Error: ${r.error}`);
      else Alert.alert('Error', r.error);
    } else {
      load();
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error || !student) return <Text style={styles.error}>{error ?? 'Not found'}</Text>;

  const { user, parent_links, enrolments } = student;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* Pending review banner */}
      {student.pending_review && (
        <View style={styles.pendingBanner}>
          <View style={styles.pendingBannerText}>
            <Text style={styles.pendingBannerTitle}>Pending parent submission</Text>
            <Text style={styles.pendingBannerBody}>
              This child was submitted by a parent and needs your approval before they can be enrolled in lessons.
            </Text>
          </View>
          <Pressable style={styles.approveBtn} onPress={onApproveChild}>
            <Text style={styles.approveBtnText}>Approve</Text>
          </Pressable>
        </View>
      )}

      {/* Profile */}
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <Row label="Name"  value={studentDisplayName(student)} />
        <Row label="Email" value={studentDisplayEmail(student)} />
        <Row label="Phone" value={user?.phone} />
        <Row label="DOB"   value={student.date_of_birth} />
        <Row label="Emergency contact" value={student.emergency_contact} />
      </View>

      {/* Parents */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Parents / guardians</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminParentForm', { studentId })}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {parent_links.length === 0
        ? <Text style={styles.empty}>No parents linked yet.</Text>
        : parent_links.map(({ parent, relationship, is_primary }) => (
          <Pressable
            key={parent.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('AdminParentForm', { studentId, parentId: parent.id })}
          >
            <Text style={styles.name}>{parent.full_name ?? '—'}</Text>
            <Text style={styles.sub}>{relationship}{is_primary ? ' · Primary' : ''}</Text>
            {parent.whatsapp_number ? <Text style={styles.sub}>WhatsApp: {parent.whatsapp_number}</Text> : null}
          </Pressable>
        ))
      }

      {/* Enrolments */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Enrolments</Text>
        <Pressable
          style={styles.addBtn}
          onPress={() => navigation.navigate('AdminEnrolmentForm', { studentId })}
        >
          <Text style={styles.addBtnText}>+ Add</Text>
        </Pressable>
      </View>

      {enrolments.length === 0
        ? <Text style={styles.empty}>No enrolments yet.</Text>
        : enrolments.map((e) => (
          <View key={e.id} style={[styles.card, e.status !== 'active' && styles.cardInactive]}>
            <Text style={styles.name}>{e.instrument?.name} · {e.grade?.label}</Text>
            <Text style={styles.sub}>Teacher: {e.teacher?.user?.full_name ?? '—'}</Text>
            <Text style={styles.sub}>Status: {e.status} · From {e.start_date}</Text>
            {e.status === 'active' && (
              <Pressable onPress={() => dropEnrolment(e.id)}>
                <Text style={styles.danger}>Drop enrolment</Text>
              </Pressable>
            )}
          </View>
        ))
      }
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:     { padding: 16 },
  error:         { color: '#b00020', padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 8 },
  sectionTitle:  { fontSize: 16, fontWeight: '700' },
  addBtn:        { backgroundColor: '#1f2937', borderRadius: 6, paddingVertical: 4, paddingHorizontal: 10 },
  addBtnText:    { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 10, backgroundColor: '#fafafa',
  },
  cardPressed:  { backgroundColor: '#f0f0f0' },
  cardInactive: { opacity: 0.55 },
  empty:        { color: '#aaa', marginBottom: 12 },
  name:         { fontWeight: '600', fontSize: 15 },
  sub:          { color: '#555', marginTop: 3 },
  danger:       { color: '#b00020', marginTop: 8, fontWeight: '600' },
  row:          { flexDirection: 'row', paddingVertical: 4 },
  rowLabel:     { width: 140, color: '#666' },
  pendingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fef3e2', borderRadius: 10,
    padding: 14, marginBottom: 16,
    borderWidth: 1, borderColor: '#f59e0b',
  },
  pendingBannerText:  { flex: 1 },
  pendingBannerTitle: { fontWeight: '700', color: '#92400e', marginBottom: 2 },
  pendingBannerBody:  { color: '#78350f', fontSize: 13, lineHeight: 18 },
  approveBtn:         { backgroundColor: '#1f2937', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 14 },
  approveBtnText:     { color: '#fff', fontWeight: '600', fontSize: 13 },
  rowValue:     { flex: 1, fontWeight: '500' },
});
