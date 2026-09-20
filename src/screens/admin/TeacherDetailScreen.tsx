import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getTeacherDetail, updateTeacher, TeacherDetail } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminTeacherDetail'>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function TeacherDetailScreen({ route, navigation }: Props) {
  const { teacherId } = route.params;

  const [teacher, setTeacher] = useState<TeacherDetail | null>(null);
  const [bio,      setBio]     = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getTeacherDetail(teacherId);
    if (r.error) { setError(r.error); setLoading(false); return; }
    setTeacher(r.data);
    setBio(r.data.bio ?? '');
    setIsActive(r.data.is_active);
    navigation.setOptions({ title: r.data.user?.full_name ?? 'Teacher' });
    setLoading(false);
  }, [teacherId, navigation]);

  useEffect(() => { load(); }, [load]);

  const onSave = async () => {
    setSaving(true);
    const r = await updateTeacher(teacherId, {
      bio: bio.trim() || null,
      is_active: isActive,
    });
    setSaving(false);
    if (r.error) { Alert.alert('Error', r.error); return; }
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error || !teacher) return <Text style={styles.error}>{error ?? 'Not found'}</Text>;

  const { user, templates } = teacher;
  const activeTemplates   = templates.filter((t) => t.is_active);
  const inactiveTemplates = templates.filter((t) => !t.is_active);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        {/* Contact info — read only */}
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          <Row label="Name"  value={user?.full_name} />
          <Row label="Email" value={user?.email} />
          <Row label="Phone" value={user?.phone} />
        </View>

        {/* Editable fields */}
        <Text style={styles.sectionTitle}>Bio</Text>
        <TextInput
          style={styles.bioInput}
          value={bio}
          onChangeText={setBio}
          placeholder="Short bio shown to students and parents…"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Active</Text>
          <Switch value={isActive} onValueChange={setIsActive} />
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>

        {/* Lesson templates — read only summary */}
        {templates.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.sectionSpacing]}>
              Lesson templates ({activeTemplates.length} active)
            </Text>
            {[...activeTemplates, ...inactiveTemplates].map((t) => (
              <View key={t.id} style={[styles.templateCard, !t.is_active && styles.templateInactive]}>
                <Text style={styles.templateTitle}>
                  {DAYS[t.day_of_week]}  {t.start_time.slice(0, 5)} · {t.instrument?.name}
                </Text>
                <Text style={styles.templateSub}>
                  {t.type} · {t.duration_mins} min{t.room ? ` · ${t.room}` : ''}
                  {!t.is_active ? ' · Inactive' : ''}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  flex:             { flex: 1 },
  center:           { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:        { padding: 16, paddingBottom: 40 },
  error:            { color: '#b00020', padding: 16 },
  sectionTitle:     { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  sectionSpacing:   { marginTop: 24 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 16, backgroundColor: '#fafafa',
  },
  row:              { flexDirection: 'row', paddingVertical: 4 },
  rowLabel:         { width: 80, color: '#666' },
  rowValue:         { flex: 1, fontWeight: '500' },
  bioInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, minHeight: 100, marginBottom: 16,
  },
  switchRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  switchLabel:      { fontSize: 15, fontWeight: '500' },
  saveBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  saveBtnDisabled:  { opacity: 0.6 },
  saveBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  templateCard: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 8,
    padding: 12, marginBottom: 8, backgroundColor: '#fafafa',
  },
  templateInactive: { opacity: 0.5 },
  templateTitle:    { fontWeight: '600' },
  templateSub:      { color: '#555', marginTop: 2 },
});
