import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import { engagementError, getStats, setLike, type Stats } from './backend/engagement';
type Entry = { stats?: Stats; error?: string; busy?: boolean };
type Store = { entries: Record<string, Entry>; refresh: (id: string) => Promise<void>; toggle: (id: string) => Promise<void> };
const Context = createContext<Store | null>(null);
export function EngagementProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [entries, setEntries] = useState<Record<string, Entry>>({});
  const values = useRef<Record<string, Entry>>({});
  const locks = useRef(new Set<string>());
  const update = useCallback((id: string, entry: Entry) => { values.current = { ...values.current, [id]: entry }; setEntries(values.current); }, []);
  const refresh = useCallback(async (id: string) => {
    if (locks.current.has(id)) return;
    locks.current.add(id);
    try { update(id, { stats: await getStats(id) }); }
    catch (e) { update(id, { ...values.current[id], error: engagementError(e), busy: false }); }
    finally { locks.current.delete(id); }
  }, [update]);
  const toggle = useCallback(async (id: string) => {
    const previous = values.current[id]?.stats;
    if (!session || !previous || locks.current.has(id)) return;
    locks.current.add(id); update(id, { stats: previous, busy: true });
    try {
      await setLike(id, session.user.id, !previous.liked);
      update(id, { stats: { ...previous, liked: !previous.liked, likes: Math.max(0, previous.likes + (previous.liked ? -1 : 1)) } });
      update(id, { stats: await getStats(id) });
    } catch (e) { update(id, { ...values.current[id], error: engagementError(e), busy: false }); }
    finally { locks.current.delete(id); }
  }, [session, update]);
  return <Context.Provider value={{ entries, refresh, toggle }}>{children}</Context.Provider>;
}
export function useEngagement() { const value = useContext(Context); if (!value) throw new Error('Missing engagement provider'); return value; }
