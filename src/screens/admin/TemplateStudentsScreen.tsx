import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable,
  SectionList, StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  addStudentToTemplate, getEligibleEnrolments, getTemplateEnrolments,
  removeStudentFromTemplate, EnrolmentRow, TemplateEnrolmentRow,
} from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminTemplateStudents'>;

export function TemplateStudentsScreen({ route, navigation }: Props) {
  const { templateId, instrumentId } = route.params;

  const [assigned,  setAssigned]  = useState<TemplateEnrolmentRow[]>([]);
  const [eligible,  setEligible]  = useState<EnrolmentRow[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [aRes, eRes] = await Promise.all([
      getTemplateEnrolments(templateId),
      getEligibleEnrolments(templateId, instrumentId),
    ]);
    if (aRes.error || eRes.error) { setError(aRes.error ?? eRes.error!); setLoading(false); return; }
    setAssigned(aRes.data);
    setEligible(eRes.data);
    setLoading(false);
  }, [templateId, instrumentId]);

  useEffect(() => { load(); }, [load]);

  const onAdd = async (enrolmentId: string) => {
    const r = await addStudentToTemplate(templateId, enrolmentId);
    if (r.error) { Alert.alert('Error', r.error); return; }
    load();
  };

  const onRemove = (enrolmentId: string, name: string) => {
    Alert.alert(`Remove ${name}?`, 'They will no longer be on this template.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          const r = await removeStudentFromTemplate(templateId, enrolmentId);
          if (r.error) Alert.alert('Error', r.error);
          else load();
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  const sections = [
    {
      title: `Assigned (${assigned.length})`,
      data: assigned,
      key: 'assigned',
    },
    {
      title: `Add students (${eligible.length} eligible)`,
      data: eligible,
      key: 'eligible',
    },
  ];

  return (
    <SectionList
      contentContainerStyle={styles.list}
      sections={[
        { title: `Assigned (${assigned.length})`, data: assigned, type: 'assigned' as const },
        { title: `Add students — ${eligible.length} eligible`, data: eligible, type: 'eligible' as const },
      ]}
      keyExtractor={(item, i) => ('enrolment_id' in item ? item.enrolment_id : (item as EnrolmentRow).id) + i}
      renderSectionHeader={({ section }) => (
        <Text style={styles.sectionTitle}>{section.title}</Text>
      )}
      renderItem={({ item, section }) => {
        if (section.type === 'assigned') {
          const row = item as TemplateEnrolmentRow;
          const name = row.enrolment?.student?.user?.full_name ?? '—';
          return (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={styles.flex1}>
                  <Text style={styles.name}>{name}</Text>
                  <Text style={styles.sub}>{row.enrolment?.grade?.label}</Text>
                </View>
                <Pressable onPress={() => onRemove(row.enrolment_id, name)}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          );
        } else {
          const row = item as EnrolmentRow;
          const name = (row as any).student?.user?.full_name ?? '—';
          return (
            <Pressable
              style={({ pressed }) => [styles.card, styles.cardEligible, pressed && styles.cardPressed]}
              onPress={() => onAdd(row.id)}
            >
              <Text style={styles.name}>{name}</Text>
              <Text style={styles.sub}>{row.grade?.label} · tap to add</Text>
            </Pressable>
          );
        }
      }}
      ListEmptyComponent={<Text style={styles.empty}>No eligible students found for this instrument.</Text>}
    />
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { padding: 16 },
  error:         { color: '#b00020', padding: 16 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', marginTop: 16, marginBottom: 8, color: '#333' },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 10, backgroundColor: '#fafafa',
  },
  cardEligible:  { borderStyle: 'dashed', borderColor: '#d1d5db' },
  cardPressed:   { backgroundColor: '#f0f0f0' },
  row:           { flexDirection: 'row', alignItems: 'center' },
  flex1:         { flex: 1 },
  name:          { fontWeight: '600', fontSize: 15 },
  sub:           { color: '#555', marginTop: 2 },
  removeText:    { color: '#b00020', fontWeight: '600', paddingLeft: 12 },
  empty:         { color: '#aaa', textAlign: 'center', marginTop: 32 },
});
