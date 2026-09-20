import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { addMyChild } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'ParentAddChild'>;
type Relationship = 'mother' | 'father' | 'guardian';

const RELATIONSHIPS: { value: Relationship; label: string }[] = [
  { value: 'mother',   label: 'Mother'   },
  { value: 'father',   label: 'Father'   },
  { value: 'guardian', label: 'Guardian' },
];

export function ParentAddChildScreen({ navigation }: Props) {
  const [fullName,      setFullName]      = useState('');
  const [dob,           setDob]           = useState('');
  const [relationship,  setRelationship]  = useState<Relationship>('guardian');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!fullName.trim()) {
      setError("Child's name is required.");
      return;
    }

    // Basic YYYY-MM-DD validation if provided
    if (dob && !/^\d{4}-\d{2}-\d{2}$/.test(dob.trim())) {
      setError('Date of birth must be in YYYY-MM-DD format.');
      return;
    }

    setSubmitting(true);
    const result = await addMyChild(
      fullName.trim(),
      dob.trim() || null,
      relationship,
    );
    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (Platform.OS === 'web') {
      window.alert("Child submitted! The school admin will review and confirm the enrolment shortly.");
      navigation.goBack();
    } else {
      const { Alert } = require('react-native');
      Alert.alert(
        'Child submitted',
        'The school admin will review and confirm the enrolment shortly.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.hint}>
          Your child will be added to the school's records and assigned to lessons once the admin approves the request.
        </Text>

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Child's full name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Aisha Khan"
          autoCapitalize="words"
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
        />

        <Text style={styles.label}>Date of birth (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          keyboardType="numbers-and-punctuation"
          value={dob}
          onChangeText={setDob}
          returnKeyType="next"
          maxLength={10}
        />

        <Text style={styles.label}>Your relationship to the child</Text>
        <View style={styles.relRow}>
          {RELATIONSHIPS.map((r) => (
            <Pressable
              key={r.value}
              style={[styles.relBtn, relationship === r.value && styles.relBtnActive]}
              onPress={() => setRelationship(r.value)}
            >
              <Text style={[styles.relBtnText, relationship === r.value && styles.relBtnTextActive]}>
                {r.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Submitting…' : 'Submit for approval'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  container:   { padding: 20 },
  hint: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 12,
    color: '#444',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorBanner: { backgroundColor: '#fce8e6', borderRadius: 8, padding: 12, marginBottom: 14 },
  errorText:   { color: '#b00020' },
  label:       { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  relRow:          { flexDirection: 'row', gap: 8, marginTop: 4 },
  relBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  relBtnActive:     { borderColor: '#1f2937', backgroundColor: '#1f2937' },
  relBtnText:       { fontSize: 14, fontWeight: '600', color: '#555' },
  relBtnTextActive: { color: '#fff' },
  button: {
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancel:         { color: '#666', textAlign: 'center', marginTop: 16 },
});
