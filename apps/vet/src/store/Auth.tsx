import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase, supabaseConfigured } from '@/lib/supabase';
import type { VetProfile } from '@/types';

type AuthStatus = 'not-configured' | 'loading' | 'signed-out' | 'needs-profile' | 'ready';

type Auth = {
  status: AuthStatus;
  session: Session | null;
  vet: VetProfile | null;
  error: string | null;
  /** Returns an error message, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Creates the account and signs in. Returns an error message, or null on success. */
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  saveProfile: (p: Omit<VetProfile, 'id'>) => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // The vet profile, and which signed-in user it was loaded for.
  const [profile, setProfile] = useState<{ userId: string | null; vet: VetProfile | null }>({ userId: null, vet: null });
  const [error, setError] = useState<string | null>(null);

  // Follow the sign-in session (kept on the phone, so vets stay signed in).
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Load this person's vet profile whenever the signed-in user changes.
  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (!userId) {
      setProfile({ userId: null, vet: null });
      return;
    }
    let cancelled = false;
    supabase
      .from('vets')
      .select('id, name, clinic, location')
      .eq('id', userId)
      .maybeSingle()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) setError(err.message);
        setProfile({ userId, vet: data });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Email + password accounts, stored by Supabase Auth (passwords are hashed there, never in our tables).
  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return err ? err.message : null;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    setError(null);
    const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
    if (err) return err.message;
    if (!data.session) {
      return 'Account created, but Supabase wants the email confirmed first. Turn off "Confirm email" in Supabase (see docs/backend-setup.md), then sign in.';
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const saveProfile = useCallback(
    async (p: Omit<VetProfile, 'id'>) => {
      if (!userId) return;
      const { data, error: err } = await supabase
        .from('vets')
        .upsert({ id: userId, ...p })
        .select('id, name, clinic, location')
        .single();
      if (err) throw new Error(err.message);
      setProfile({ userId, vet: data });
    },
    [userId],
  );

  const vet = profile.userId === userId ? profile.vet : null;
  let status: AuthStatus;
  if (!supabaseConfigured) status = 'not-configured';
  else if (!sessionLoaded || (userId && profile.userId !== userId)) status = 'loading';
  else if (!session) status = 'signed-out';
  else if (!vet) status = 'needs-profile';
  else status = 'ready';

  return (
    <AuthContext.Provider value={{ status, session, vet, error, signIn, signUp, signOut, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
