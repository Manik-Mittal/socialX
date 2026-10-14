import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { searchPeople, type PublicPerson } from '../backend/people';
import { chatStyles as s } from '../components/ChatUI';
import { colors } from '../theme';
export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<PublicPerson[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const generation = useRef(0);
  const busy = useRef(false);
  useEffect(() => {
    const version = ++generation.current;
    busy.current = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try { const rows = await searchPeople(query); if (version === generation.current) { setItems(rows); setHasMore(rows.length === 30); setError(''); } }
      catch { if (version === generation.current) setError('Could not search. Check your connection and retry.'); }
      finally { if (version === generation.current) setLoading(false); }
    }, 300);
    return () => { clearTimeout(timer); generation.current = version + 1; };
  }, [query, retry]);
  async function more() {
    if (busy.current || loading || !hasMore) return;
    const version = generation.current; busy.current = true; setLoading(true);
    try { const rows = await searchPeople(query, items.length); if (version === generation.current) { setItems(old => [...new Map([...old, ...rows].map(row => [row.id, row])).values()]); setHasMore(rows.length === 30); setError(''); } }
    catch { if (version === generation.current) setError('Could not load more people. Retry your search.'); }
    finally { if (version === generation.current) { busy.current = false; setLoading(false); } }
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <View style={s.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to Discover" style={s.icon} onPress={() => router.canGoBack() ? router.back() : router.replace('/')}><Ionicons name="arrow-back" size={24} color={colors.ink} /></Pressable><Text style={s.heading}>Find people</Text></View>
    <View style={{ padding: 16 }}><TextInput autoFocus style={s.input} placeholder="Search people by name" accessibilityLabel="Search people by name" maxLength={40} value={query} onChangeText={text => { generation.current++; setQuery(text); setItems([]); setError(''); setHasMore(false); setLoading(text.trim().length >= 2); }} autoCorrect={false} /><Text style={[s.muted, { marginTop: 8 }]}>Search accounts, including people who haven’t posted yet.</Text></View>
    {!!error && <Pressable accessibilityRole="button" onPress={() => setRetry(value => value + 1)} style={s.notice}><Text style={s.text}>{error} Tap to retry.</Text></Pressable>}
    <FlatList data={items} keyboardShouldPersistTaps="handled" keyExtractor={item => item.id} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={`Open ${item.display_name}'s profile`} onPress={() => router.push({ pathname: '/user/[id]', params: { id: item.id } })} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={[s.link, { fontSize: 24 }]}>{item.display_name[0]?.toUpperCase()}</Text></View><View style={{ flex: 1 }}><Text style={[s.text, { fontWeight: '800' }]}>{item.display_name}</Text><Text style={s.muted}>@creator_{item.id.slice(0, 8)}</Text>{!!item.bio && <Text numberOfLines={1} style={s.muted}>{item.bio}</Text>}</View><Ionicons name="chevron-forward" size={20} color={colors.muted} />
    </Pressable>} ListEmptyComponent={<View style={s.empty}><Ionicons name="search-outline" size={42} color={colors.accent} /><Text style={s.text}>{query.trim().length < 2 ? 'Enter at least 2 letters' : loading ? 'Searching…' : error ? 'Search unavailable' : 'No people found'}</Text></View>}
      ListFooterComponent={hasMore ? <Pressable disabled={loading} onPress={() => void more()} accessibilityRole="button" style={s.icon}><Text style={[s.link, { textAlign: 'center' }]}>{loading ? 'Loading…' : 'More results'}</Text></Pressable> : null} />
  </SafeAreaView>;
}
