import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, ScrollView,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  createEnrolment, getGrades, getInstruments, getTeachers,
  GradeRow, InstrumentRow, TeacherRow,
} from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminEnrolmentForm'>;

export function EnrolmentFormScreen({ route, navigation }: Props) {
  const { studentId } = route.params;

  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [teachers,    setTeachers]    = useState<TeacherRow[]>([]);
  const [grades,      setGrades]      = useState<GradeRow[]>([]);

  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRow | null>(null);
  const [selectedTeacher,    setSelectedTeacher]    = useState<TeacherRow | null>(null);
  const [selectedGrade,      setSelectedGrade]      = useState<GradeRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      const [iRes, tRes] = await Promise.all([getInstruments(), getTeachers()]);
      if (iRes.error || tRes.error) { Alert.alert('Error', iRes.error ?? tRes.error!); return; }
      setInstruments(iRes.data);
      setTeachers(tRes.data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!selectedInstrument) { setGrades([]); setSelectedGrade(null); return; }
    (async () => {
      const r = await getGrades(selectedInstrument.id);
      if (r.error) { Alert.alert('Error', r.error); return; }
      setGrades(r.data);
      setSelectedGrade(null);
    })();
  }, [selectedInstrument]);

  const onSave = async () => {
    if (!selectedInstrument || !selectedTeacher || !selectedGrade) {
      Alert.alert('Incomplete', 'Please select instrument, teacher, and grade.');
      return;
    }
    setSaving(true);
    const r = await createEnrolment({
      student_id:    studentId,
      teacher_id:    selectedTeacher.id,
      instrument_id: selectedInstrument.id,
      grade_id:      selectedGrade.id,
      start_date:    new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    if (r.error) { Alert.alert('Error', r.error); return; }
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <Section title="Instrument">
        {instruments.map((i) => (
          <Chip
            key={i.id}
            label={i.name}
            active={selectedInstrument?.id === i.id}
            onPress={() => setSelectedInstrument(i)}
          />
        ))}
      </Section>

      <Section title="Teacher">
        {teachers.map((t) => (
          <Chip
            key={t.id}
            label={t.user?.full_name ?? t.id}
            active={selectedTeacher?.id === t.id}
            onPress={() => setSelectedTeacher(t)}
          />
        ))}
      </Section>

      <Section title="Grade">
        {grades.length === 0
          ? <Text style={styles.hint}>Select an instrument first</Text>
          : grades.map((g) => (
            <Chip
              key={g.id}
              label={g.label}
              active={selectedGrade?.id === g.id}
              onPress={() => setSelectedGrade(g)}
            />
          ))
        }
      </Section>

      <Pressable
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={onSave}
        disabled={saving}
      >
        <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Create enrolment'}</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.chipRow}>{children}</View>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { padding: 16 },
  section:         { marginBottom: 20 },
  sectionTitle:    { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  chipActive:      { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  chipText:        { color: '#333', fontSize: 14 },
  chipTextActive:  { color: '#fff', fontWeight: '600' },
  hint:            { color: '#aaa', fontStyle: 'italic' },
  saveBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 16,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
});
