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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  saveProfile: (p: Omit<VetProfile, 'id'>) => Promise<void>;
};

const AuthContext = createContext<Auth | null>(null);

/** Reads an OAuth error Supabase or Google put in the address bar, then removes it. */
function takeUrlError(): string | null {
  const params = new URLSearchParams(window.location.search + '&' + window.location.hash.slice(1));
  const msg = params.get('error_description') ?? params.get('error');
  if (msg) window.history.replaceState(null, '', window.location.pathname);
  return msg;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [sessionLoaded, setSessionLoaded] = useState(false);
  // The vet profile, and which signed-in user it was loaded for.
  const [profile, setProfile] = useState<{ userId: string | null; vet: VetProfile | null }>({ userId: null, vet: null });
  const [error, setError] = useState<string | null>(() => (supabaseConfigured ? takeUrlError() : null));

  // Follow the sign-in session (also finishes a Google sign-in when the page loads with ?code=…).
  useEffect(() => {
    if (!supabaseConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoaded(true);
      if (new URLSearchParams(window.location.search).has('code')) {
        window.history.replaceState(null, '', window.location.pathname);
      }
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

  const signInWithGoogle = useCallback(async () => {
    setError(null);
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Come back to whichever address the app was opened from (localhost or the tunnel).
      options: { redirectTo: `${window.location.origin}/`, queryParams: { prompt: 'select_account' } },
    });
    if (err) setError(err.message);
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
    <AuthContext.Provider value={{ status, session, vet, error, signInWithGoogle, signOut, saveProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
