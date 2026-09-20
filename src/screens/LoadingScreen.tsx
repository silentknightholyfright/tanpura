import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface Props {
  message?: string;
}

export function LoadingScreen({ message }: Props) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
      {message ? <Text style={styles.text}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  text: { marginTop: 12, color: '#555' },
});
