import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/lib/auth';

export function PendingApprovalScreen() {
  const { signOut } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🎵</Text>
      <Text style={styles.title}>Registration pending</Text>
      <Text style={styles.body}>
        Your account has been created and is waiting for approval from the school
        administrator. You'll have full access once they've confirmed your
        registration.
      </Text>
      <Text style={styles.hint}>
        If you think this is taking too long, contact the school office directly.
      </Text>
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    padding: 32, backgroundColor: '#fff',
  },
  icon:     { fontSize: 48, marginBottom: 20 },
  title:    { fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 16 },
  body: {
    fontSize: 16, color: '#444', textAlign: 'center',
    lineHeight: 24, marginBottom: 16,
  },
  hint:     { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  signOut:  { marginTop: 40, padding: 12 },
  signOutText: { color: '#b00020', fontWeight: '600' },
});
