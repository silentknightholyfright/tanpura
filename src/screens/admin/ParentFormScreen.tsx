import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createParent, getStudent, updateParent, updateParentLink } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';
import { Parent, StudentDetail } from '@/lib/types';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminParentForm'>;

const RELATIONSHIPS = ['mother', 'father', 'guardian'] as const;
type Relationship = typeof RELATIONSHIPS[number];

export function ParentFormScreen({ route, navigation }: Props) {
  const { studentId, parentId } = route.params;
  const isEdit = !!parentId;

  const [fullName,    setFullName]    = useState('');
  const [email,       setEmail]       = useState('');
  const [whatsapp,    setWhatsapp]    = useState('');
  const [language,    setLanguage]    = useState('en');
  const [relationship, setRelationship] = useState<Relationship>('guardian');
  const [isPrimary,   setIsPrimary]   = useState(false);
  const [loading,     setLoading]     = useState(isEdit);
  const [saving,      setSaving]      = useState(false);

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const r = await getStudent(studentId);
      if (r.error) { Alert.alert('Error', r.error); return; }
      const link = r.data.parent_links.find((l) => l.parent.id === parentId);
      if (!link) return;
      const p = link.parent;
      setFullName(p.full_name ?? '');
      setEmail(p.email ?? '');
      setWhatsapp(p.whatsapp_number ?? '');
      setLanguage(p.preferred_language ?? 'en');
      setRelationship(link.relationship as Relationship);
      setIsPrimary(link.is_primary);
      setLoading(false);
    })();
  }, [isEdit, studentId, parentId]);

  const onSave = async () => {
    if (!fullName.trim()) { Alert.alert('Required', 'Full name is required.'); return; }

    setSaving(true);
    if (isEdit && parentId) {
      const r1 = await updateParent(parentId, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        preferred_language: language.trim() || 'en',
      });
      const r2 = await updateParentLink(studentId, parentId, { relationship, is_primary: isPrimary });
      if (r1.error || r2.error) { Alert.alert('Error', r1.error ?? r2.error!); setSaving(false); return; }
    } else {
      const r = await createParent(studentId, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        whatsapp_number: whatsapp.trim() || null,
        preferred_language: language.trim() || 'en',
        relationship,
        is_primary: isPrimary,
      });
      if (r.error) { Alert.alert('Error', r.error); setSaving(false); return; }
    }
    setSaving(false);
    navigation.goBack();
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container}>

        <Field label="Full name *" value={fullName} onChange={setFullName} placeholder="e.g. Fatima Al-Rashid" autoCapitalize="words" />
        <Field label="Email" value={email} onChange={setEmail} placeholder="parent@email.com" keyboardType="email-address" autoCapitalize="none" />
        <Field label="WhatsApp number" value={whatsapp} onChange={setWhatsapp} placeholder="+44 7xxx xxxxxx" keyboardType="phone-pad" />
        <Field label="Preferred language" value={language} onChange={setLanguage} placeholder="en" autoCapitalize="none" />

        <Text style={styles.label}>Relationship</Text>
        <View style={styles.segmentRow}>
          {RELATIONSHIPS.map((r) => (
            <Pressable
              key={r}
              style={[styles.segment, relationship === r && styles.segmentActive]}
              onPress={() => setRelationship(r)}
            >
              <Text style={[styles.segmentText, relationship === r && styles.segmentTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.label}>Primary invoice recipient</Text>
          <Switch value={isPrimary} onValueChange={setIsPrimary} />
        </View>

        <Pressable
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={onSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add parent'}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label, value, onChange, placeholder, keyboardType, autoCapitalize,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: any; autoCapitalize?: any;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:         { padding: 16 },
  label:             { fontSize: 13, color: '#555', marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15,
  },
  segmentRow:        { flexDirection: 'row', gap: 8, marginBottom: 4 },
  segment: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  segmentActive:     { backgroundColor: '#1f2937', borderColor: '#1f2937' },
  segmentText:       { color: '#333', fontSize: 13 },
  segmentTextActive: { color: '#fff', fontWeight: '600' },
  switchRow:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  saveBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center', marginTop: 28,
  },
  saveBtnDisabled:   { opacity: 0.6 },
  saveBtnText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
