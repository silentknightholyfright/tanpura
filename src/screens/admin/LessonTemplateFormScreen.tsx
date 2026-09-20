import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  createLessonTemplate, getLessonTemplates, getInstruments, getTeachers,
  updateLessonTemplate, InstrumentRow, LessonTemplateRow, TeacherRow,
} from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';
import { LessonType } from '@/lib/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminLessonTemplateForm'>;

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function LessonTemplateFormScreen({ route, navigation }: Props) {
  const { templateId } = route.params;
  const isEdit = !!templateId;

  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [teachers,    setTeachers]    = useState<TeacherRow[]>([]);

  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRow | null>(null);
  const [selectedTeacher,    setSelectedTeacher]    = useState<TeacherRow | null>(null);
  const [type,               setType]               = useState<LessonType>('group');
  const [dayOfWeek,          setDayOfWeek]          = useState(0);
  const [startTime,          setStartTime]          = useState('09:00');
  const [durationMins,       setDurationMins]       = useState('45');
  const [room,               setRoom]               = useState('');
  const [maxCapacity,        setMaxCapacity]        = useState('10');
  const [isActive,           setIsActive]           = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      const [iRes, tRes] = await Promise.all([getInstruments(), getTeachers()]);
      if (iRes.error || tRes.error) { Alert.alert('Error', iRes.error ?? tRes.error!); return; }
      setInstruments(iRes.data);
      setTeachers(tRes.data);

      if (isEdit && templateId) {
        const tplRes = await getLessonTemplates();
        if (tplRes.error) { Alert.alert('Error', tplRes.error); return; }
        const tpl = tplRes.data.find((t) => t.id === templateId);
        if (tpl) {
          setSelectedInstrument(iRes.data.find((i) => i.id === tpl.instrument?.id) ?? null);
          setSelectedTeacher(tRes.data.find((t) => t.id === tpl.teacher?.id) ?? null);
          setType(tpl.type);
          setDayOfWeek(tpl.day_of_week);
          setStartTime(tpl.start_time.slice(0, 5));
          setDurationMins(String(tpl.duration_mins));
          setRoom(tpl.room ?? '');
          setMaxCapacity(String(tpl.max_capacity));
          setIsActive(tpl.is_active);
        }
      }
      setLoading(false);
    })();
  }, [isEdit, templateId]);

  const onSave = async () => {
    if (!selectedInstrument || !selectedTeacher) {
      Alert.alert('Incomplete', 'Please select instrument and teacher.');
      return;
    }
    const dur = parseInt(durationMins, 10);
    const cap = parseInt(maxCapacity, 10);
    if (isNaN(dur) || dur <= 0) { Alert.alert('Invalid', 'Duration must be a positive number.'); return; }
    if (isNaN(cap) || cap <= 0) { Alert.alert('Invalid', 'Max capacity must be a positive number.'); return; }
    if (!/^\d{2}:\d{2}$/.test(startTime)) { Alert.alert('Invalid', 'Start time must be HH:MM (e.g. 09:30).'); return; }

    const payload = {
      teacher_id:    selectedTeacher.id,
      instrument_id: selectedInstrument.id,
      type,
      day_of_week:   dayOfWeek,
      start_time:    startTime + ':00',
      duration_mins: dur,
      room:          room.trim() || null,
      max_capacity:  cap,
      is_active:     isActive,
    };

    setSaving(true);
    const r = isEdit && templateId
      ? await updateLessonTemplate(templateId, payload)
      : await createLessonTemplate(payload);
    setSaving(false);

    if (r.error) { Alert.alert('Error', r.error); return; }

    if (!isEdit && r.data) {
      // Navigate to assign students immediately after creating
      navigation.replace('AdminTemplateStudents', {
        templateId: (r.data as { id: string }).id,
        instrumentId: selectedInstrument.id,
      });
    } else {
      navigation.goBack();
    }
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        <Label>Instrument</Label>
        <View style={styles.chipRow}>
          {instruments.map((i) => (
            <Chip key={i.id} label={i.name} active={selectedInstrument?.id === i.id} onPress={() => setSelectedInstrument(i)} />
          ))}
        </View>

        <Label>Teacher</Label>
        <View style={styles.chipRow}>
          {teachers.map((t) => (
            <Chip key={t.id} label={t.user?.full_name ?? t.id} active={selectedTeacher?.id === t.id} onPress={() => setSelectedTeacher(t)} />
          ))}
        </View>

        <Label>Type</Label>
        <View style={styles.segRow}>
          {(['group', '1-1'] as LessonType[]).map((v) => (
            <Pressable key={v} style={[styles.seg, type === v && styles.segActive]} onPress={() => setType(v)}>
              <Text style={[styles.segText, type === v && styles.segTextActive]}>{v === 'group' ? 'Group' : '1-to-1'}</Text>
            </Pressable>
          ))}
        </View>

        <Label>Day</Label>
        <View style={styles.chipRow}>
          {DAYS.map((d, i) => (
            <Chip key={d} label={d.slice(0, 3)} active={dayOfWeek === i} onPress={() => setDayOfWeek(i)} />
          ))}
        </View>

        <Label>Start time (HH:MM)</Label>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="09:00" keyboardType="numbers-and-punctuation" />

        <Label>Duration (minutes)</Label>
        <TextInput style={styles.input} value={durationMins} onChangeText={setDurationMins} keyboardType="number-pad" />

        <Label>Room (optional)</Label>
        <TextInput style={styles.input} value={room} onChangeText={setRoom} placeholder="e.g. Room 3" />

        <Label>Max capacity</Label>
        <TextInput style={styles.input} value={maxCapacity} onChangeText={setMaxCapacity} keyboardType="number-pad" />

        {isEdit && (
          <View style={styles.switchRow}>
            <Label>Active</Label>
            <Switch value={isActive} onValueChange={setIsActive} />
          </View>
        )}

        <Pressable style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={onSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create & assign students →'}</Text>
        </Pressable>

        {isEdit && templateId && selectedInstrument && (
          <Pressable
            style={styles.assignBtn}
            onPress={() => navigation.navigate('AdminTemplateStudents', { templateId, instrumentId: selectedInstrument.id })}
          >
            <Text style={styles.assignBtnText}>Manage assigned students</Text>
          </Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex:            { flex: 1 },
  center:          { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:       { padding: 16 },
  label:           { fontSize: 13, color: '#555', marginTop: 14, marginBottom: 6 },
  chipRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 12,
  },
  chipActive:      { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  chipText:        { color: '#333', fontSize: 13 },
  chipTextActive:  { color: '#fff', fontWeight: '600' },
  segRow:          { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  segActive:       { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  segText:         { color: '#333' },
  segTextActive:   { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15,
  },
  switchRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  saveBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: '#fff', fontWeight: '700', fontSize: 15 },
  assignBtn:       { borderWidth: 1, borderColor: '#1f2937', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  assignBtnText:   { color: '#1f2937', fontWeight: '600' },
});
