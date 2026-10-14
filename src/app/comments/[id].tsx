import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { addComment, engagementError, getComments, type Comment } from '../../backend/engagement';
import { validId } from '../../backend/chat';
import { ChatError, chatStyles as s } from '../../components/ChatUI';
import { useEngagement } from '../../engagement';
import { colors } from '../../theme';

export default function CommentsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Comments key={id} id={id} />;
}
function Comments({ id }: { id: string }) {
  const { session } = useAuth();
  const { refresh, entries } = useEngagement();
  const [items, setItems] = useState<Comment[]>([]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const lock = useRef(false);
  const writeLock = useRef(false);
  const alive = useRef(true);
  const retryDraft = useRef<{ text: string; nonce: string } | null>(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const load = useCallback(async (before?: number) => {
    if (lock.current) return;
    lock.current = true; setLoading(true);
    try {
      if (!validId(id)) throw new Error('Invalid reel link.');
      const rows = await getComments(id, before);
      if (!alive.current) return;
      setItems(current => before ? [...new Map([...current, ...rows].map(row => [row.id, row])).values()] : rows);
      setHasMore(rows.length === 30); setError('');
    } catch (e) { if (alive.current) setError(engagementError(e)); }
    finally { lock.current = false; if (alive.current) setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { void load(); void refresh(id); }, [id, load, refresh]));
  async function submit() {
    if (writeLock.current || loading || !body.trim() || !session) return;
    writeLock.current = true; setSending(true); setSendError('');
    if (retryDraft.current?.text !== body) retryDraft.current = { text: body, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
    try {
      await addComment(id, session.user.id, body, retryDraft.current.nonce);
      if (!alive.current) return;
      setBody(''); retryDraft.current = null;
      await Promise.all([load(), refresh(id)]);
    } catch (e) { if (alive.current) setSendError(`${engagementError(e)} Your comment is kept. Tap Post to retry.`); }
    finally { writeLock.current = false; if (alive.current) setSending(false); }
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={s.header}><Text style={s.heading}>Comments{entries[id]?.stats ? ` · ${entries[id].stats!.comments}` : ''}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close comments" style={s.icon} onPress={() => router.canGoBack() ? router.back() : router.replace('/reels')}><Text style={s.link}>Done</Text></Pressable></View>
    <ChatError error={error} retry={() => void load()} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList data={items} keyExtractor={item => String(item.id)} keyboardShouldPersistTaps="handled" refreshing={loading} onRefresh={() => { void load(); void refresh(id); }} contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => <View style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6 }}><Text style={[s.text, { fontWeight: '800' }]}>{item.profiles?.display_name ?? 'Creator'}{item.user_id === session?.user.id ? ' · You' : ''}</Text><Text selectable style={s.text}>{item.body}</Text><Text style={s.muted}>{new Date(item.created_at).toLocaleString()}</Text></View>}
        ListEmptyComponent={<View style={s.empty}><Text style={s.text}>{loading ? 'Loading comments…' : error ? 'Comments unavailable' : 'Start the conversation'}</Text>{!loading && !error && <Text style={s.muted}>Be the first to leave a comment.</Text>}</View>}
        ListFooterComponent={hasMore ? <Pressable disabled={loading} accessibilityRole="button" onPress={() => void load(items[items.length - 1]?.id)} style={s.icon}><Text style={s.link}>Load earlier comments</Text></Pressable> : null} />
      {!!sendError && <Text accessibilityRole="alert" style={[s.text, s.notice]}>{sendError}</Text>}
      <View style={{ backgroundColor: colors.white, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 }}>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-end' }}><TextInput style={[s.input, { flex: 1, maxHeight: 120 }]} value={body} onChangeText={setBody} multiline maxLength={1000} editable={!sending} placeholder="Add a comment…" accessibilityLabel="Your comment" /><Pressable accessibilityRole="button" disabled={sending || loading || !!error || !body.trim()} onPress={() => void submit()} style={[s.icon, { opacity: sending || loading || !!error || !body.trim() ? 0.4 : 1 }]}><Text style={s.link}>{sending ? 'Posting…' : 'Post'}</Text></Pressable></View>
        <Text style={[s.muted, { fontSize: 12 }]}>{body.length}/1,000 · Visible to signed-in members</Text>
      </View>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}
