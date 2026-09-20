import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

import { useAuth } from '@/lib/auth';
import { AuthStack } from './AuthStack';
import { AppStack } from './AppStack';
import { PendingApprovalScreen } from '@/screens/PendingApprovalScreen';

export function RootNavigator() {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!session) return <AuthStack />;

  // Logged in but not yet approved — show holding screen.
  // Admins and teachers are always approved; this catches pending students.
  if (profile && !profile.is_approved) return <PendingApprovalScreen />;

  return <AppStack />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
