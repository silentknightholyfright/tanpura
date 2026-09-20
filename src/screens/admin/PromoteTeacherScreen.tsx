import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, KeyboardAvoidingView,
  Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getPromotableUsers, promoteToTeacher } from '@/lib/api';
import { UserProfile } from '@/lib/types';
import { AppStackParamList } from '@/navigation/AppStack';

type Props = NativeStackScreenProps<AppStackParamList, 'AdminPromoteTeacher'>;

export function PromoteTeacherScreen({ navigation }: Props) {
  const [users,    setUsers]    = useState<UserProfile[]>([]);
  const [filtered, setFiltered] = useState<UserProfile[]>([]);
  const [search,   setSearch]   = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);
  const [bio,      setBio]      = useState('');
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const r = await getPromotableUsers();
      if (r.error) { setError(r.error); setLoading(false); return; }
      setUsers(r.data);
      setFiltered(r.data);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? users.filter(
            (u) =>
              u.full_name?.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q),
          )
        : users,
    );
  }, [search, users]);

  const onPromote = async () => {
    if (!selected) return;
    Alert.alert(
      `Promote ${selected.full_name ?? selected.email} to teacher?`,
      selected.is_approved
        ? 'Their role will be changed to teacher.'
        : 'Their role will be changed to teacher and their account will be approved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Promote',
          onPress: async () => {
            setSaving(true);
            const r = await promoteToTeacher(selected.id, bio.trim() || null);
            setSaving(false);
            if (r.error) { Alert.alert('Error', r.error); return; }
            navigation.replace('AdminTeacherDetail', { teacherId: r.data.teacherId });
          },
        },
      ],
    );
  };

  if (loading) return <ActivityIndicator style={styles.center} size="large" />;
  if (error)   return <Text style={styles.error}>{error}</Text>;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>

        {!selected ? (
          <>
            <Text style={styles.hint}>
              Select the user you want to promote. They must have already
              registered via the Sign Up screen.
            </Text>
            <TextInput
              style={styles.search}
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or email…"
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            <FlatList
              data={filtered}
              keyExtractor={(u) => u.id}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>
                  {search ? 'No users match that search.' : 'All registered users are already teachers.'}
                </Text>
              }
              renderItem={({ item: u }) => (
                <Pressable
                  style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                  onPress={() => setSelected(u)}
                >
                  <Text style={styles.name}>{u.full_name ?? '—'}</Text>
                  <Text style={styles.sub}>{u.email}</Text>
                  {!u.is_approved && (
                    <Text style={styles.pendingBadge}>Pending approval</Text>
                  )}
                </Pressable>
              )}
            />
          </>
        ) : (
          <View style={styles.confirmContainer}>
            <Pressable style={styles.backLink} onPress={() => setSelected(null)}>
              <Text style={styles.backLinkText}>← Change selection</Text>
            </Pressable>

            <View style={styles.selectedCard}>
              <Text style={styles.selectedName}>{selected.full_name ?? '—'}</Text>
              <Text style={styles.selectedEmail}>{selected.email}</Text>
              {!selected.is_approved && (
                <Text style={styles.approvalNote}>
                  This user is pending approval — promoting them will also approve their account.
                </Text>
              )}
            </View>

            <Text style={styles.label}>Bio (optional)</Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="Short bio shown to students and parents…"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Pressable
              style={[styles.promoteBtn, saving && styles.promoteBtnDisabled]}
              onPress={onPromote}
              disabled={saving}
            >
              <Text style={styles.promoteBtnText}>
                {saving ? 'Promoting…' : `Promote ${selected.full_name?.split(' ')[0] ?? 'user'} to teacher`}
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex:              { flex: 1 },
  center:            { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container:         { flex: 1, padding: 16 },
  error:             { color: '#b00020', padding: 16 },
  hint:              { color: '#555', marginBottom: 12, lineHeight: 20 },
  search: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, marginBottom: 12,
  },
  empty:             { color: '#aaa', textAlign: 'center', marginTop: 32 },
  card: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, marginBottom: 10, backgroundColor: '#fafafa',
  },
  cardPressed:       { backgroundColor: '#f0f0f0' },
  name:              { fontWeight: '600', fontSize: 15 },
  sub:               { color: '#555', marginTop: 2 },
  pendingBadge: {
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: '#fef3c7', borderRadius: 4,
    paddingHorizontal: 6, paddingVertical: 2,
    fontSize: 11, color: '#92400e',
  },
  confirmContainer:  { flex: 1 },
  backLink:          { marginBottom: 16 },
  backLinkText:      { color: '#1f2937', fontWeight: '600' },
  selectedCard: {
    borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10,
    padding: 14, marginBottom: 20, backgroundColor: '#f9fafb',
  },
  selectedName:      { fontSize: 17, fontWeight: '700' },
  selectedEmail:     { color: '#555', marginTop: 2 },
  approvalNote: {
    marginTop: 8, color: '#92400e', backgroundColor: '#fef3c7',
    borderRadius: 6, padding: 8, fontSize: 13, lineHeight: 18,
  },
  label:             { fontSize: 13, color: '#555', marginBottom: 6 },
  bioInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 11, fontSize: 15, minHeight: 90, marginBottom: 24,
  },
  promoteBtn: {
    backgroundColor: '#1f2937', borderRadius: 8,
    paddingVertical: 14, alignItems: 'center',
  },
  promoteBtnDisabled:{ opacity: 0.6 },
  promoteBtnText:    { color: '#fff', fontWeight: '700', fontSize: 15 },
});
