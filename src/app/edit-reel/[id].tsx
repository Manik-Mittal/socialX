import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { useAppState } from '../../state';
import { getSharedPost } from '../../backend/chat';
import { deletePost, editPost, removePostMedia } from '../../backend/managePosts';
import { ChatError, chatStyles as s } from '../../components/ChatUI';
import { categories, colors } from '../../theme';
import type { Reel } from '../../data';
export default function EditReelRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Editor key={id} id={id} />;
}
function Editor({ id }: { id: string }) {
  const { session } = useAuth(); const me = session!.user.id;
  const { cacheReel, removeCachedReel } = useAppState();
  const [reel, setReel] = useState<Reel | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deletedPath, setDeletedPath] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useFocusEffect(useCallback(() => {
    let live = true;
    void getSharedPost(id, me).then(post => { if (!live) return; if (post.authorId !== me) { setError('You can only edit your own posts.'); return; } setReel(post); setError(''); }).catch(e => { if (live) setError((e as Error).message); });
    return () => { live = false; };
    // Explicit retry reloads this same post.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, me, retry]));
  async function save() {
    if (!reel || lock.current) return; lock.current = true; setBusy(true); setError('');
    try { const details = await editPost(id, me, reel); cacheReel({ ...reel, ...details }); if (mounted.current) router.replace('/profile'); }
    catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function remove() {
    if (!reel || lock.current || !confirm) return; lock.current = true; setBusy(true); setError('');
    try {
      const path = deletedPath ?? await deletePost(id, me);
      if (mounted.current) setDeletedPath(path);
      if (!deletedPath) removeCachedReel(id);
      await removePostMedia(path, me);
      if (mounted.current) router.replace('/profile');
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={s.header}><Text style={s.heading}>{deletedPath ? 'Reel deleted' : 'Edit reel'}</Text><Pressable disabled={busy} accessibilityRole="button" style={s.icon} onPress={() => router.replace('/profile')}><Text style={s.link}>Close</Text></Pressable></View>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
      {!!error && <Text accessibilityRole="alert" style={[s.text, s.notice]}>{error}</Text>}
      {!reel && <><Text style={s.muted}>{error ? 'Reel unavailable' : 'Loading reel…'}</Text>{!!error && <ChatError error="Retry loading" retry={() => setRetry(n => n + 1)} />}</>}
      {reel && !deletedPath && <>
        <Text style={s.muted}>Update the title, caption, city, and category of your published reel.</Text>
        <Text style={s.text}>Title</Text><TextInput accessibilityLabel="Reel title" style={s.input} value={reel.title} maxLength={70} editable={!busy} onChangeText={title => setReel({ ...reel, title })} />
        <Text style={s.text}>Caption</Text><TextInput accessibilityLabel="Reel caption" style={s.input} value={reel.description} multiline maxLength={240} editable={!busy} onChangeText={description => setReel({ ...reel, description })} />
        <Text style={s.text}>City</Text><TextInput accessibilityLabel="City" style={s.input} value={reel.city} maxLength={40} editable={!busy} onChangeText={city => setReel({ ...reel, city })} />
        <Text style={s.text}>Category</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{categories.filter(c => c !== 'All').map(category => <Pressable key={category} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: reel.category === category }} onPress={() => setReel({ ...reel, category })} style={{ padding: 12, borderRadius: 14, backgroundColor: reel.category === category ? colors.accentSelected : colors.search }}><Text style={s.link}>{category}</Text></Pressable>)}</View>
        <Pressable disabled={busy || confirm} accessibilityRole="button" onPress={() => void save()} style={[s.icon, { backgroundColor: colors.accent, borderRadius: 14, alignItems: 'center', opacity: busy || confirm ? 0.5 : 1 }]}><Text style={[s.link, { color: colors.white }]}>{busy ? 'Saving…' : 'Save changes'}</Text></Pressable>
        {!confirm && <Pressable disabled={busy} accessibilityRole="button" onPress={() => setConfirm(true)} style={s.icon}><Text style={{ color: '#AA2440', fontSize: 17, fontWeight: '700' }}>Delete reel</Text></Pressable>}
      </>}
      {confirm && <View style={[s.notice, { borderRadius: 14, gap: 12 }]}><Text style={s.text}>{deletedPath ? 'The post is removed. Retry to finish deleting its media file.' : 'Permanently delete this reel? Its likes, comments, saves and view records will also be removed. Shared chats will show the reel as unavailable. This cannot be undone.'}</Text>
        {!deletedPath && <Pressable disabled={busy} accessibilityRole="button" onPress={() => setConfirm(false)} style={s.icon}><Text style={s.link}>Keep reel</Text></Pressable>}
        <Pressable disabled={busy} accessibilityRole="button" onPress={() => void remove()} style={[s.icon, { backgroundColor: '#AA2440', borderRadius: 12, alignItems: 'center' }]}><Text style={[s.link, { color: colors.white }]}>{busy ? 'Deleting…' : deletedPath ? 'Retry file cleanup' : 'Delete permanently'}</Text></Pressable>
      </View>}
    </ScrollView>
  </SafeAreaView>;
}
