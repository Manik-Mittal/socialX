import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AppState as NativeAppState, Pressable, Text, View } from 'react-native';
import type { Reel } from './data';
import { useAuth } from './auth';
import { loadProfile, saveProfile } from './backend/profiles';
import { feedPage, handleFor, loadSocial, publishPost, setFollowing, setSaved, type Person } from './backend/social';
import { colors } from './theme';

type AppState = {
  reels: Reel[]; feedIds: string[]; savedIds: string[]; followingHandles: string[];
  following: Person[]; followers: Person[];
  profile: { name: string; bio: string }; profileLoading: boolean; profileError: string;
  socialLoading: boolean; socialError: string; pending: string[]; hasMore: boolean;
  retryProfile: () => void; refresh: () => void; loadMore: () => void;
  toggleSaved: (id: string) => void; toggleFollowing: (handle: string) => void;
  updateProfile: (name: string, bio: string) => Promise<void>;
  addReel: (reel: Reel) => Promise<void>;
  cacheReel: (reel: Reel) => void;
  removeCachedReel: (id: string) => void;
};
const StateContext = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [reels, setReels] = useState<Reel[]>([]);
  const [feedIds, setFeedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [following, setFollowingPeople] = useState<Person[]>([]);
  const [followers, setFollowers] = useState<Person[]>([]);
  const [profile, setProfile] = useState({ name: session?.user.user_metadata?.display_name || 'You', bio: '' });
  const [profileLoading, setProfileLoading] = useState(!!userId);
  const [profileError, setProfileError] = useState('');
  const [socialLoading, setSocialLoading] = useState(!!userId);
  const [socialError, setSocialError] = useState('');
  const [actionError, setActionError] = useState('');
  const [pending, setPending] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const offset = useRef(0);
  const locks = useRef(new Set<string>());
  const alive = useRef(true);
  function removeCachedReel(id: string) {
    setReels(current => current.filter(reel => reel.id !== id));
    if (feedIds.includes(id)) offset.current = Math.max(0, offset.current - 1);
    setFeedIds(current => current.filter(value => value !== id));
    setSavedIds(current => current.filter(value => value !== id));
  }
  const cacheReel = useCallback((reel: Reel) => setReels(current => [...new Map([...current, reel].map(item => [item.id, item])).values()]), []);
  const lock = (key: string) => { locks.current.add(key); setPending([...locks.current]); };
  const unlock = (key: string) => { locks.current.delete(key); if (alive.current) setPending([...locks.current]); };

  const refresh = useCallback(async () => {
    if (!userId || locks.current.size) return;
    locks.current.add('refresh');
    setSocialLoading(true); setProfileLoading(true); setActionError('');
    const [profileResult, socialResult] = await Promise.allSettled([loadProfile(userId), loadSocial(userId)]);
    if (!alive.current) return;
    if (profileResult.status === 'fulfilled') { setProfile(profileResult.value); setProfileError(''); }
    else setProfileError(profileResult.reason instanceof Error ? profileResult.reason.message : 'Could not load profile.');
    if (socialResult.status === 'fulfilled') {
      const data = socialResult.value;
      setReels(data.reels); setFeedIds(data.feedIds); setSavedIds(data.savedIds);
      setFollowingPeople(data.following); setFollowers(data.followers); setHasMore(data.hasMore);
      offset.current = data.feedIds.length; setSocialError('');
    } else setSocialError(socialResult.reason instanceof Error ? socialResult.reason.message : 'Could not load your posts. Retry when connected.');
    locks.current.delete('refresh'); setProfileLoading(false); setSocialLoading(false);
  }, [userId]);

  useEffect(() => {
    alive.current = true;
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 45 * 60 * 1000);
    const subscription = NativeAppState.addEventListener('change', state => { if (state === 'active') void refresh(); });
    return () => { alive.current = false; clearTimeout(initial); clearInterval(timer); subscription.remove(); };
  }, [refresh]);

  async function loadMore() {
    if (!userId || !hasMore || locks.current.size) return;
    lock('more'); setActionError('');
    try {
      const data = await feedPage(userId, offset.current);
      if (!alive.current) return;
      offset.current += data.reels.length;
      setReels(current => [...new Map([...current, ...data.reels].map(reel => [reel.id, reel])).values()]);
      setFeedIds(current => [...new Set([...current, ...data.reels.map(reel => reel.id)])]);
      setHasMore(data.hasMore);
    } catch (error) { if (alive.current) setActionError(error instanceof Error ? error.message : 'Could not load more posts.'); }
    finally { unlock('more'); }
  }
  async function toggleSaved(id: string) {
    if (!userId || locks.current.size || socialError) return;
    lock(`save:${id}`); setActionError('');
    const save = !savedIds.includes(id);
    try {
      await setSaved(userId, id, save);
      if (alive.current) setSavedIds(current => save ? [...new Set([...current, id])] : current.filter(item => item !== id));
    } catch (error) { if (alive.current) setActionError(error instanceof Error ? error.message : 'Could not save this post.'); }
    finally { unlock(`save:${id}`); }
  }
  async function toggleFollowing(handle: string) {
    if (!userId || handle === '@you' || locks.current.size || socialError) return;
    const person = following.find(person => person.handle === handle);
    const reel = reels.find(reel => reel.handle === handle);
    const target = person?.id ?? reel?.authorId;
    if (!target) return;
    lock(`follow:${handle}`); setActionError('');
    try {
      await setFollowing(userId, target, !person);
      if (alive.current) setFollowingPeople(current => person ? current.filter(item => item.id !== target) : [...current, { id: target, handle: handleFor(target), name: reel?.creator ?? handle }]);
    } catch (error) { if (alive.current) setActionError(error instanceof Error ? error.message : 'Could not change your following list.'); }
    finally { unlock(`follow:${handle}`); }
  }
  async function updateProfile(name: string, bio: string) {
    if (!userId || profileLoading || profileError || locks.current.size) throw new Error('Please wait for your account to finish loading.');
    lock('profile');
    try {
      const next = await saveProfile(userId, name, bio);
      if (!alive.current) return;
      setProfile(next); setReels(current => current.map(reel => reel.handle === '@you' ? { ...reel, creator: next.name } : reel));
    } finally { unlock('profile'); }
  }
  async function addReel(reel: Reel) {
    if (!userId) throw new Error('Log in to publish a post.');
    if (socialError || socialLoading || locks.current.size) throw new Error('Wait for your account to load or retry the connection first.');
    lock('publish');
    try {
      const created = await publishPost(userId, reel);
      if (!alive.current) return;
      setReels(current => [created, ...current]); setFeedIds(current => [created.id, ...current]);
      offset.current++;
    } finally { unlock('publish'); }
  }
  return <StateContext.Provider value={{ reels, feedIds, savedIds, followingHandles: following.map(person => person.handle), following, followers,
    profile, profileLoading, profileError, socialLoading, socialError, pending, hasMore,
    retryProfile: refresh, refresh, loadMore, toggleSaved, toggleFollowing, updateProfile, addReel, cacheReel, removeCachedReel }}>
    {userId && (socialError || actionError || socialLoading) ? <View style={{ padding: 12, backgroundColor: colors.accentSoft }}>
      <Text accessibilityRole={socialError || actionError ? 'alert' : undefined} style={{ fontSize: 14, color: colors.ink }}>{socialError || actionError || 'Loading your account…'}</Text>
      {!socialLoading && <Pressable onPress={() => void refresh()} accessibilityRole="button"><Text style={{ color: colors.accent, fontSize: 15, paddingTop: 8 }}>Retry / refresh</Text></Pressable>}
    </View> : null}
    {children}
  </StateContext.Provider>;
}
export function useAppState() {
  const state = useContext(StateContext);
  if (!state) throw new Error('AppStateProvider is missing');
  return state;
}
