import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
export const supabase = url && key ? createClient(url, key, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    persistSession: true, autoRefreshToken: true, detectSessionInUrl: Platform.OS === 'web',
  },
}) : null;

type AuthState = {
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
};
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!!supabase);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    let alive = true;
    let receivedEvent = false;
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, nextSession) => {
      receivedEvent = true;
      if (alive) { setSession(nextSession); setLoading(false); }
    });
    client.auth.getSession().then(({ data, error }) => {
      if (alive && !receivedEvent) { setSession(error ? null : data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    const appSubscription = Platform.OS !== 'web' ? AppState.addEventListener('change', state => {
      if (state === 'active') client.auth.startAutoRefresh();
      else client.auth.stopAutoRefresh();
    }) : null;
    if (Platform.OS !== 'web' && AppState.currentState === 'active') client.auth.startAutoRefresh();
    return () => { alive = false; subscription.unsubscribe(); appSubscription?.remove(); if (Platform.OS !== 'web') client.auth.stopAutoRefresh(); };
  }, []);

  async function signOut() {
    if (supabase && session) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    }
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, loading, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider is missing');
  return auth;
}
