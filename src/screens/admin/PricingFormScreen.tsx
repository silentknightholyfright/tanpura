import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  createPricing, getInstruments, getPricing, getTeachers,
  InstrumentRow, PricingRow, TeacherRow, updatePricing,
} from '@/lib/api';
import { LessonType } from '@/lib/types';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPricingForm'>;

const PRESET_DURATIONS = [30, 45, 60, 90];
const today = new Date().toISOString().slice(0, 10);

export function PricingFormScreen({ route, navigation }: Props) {
  const { pricingId } = route.params;
  const isEdit = !!pricingId;

  const [instruments, setInstruments] = useState<InstrumentRow[]>([]);
  const [teachers,    setTeachers]    = useState<TeacherRow[]>([]);

  const [selectedInstrument, setSelectedInstrument] = useState<InstrumentRow | null>(null);
  const [selectedTeacher,    setSelectedTeacher]    = useState<TeacherRow | null>(null);
  const [lessonType,         setLessonType]         = useState<LessonType>('group');
  const [durationMins,       setDurationMins]       = useState<number | null>(45);
  const [customDuration,     setCustomDuration]     = useState('');
  const [amount,             setAmount]             = useState('');
  const [effectiveFrom,      setEffectiveFrom]      = useState(today);

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    (async () => {
      const [iRes, tRes] = await Promise.all([getInstruments(), getTeachers()]);
      if (iRes.error || tRes.error) {
        Alert.alert('Error', iRes.error ?? tRes.error!);
        return;
      }
      setInstruments(iRes.data);
      setTeachers(tRes.data);

      if (isEdit && pricingId) {
        const pRes = await getPricing();
        if (pRes.error) { Alert.alert('Error', pRes.error); return; }
        const row = pRes.data.find((p) => p.id === pricingId);
        if (row) {
          setSelectedInstrument(iRes.data.find((i) => i.id === row.instrument_id) ?? null);
          setSelectedTeacher(tRes.data.find((t) => t.id === row.teacher_id) ?? null);
          setLessonType(row.lesson_type);
          if (PRESET_DURATIONS.includes(row.duration_mins)) {
            setDurationMins(row.duration_mins);
          } else {
            setDurationMins(null);
            setCustomDuration(String(row.duration_mins));
          }
          setAmount(String(row.amount));
          setEffectiveFrom(row.effective_from);
        }
      }
      setLoading(false);
    })();
  }, [isEdit, pricingId]);

  const resolvedDuration = durationMins ?? parseInt(customDuration, 10);

  const onSave = async () => {
    if (!selectedInstrument) { Alert.alert('Required', 'Select an instrument.'); return; }
    if (!selectedTeacher)    { Alert.alert('Required', 'Select a teacher.'); return; }
    if (isNaN(resolvedDuration) || resolvedDuration <= 0) {
      Alert.alert('Invalid', 'Enter a valid duration in minutes.');
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      Alert.alert('Invalid', 'Enter a valid amount (e.g. 15.00).');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
      Alert.alert('Invalid', 'Effective from must be YYYY-MM-DD.');
      return;
    }

    setSaving(true);
    const payload = {
      instrument_id: selectedInstrument.id,
      teacher_id:    selectedTeacher.id,
      lesson_type:   lessonType,
      duration_mins: resolvedDuration,
      amount:        parsedAmount,
      effective_from: effectiveFrom,
    };

    const r = isEdit && pricingId
      ? await updatePricing(pricingId, payload)
      : await createPricing(payload);
    setSaving(false);

    if (r.error) { Alert.alert('Error', r.error); return; }
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        <Label>Instrument</Label>
        <View style={styles.chipRow}>
          {instruments.map((i) => (
            <Chip
              key={i.id}
              label={i.name}
              active={selectedInstrument?.id === i.id}
              onPress={() => setSelectedInstrument(i)}
              disabled={isEdit}
            />
          ))}
        </View>

        <Label>Teacher</Label>
        <View style={styles.chipRow}>
          {teachers.map((t) => (
            <Chip
              key={t.id}
              label={t.user?.full_name ?? t.id}
              active={selectedTeacher?.id === t.id}
              onPress={() => setSelectedTeacher(t)}
              disabled={isEdit}
            />
          ))}
        </View>

        <Label>Lesson type</Label>
        <View style={styles.segRow}>
          {(['group', '1-1'] as LessonType[]).map((v) => (
            <Pressable
              key={v}
              style={[styles.seg, lessonType === v && styles.segActive, isEdit && styles.segDisabled]}
              onPress={() => !isEdit && setLessonType(v)}
            >
              <Text style={[styles.segText, lessonType === v && styles.segTextActive]}>
                {v === 'group' ? 'Group' : '1-to-1'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Label>Duration (minutes)</Label>
        <View style={styles.chipRow}>
          {PRESET_DURATIONS.map((d) => (
            <Chip
              key={d}
              label={`${d} min`}
              active={durationMins === d}
              onPress={() => { setDurationMins(d); setCustomDuration(''); }}
              disabled={isEdit}
            />
          ))}
          <Chip
            label="Other"
            active={durationMins === null}
            onPress={() => { setDurationMins(null); }}
            disabled={isEdit}
          />
        </View>
        {durationMins === null && (
          <TextInput
            style={styles.input}
            value={customDuration}
            onChangeText={setCustomDuration}
            placeholder="e.g. 75"
            keyboardType="number-pad"
            editable={!isEdit}
          />
        )}

        <Label>Amount (£)</Label>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          placeholder="e.g. 15.00"
          keyboardType="decimal-pad"
        />

        <Label>Effective from (YYYY-MM-DD)</Label>
        <TextInput
          style={styles.input}
          value={effectiveFrom}
          onChangeText={setEffectiveFrom}
          placeholder={today}
          keyboardType="numbers-and-punctuation"
        />
        <Text style={styles.hint}>
          To schedule a future rate change, set this to a future date. Historical
          invoices are unaffected — the rate active on the lesson date is always used.
        </Text>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add rate'}
          </Text>
        </Pressable>

        {isEdit && (
          <Text style={styles.deleteHint}>Long-press a rate in the list to delete it.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

function Chip({
  label, active, onPress, disabled,
}: {
  label: string; active: boolean; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.chip, active && styles.chipActive, disabled && styles.chipDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:         { padding: 16, paddingBottom: 40 },
  label:             { fontSize: 13, color: '#555', marginTop: 16, marginBottom: 6 },
  chipRow:           { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 20,
    paddingVertical: 6, paddingHorizontal: 14,
  },
  chipActive:        { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  chipDisabled:      { opacity: 0.45 },
  chipText:          { color: '#333', fontSize: 13 },
  chipTextActive:    { color: '#fff', fontWeight: '600' },
  segRow:            { flexDirection: 'row', gap: 8 },
  seg: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  segActive:         { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  segDisabled:       { opacity: 0.45 },
  segText:           { color: '#333' },
  segTextActive:     { color: '#fff', fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, marginTop: 8,
  },
  hint:              { color: '#9ca3af', fontSize: 12, marginTop: 6, lineHeight: 17 },
  saveBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled:   { opacity: 0.6 },
  saveBtnText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteHint:        { color: '#9ca3af', textAlign: 'center', marginTop: 12, fontSize: 12 },
});
