import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Pressable, SectionList,
  StyleSheet, Text, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { deletePricing, getPricing, PricingRow } from '@/lib/api';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPricing'>;

// Group rows by instrument name, then sort each group by teacher → type → duration
function groupByInstrument(rows: PricingRow[]) {
  const map = new Map<string, { title: string; data: PricingRow[] }>();
  for (const row of rows) {
    const key = row.instrument?.name ?? 'Unknown';
    if (!map.has(key)) map.set(key, { title: key, data: [] });
    map.get(key)!.data.push(row);
  }
  // Sort within each group: teacher name → lesson type → duration → effective_from desc
  for (const section of map.values()) {
    section.data.sort((a, b) => {
      const tA = a.teacher?.user?.full_name ?? '';
      const tB = b.teacher?.user?.full_name ?? '';
      if (tA !== tB) return tA.localeCompare(tB);
      if (a.lesson_type !== b.lesson_type) return a.lesson_type.localeCompare(b.lesson_type);
      if (a.duration_mins !== b.duration_mins) return a.duration_mins - b.duration_mins;
      return b.effective_from.localeCompare(a.effective_from);
    });
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export function PricingScreen({ navigation }: Props) {
  const [rows,    setRows]    = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await getPricing();
    if (r.error) setError(r.error);
    else setRows(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const unsub = navigation.addListener('focus', load);
    return unsub;
  }, [navigation, load]);

  const onDelete = (row: PricingRow) => {
    Alert.alert(
      'Delete this rate?',
      `£${Number(row.amount).toFixed(2)} for ${row.instrument?.name} · ${row.lesson_type} · ${row.duration_mins} min (from ${row.effective_from})`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            const r = await deletePricing(row.id);
            if (r.error) Alert.alert('Error', r.error);
            else load();
          },
        },
      ],
    );
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  const sections = groupByInstrument(rows);

  return (
    <>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled
        ListEmptyComponent={
          <Text style={styles.empty}>
            No rates yet. Add a rate to get started.
          </Text>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => navigation.navigate('AdminPricingForm', { pricingId: row.id })}
            onLongPress={() => onDelete(row)}
          >
            <View style={styles.rowTop}>
              <View style={styles.flex1}>
                <Text style={styles.teacher}>{row.teacher?.user?.full_name ?? '—'}</Text>
                <Text style={styles.sub}>
                  {row.lesson_type === '1-1' ? '1-to-1' : 'Group'} · {row.duration_mins} min
                </Text>
              </View>
              <View style={styles.amountBlock}>
                <Text style={styles.amount}>£{Number(row.amount).toFixed(2)}</Text>
                <Text style={styles.effectiveFrom}>from {row.effective_from}</Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('AdminPricingForm', {})}
      >
        <Text style={styles.fabText}>+ Add rate</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  center:        { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:          { paddingBottom: 88 },
  error:         { color: '#b00020', padding: 16 },
  empty:         { color: '#666', textAlign: 'center', marginTop: 40, padding: 16 },
  sectionHeader: { backgroundColor: '#f3f4f6', paddingHorizontal: 16, paddingVertical: 8 },
  sectionTitle:  { fontWeight: '700', fontSize: 14, color: '#374151' },
  card: {
    marginHorizontal: 16, marginTop: 10,
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, backgroundColor: '#fafafa',
  },
  cardPressed:   { backgroundColor: '#f0f0f0' },
  rowTop:        { flexDirection: 'row', alignItems: 'center' },
  flex1:         { flex: 1 },
  teacher:       { fontWeight: '600', fontSize: 15 },
  sub:           { color: '#555', marginTop: 2 },
  amountBlock:   { alignItems: 'flex-end' },
  amount:        { fontSize: 18, fontWeight: '700', color: '#1f2937' },
  effectiveFrom: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  fab: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    backgroundColor: '#1f2937', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
  },
  fabText:       { color: '#fff', fontWeight: '700', fontSize: 15 },
});
