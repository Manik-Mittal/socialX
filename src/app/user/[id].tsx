import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FlatList, Image, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../auth';
import { personPosts, publicProfile } from '../../backend/people';
import { setFollowing } from '../../backend/social';
import { useAppState } from '../../state';
import { chatStyles as s, ChatError } from '../../components/ChatUI';
import { colors } from '../../theme';
import type { Reel } from '../../data';
export default function PublicProfileRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PublicProfile key={id} id={id} />;
}
function PublicProfile({ id }: { id: string }) {
  const { session } = useAuth(); const me = session!.user.id;
  const { refresh: refreshAccount } = useAppState();
  const [profile, setProfile] = useState<Awaited<ReturnType<typeof publicProfile>> | null>(null);
  const [posts, setPosts] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowingBusy] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false); const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const load = useCallback(async () => {
    if (lock.current) return;
    lock.current = true; setLoading(true);
    try { const [person, page] = await Promise.all([publicProfile(id, me), personPosts(id, me)]); if (live.current) { setProfile(person); setPosts(page.posts); setHasMore(page.hasMore); setError(''); } }
    catch (e) { if (live.current) setError((e as Error).message || 'Could not load profile.'); }
    finally { lock.current = false; if (live.current) setLoading(false); }
  }, [id, me]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  async function more() {
    if (lock.current || !hasMore) return; lock.current = true; setLoading(true);
    try { const page = await personPosts(id, me, posts.length); if (live.current) { setPosts(old => [...new Map([...old, ...page.posts].map(post => [post.id, post])).values()]); setHasMore(page.hasMore); setError(''); } }
    catch (e) { if (live.current) setError((e as Error).message); }
    finally { lock.current = false; if (live.current) setLoading(false); }
  }
  async function follow() {
    if (!profile || lock.current || id === me) return; lock.current = true; setFollowingBusy(true);
    try { await setFollowing(me, id, !profile.isFollowing); if (live.current) { setProfile({ ...profile, isFollowing: !profile.isFollowing, followers: Math.max(0, profile.followers + (profile.isFollowing ? -1 : 1)) }); setError(''); refreshAccount(); } }
    catch (e) { if (live.current) setError((e as Error).message || 'Could not update following.'); }
    finally { lock.current = false; if (live.current) setFollowingBusy(false); }
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/search')} style={s.icon}><Ionicons name="arrow-back" size={24} color={colors.ink} /></Pressable><Text numberOfLines={1} style={s.heading}>{profile?.person.display_name ?? 'Profile'}</Text></View>
    <ChatError error={error} retry={() => void load()} />
    <FlatList data={posts} numColumns={3} keyExtractor={item => item.id} refreshing={loading} onRefresh={() => void load()} contentContainerStyle={{ padding: 12 }}
      ListHeaderComponent={profile ? <View style={{ padding: 8, gap: 16, marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}><View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={[s.link, { fontSize: 32 }]}>{profile.person.display_name[0]?.toUpperCase()}</Text></View>
          {[['Posts', profile.posts], ['Followers', profile.followers], ['Following', profile.following]].map(([label, count]) => <View key={label} style={{ flex: 1, alignItems: 'center' }}><Text style={[s.text, { fontWeight: '800', fontSize: 20 }]}>{count}</Text><Text style={[s.muted, { fontSize: 13 }]}>{label}</Text></View>)}</View>
        <View><Text style={[s.text, { fontWeight: '800' }]}>{profile.person.display_name}</Text><Text style={s.muted}>@creator_{id.slice(0, 8)}</Text>{!!profile.person.bio && <Text style={[s.text, { marginTop: 8 }]}>{profile.person.bio}</Text>}</View>
        <View style={{ flexDirection: 'row', gap: 10 }}>{id === me ? <Pressable accessibilityRole="button" style={[s.icon, { flex: 1, backgroundColor: colors.accentSoft, borderRadius: 12, alignItems: 'center' }]} onPress={() => router.push('/profile')}><Text style={s.link}>Edit your profile</Text></Pressable> : <><Pressable accessibilityRole="button" disabled={loading || following} onPress={() => void follow()} style={[s.icon, { flex: 1, backgroundColor: colors.accent, borderRadius: 12, alignItems: 'center', opacity: following ? 0.5 : 1 }]}><Text style={[s.link, { color: colors.white }]}>{following ? 'Saving…' : profile.isFollowing ? 'Following' : 'Follow'}</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/chat/[userId]', params: { userId: id } })} style={[s.icon, { flex: 1, backgroundColor: colors.accentSoft, borderRadius: 12, alignItems: 'center' }]}><Text style={s.link}>Message</Text></Pressable></>}</View>
        <Text style={[s.link, { textAlign: 'center', paddingTop: 12 }]}>Posts & reels</Text>
      </View> : null}
      renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} onPress={() => router.push({ pathname: '/post/[id]', params: { id: item.id } })} style={{ width: '33.333%', aspectRatio: 0.78, padding: 3 }}><View style={{ flex: 1, borderRadius: 10, overflow: 'hidden', backgroundColor: colors.darkSurface, justifyContent: 'flex-end', padding: 10 }}>{item.mediaType === 'image' && !!item.mediaUri ? <Image source={{ uri: item.mediaUri }} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }} /> : <Ionicons name="play-circle-outline" size={34} color={colors.white} style={{ alignSelf: 'center', marginBottom: 20 }} />}<Text numberOfLines={2} style={{ color: colors.white, fontSize: 13, fontWeight: '700', backgroundColor: '#00000066', padding: 4 }}>{item.title}</Text></View></Pressable>}
      ListEmptyComponent={<View style={s.empty}><Text style={s.muted}>{loading ? 'Loading profile…' : error ? 'Could not load posts.' : 'No posts yet.'}</Text></View>}
      ListFooterComponent={hasMore ? <Pressable disabled={loading} accessibilityRole="button" onPress={() => void more()} style={s.icon}><Text style={[s.link, { textAlign: 'center' }]}>Load more posts</Text></Pressable> : null} />
  </SafeAreaView>;
}
