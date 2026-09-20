import React, { useState } from 'react';
import {
  ActivityIndicator,
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

import { createStudent } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminAddStudent'>;

export function AdminAddStudentScreen({ navigation }: Props) {
  const [fullName,          setFullName]          = useState('');
  const [email,             setEmail]             = useState('');
  const [dateOfBirth,       setDateOfBirth]       = useState('');
  const [emergencyContact,  setEmergencyContact]  = useState('');
  const [saving,            setSaving]            = useState(false);
  const [error,             setError]             = useState<string | null>(null);

  const handleSave = async () => {
    if (!fullName.trim()) { setError('Full name is required.'); return; }

    // Basic date format validation (YYYY-MM-DD)
    const dobTrimmed = dateOfBirth.trim() || null;
    if (dobTrimmed && !/^\d{4}-\d{2}-\d{2}$/.test(dobTrimmed)) {
      setError('Date of birth must be in YYYY-MM-DD format.');
      return;
    }

    setSaving(true);
    setError(null);

    const result = await createStudent({
      full_name: fullName.trim(),
      email: email.trim() || null,
      date_of_birth: dobTrimmed,
      emergency_contact: emergencyContact.trim() || null,
    });

    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      navigation.goBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Full name <Text style={styles.required}>*</Text></Text>
        <TextInput
          style={styles.input}
          value={fullName}
          onChangeText={setFullName}
          placeholder="e.g. Arjun Sharma"
          autoCapitalize="words"
          returnKeyType="next"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="optional"
          keyboardType="email-address"
          autoCapitalize="none"
          returnKeyType="next"
        />

        <Text style={styles.label}>Date of birth</Text>
        <TextInput
          style={styles.input}
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="YYYY-MM-DD (optional)"
          keyboardType="numbers-and-punctuation"
          returnKeyType="next"
        />

        <Text style={styles.label}>Emergency contact</Text>
        <TextInput
          style={styles.input}
          value={emergencyContact}
          onChangeText={setEmergencyContact}
          placeholder="Name and phone (optional)"
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />

        <Text style={styles.hint}>
          This student won't have an app login. They'll appear in your roster and can be enrolled in lessons.
          If they later register via the app using the same email, you can link their account.
        </Text>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.saveBtnText}>Add student</Text>
          }
        </Pressable>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
  errorBanner: {
    backgroundColor: '#fce8e6',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: '#b00020' },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 16 },
  required: { color: '#b00020' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    backgroundColor: '#fff',
  },
  hint: {
    marginTop: 20,
    fontSize: 13,
    color: '#888',
    lineHeight: 19,
  },
  saveBtn: {
    marginTop: 28,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  saveBtnDisabled: { backgroundColor: '#aaa' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
