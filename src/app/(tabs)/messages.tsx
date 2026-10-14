import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { chatError, findContacts, inbox, type Contact, type Conversation } from '../../backend/chat';
import { ChatError, ChatHeader, chatStyles as s } from '../../components/ChatUI';
import { colors } from '../../theme';

export default function MessagesScreen() {
  const { session } = useAuth();
  const userId = session!.user.id;
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const [items, setItems] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchError, setSearchError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => () => { mounted.current = false; }, []);
  const load = useCallback(async (offset = 0) => {
    if (busy.current) return;
    busy.current = true;
    try {
      const rows = await inbox(offset);
      if (!mounted.current) return;
      setItems(old => offset ? [...new Map([...old, ...rows].map(row => [row.peer_id, row])).values()] : rows);
      setHasMore(rows.length === 30); setError('');
    } catch (e) { if (mounted.current) setError(chatError(e)); }
    finally { busy.current = false; if (mounted.current) setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => {
    mounted.current = true;
    void load();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 15000);
    return () => clearInterval(timer);
  }, [load]));
  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      if (!active) return;
      setSearching(true); setSearchError('');
      try { const found = await findContacts(query, userId); if (active) setContacts(found); }
      catch (e) { if (active) setSearchError(chatError(e)); }
      finally { if (active) setSearching(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [query, userId]);
  function open(id: string) {
    router.push({ pathname: '/chat/[userId]', params: { userId: id, ...(postId ? { postId } : {}) } });
  }
  const isSearch = query.trim().length >= 2;
  return <SafeAreaView style={s.screen} edges={['top']}>
    <ChatHeader title={postId ? 'Share a reel' : 'Messages'} />
    {postId && <View style={s.notice}><Text style={s.text}>Choose someone, then tap Send in the chat.</Text><Pressable accessibilityRole="button" onPress={() => router.setParams({ postId: undefined })} style={s.icon}><Text style={s.link}>Cancel sharing</Text></Pressable></View>}
    <View style={{ padding: 16, gap: 8 }}><TextInput value={query} onChangeText={text => { setQuery(text); setContacts([]); setSearching(text.trim().length >= 2); }} placeholder="Find someone by name" accessibilityLabel="Search people to message" style={s.input} maxLength={40} /><Text style={s.muted}>Enter at least 2 letters to start a new chat.</Text></View>
    <ChatError error={error} retry={() => void load()} />
    {isSearch ? <FlatList data={contacts} keyboardShouldPersistTaps="handled" keyExtractor={item => item.id} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => open(item.id)} style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}><Text style={s.text}>{item.display_name}</Text><Text style={s.muted}>@creator_{item.id.slice(0, 8)}</Text></Pressable>}
      ListEmptyComponent={<View style={s.empty}><Text style={s.muted}>{searching ? 'Searching…' : searchError || 'No matching people. Try another name.'}</Text></View>}
      ListFooterComponent={contacts.length === 30 ? <Text style={[s.muted, { padding: 16 }]}>Showing 30 matches. Narrow your search to find someone.</Text> : null} />
      : <FlatList data={items} keyExtractor={item => item.peer_id} refreshing={loading} onRefresh={() => void load()} renderItem={({ item }) => <Pressable accessibilityRole="button" onPress={() => open(item.peer_id)} style={{ padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={s.link}>{item.display_name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1 }}><Text style={[s.text, { fontWeight: '700' }]}>{item.display_name}</Text><Text numberOfLines={1} style={s.muted}>{item.kind === 'reel' ? 'Shared a reel' : item.body}</Text></View><Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>}
      ListEmptyComponent={<View style={s.empty}><Ionicons name="chatbubbles-outline" size={48} color={colors.accent} /><Text style={s.text}>{loading ? 'Loading conversations…' : error ? 'Chats unavailable' : 'Start a conversation'}</Text><Text style={s.muted}>Find a friend above to send a message or a reel.</Text></View>}
      ListFooterComponent={hasMore ? <Pressable accessibilityRole="button" style={s.icon} onPress={() => void load(items.length)}><Text style={[s.link, { textAlign: 'center' }]}>Load more conversations</Text></Pressable> : null} />}
  </SafeAreaView>;
}
