import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';
import { UserProfile } from './types';

interface AuthState {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    phone?: string,
    role?: 'student' | 'parent',
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[auth] profile fetch failed:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as UserProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user.id) return;
    await fetchProfile(session.user.id);
  }, [session?.user.id, fetchProfile]);

  // Step 1: subscribe to auth state changes.
  // The callback is kept synchronous to avoid the Web Locks deadlock that
  // occurs when making Supabase REST calls (which internally call getSession)
  // from inside an onAuthStateChange handler (which holds a Web Locks lock).
  useEffect(() => {
    let initialized = false;

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) setProfile(null);
        if (!initialized) {
          initialized = true;
          setLoading(false);
        }
      },
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Step 2: fetch the profile whenever the session user changes.
  // This runs outside the onAuthStateChange lock so REST calls succeed.
  useEffect(() => {
    if (session?.user.id) {
      fetchProfile(session.user.id);
    }
  }, [session?.user.id, fetchProfile]);

  const signIn = useCallback<AuthState['signIn']>(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback<AuthState['signUp']>(async (email, password, fullName, phone, role) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone: phone ?? null, role: role ?? 'student' } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AuthState>(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
