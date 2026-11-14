import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { supabase, useAuth } from './auth';
import { engagementError, getStats, setLike, type Stats } from './backend/engagement';

type Entry = { stats?: Stats; error?: string; busy?: boolean };
type Store = { entries: Record<string, Entry>; refresh: (id: string) => Promise<void>; toggle: (id: string) => Promise<void>; watch: (id: string) => () => void };
const Context = createContext<Store | null>(null);
export function EngagementProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const values = useRef<Record<string, Entry>>({});
  const writes = useRef(new Set<string>());
  const reads = useRef(new Set<string>());
  const versions = useRef<Record<string, number>>({});
  const watched = useRef(new Map<string, number>());
  const alive = useRef(true);
  const update = useCallback((id: string, entry: Entry) => {
    if (!alive.current) return;
    values.current = { ...values.current, [id]: entry }; setEntries(values.current);
  }, []);
  const refresh = useCallback(async (id: string) => {
    if (writes.current.has(id) || reads.current.has(id)) return;
    reads.current.add(id);
    const version = versions.current[id] ?? 0;
    try {
      const stats = await getStats(id);
      if ((versions.current[id] ?? 0) === version && !writes.current.has(id)) update(id, { stats });
    } catch (e) {
      if ((versions.current[id] ?? 0) === version && !writes.current.has(id)) update(id, { ...values.current[id], error: engagementError(e) });
    } finally { reads.current.delete(id); }
  }, [update]);
  const watch = useCallback((id: string) => {
    watched.current.set(id, (watched.current.get(id) ?? 0) + 1);
    void refresh(id);
    return () => {
      const count = (watched.current.get(id) ?? 1) - 1;
      if (count) watched.current.set(id, count); else watched.current.delete(id);
    };
  }, [refresh]);
  const toggle = useCallback(async (id: string) => {
    const previous = values.current[id]?.stats;
    if (!session || !previous || writes.current.has(id)) return;
    writes.current.add(id); versions.current[id] = (versions.current[id] ?? 0) + 1;
    const optimistic = { ...previous, liked: !previous.liked, likes: Math.max(0, previous.likes + (previous.liked ? -1 : 1)) };
    update(id, { stats: optimistic, busy: true });
    try {
      await setLike(id, session.user.id, optimistic.liked);
      update(id, { stats: optimistic });
    } catch (e) { update(id, { stats: previous, error: engagementError(e) }); }
    finally { writes.current.delete(id); }
    await refresh(id);
  }, [session, refresh, update]);
  useEffect(() => {
    alive.current = true;
    const foreground = () => AppState.currentState === 'active' && (Platform.OS !== 'web' || !document.hidden);
    const refreshVisible = () => { if (foreground()) watched.current.forEach((_, id) => void refresh(id)); };
    // Polling recovers missed events and works even before Realtime is enabled.
    const timer = setInterval(refreshVisible, 5000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') refreshVisible(); });
    const channel = userId && supabase?.channel('reel-engagement-' + userId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'post_likes' }, payload => {
        const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
        const id = row.post_id as string | undefined;
        if (!foreground()) return;
        if (id && watched.current.has(id)) void refresh(id);
        else if (!id) refreshVisible();
      }).subscribe(status => { if (status === 'SUBSCRIBED') refreshVisible(); });
    return () => { alive.current = false; clearInterval(timer); subscription.remove(); if (channel && supabase) void supabase.removeChannel(channel); };
  }, [userId, refresh]);
  return <Context.Provider value={{ entries, refresh, toggle, watch }}>{children}</Context.Provider>;
}
export function useEngagement() { const value = useContext(Context); if (!value) throw new Error('Missing engagement provider'); return value; }
