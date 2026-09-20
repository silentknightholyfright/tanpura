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

import { useAuth } from '@/lib/auth';
import { AuthStackParamList } from '@/navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;
type Role = 'student' | 'parent';

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const [role,      setRole]      = useState<Role>('student');
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [phone,     setPhone]     = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState<string | null>(null);
  const [submitting,setSubmitting]= useState(false);

  const onSubmit = async () => {
    setError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setError('Please fill in every field.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setSubmitting(true);
    const { error: signUpError } = await signUp(
      email.trim(),
      password,
      fullName.trim(),
      phone.trim(),
      role,
    );
    setSubmitting(false);

    if (signUpError) { setError(signUpError); return; }

    if (Platform.OS === 'web') {
      window.alert('Account created. An admin will approve your account shortly.');
      navigation.goBack();
    } else {
      const { Alert } = require('react-native');
      Alert.alert(
        'Account created',
        'An admin will approve your account shortly.',
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
        <Text style={styles.title}>Create account</Text>

        {/* Role selector */}
        <Text style={styles.label}>I am a…</Text>
        <View style={styles.roleRow}>
          {(['student', 'parent'] as Role[]).map(r => (
            <Pressable
              key={r}
              style={[styles.roleBtn, role === r && styles.roleBtnActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleBtnText, role === r && styles.roleBtnTextActive]}>
                {r === 'student' ? '🎵  Student' : '👨‍👧  Parent'}
              </Text>
            </Pressable>
          ))}
        </View>
        {role === 'parent' && (
          <Text style={styles.roleHint}>
            You'll be able to view your children's lesson schedule and attendance once approved.
          </Text>
        )}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <Text style={styles.label}>Full name</Text>
        <TextInput
          style={styles.input}
          placeholder="Your full name"
          autoCapitalize="words"
          autoComplete="name"
          value={fullName}
          onChangeText={setFullName}
          returnKeyType="next"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          returnKeyType="next"
        />

        <Text style={styles.label}>Mobile number</Text>
        <TextInput
          style={styles.input}
          placeholder="+44 7700 000000"
          keyboardType="phone-pad"
          autoComplete="tel"
          value={phone}
          onChangeText={setPhone}
          returnKeyType="next"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 8 characters"
          secureTextEntry
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
        />

        <Pressable
          style={[styles.button, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
        >
          <Text style={styles.buttonText}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Text>
        </Pressable>

        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back to sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:        { flex: 1 },
  container:   { padding: 24, justifyContent: 'center', flexGrow: 1 },
  title:       { fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  label:       { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 14 },
  roleRow:     { flexDirection: 'row', gap: 10, marginBottom: 4 },
  roleBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  roleBtnActive:      { borderColor: '#1f2937', backgroundColor: '#1f2937' },
  roleBtnText:        { fontSize: 15, fontWeight: '600', color: '#555' },
  roleBtnTextActive:  { color: '#fff' },
  roleHint:    { fontSize: 13, color: '#666', marginBottom: 4, lineHeight: 18 },
  errorBanner: { backgroundColor: '#fce8e6', borderRadius: 8, padding: 12, marginTop: 10 },
  errorText:   { color: '#b00020' },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#1f2937',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText:     { color: '#fff', fontWeight: '600', fontSize: 16 },
  link:           { color: '#1f2937', textAlign: 'center', marginTop: 16 },
});
