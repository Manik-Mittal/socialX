import { GradientFill } from '../../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReelCard } from '../../components/ReelCard';
import { useAppState } from '../../state';
import { categories, categoryColors, colors, type Category } from '../../theme';

export default function DiscoverScreen() {
  const { reels, feedIds, followingHandles, socialLoading, socialError, refresh, loadMore, hasMore, pending } = useAppState();
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');
  const [feed, setFeed] = useState('For you');
  const creators = [...new Map(reels.filter(r => r.handle !== '@you').map(r => [r.handle, r])).values()];
  const filtered = useMemo(() => reels.filter(reel =>
    feedIds.includes(reel.id) &&
    (feed === 'For you' || followingHandles.includes(reel.handle)) &&
    (category === 'All' || reel.category === category) &&
    `${reel.title} ${reel.description} ${reel.creator} ${reel.city}`.toLowerCase().includes(query.toLowerCase().trim()),
  ), [category, query, reels, feedIds, feed, followingHandles]);
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <View style={styles.header}><View><Text style={styles.logo}>social<Text style={styles.logoX}>x.</Text></Text><Text style={styles.tagline}>A little discovery, every day.</Text></View><Pressable style={styles.plus} onPress={() => router.push('/create')} accessibilityRole="button" accessibilityLabel="Create a reel"><GradientFill radius={14} /><Ionicons name="add" size={24} color={colors.white} /></Pressable></View>
    <FlatList refreshing={socialLoading} onRefresh={refresh} data={filtered} keyExtractor={item => item.id} renderItem={({ item }) => <ReelCard reel={item} />} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}
      ListHeaderComponent={<>
        <View style={styles.feedTabs}>{['For you', 'Following'].map(label => <Pressable key={label} onPress={() => setFeed(label)} style={[styles.feedTab, feed === label && styles.feedTabActive]} accessibilityRole="button" accessibilityState={{ selected: feed === label }}><Text style={[styles.feedText, feed === label && styles.feedTextActive]}>{label}</Text></Pressable>)}</View>
        <View style={styles.searchBox}><Ionicons name="search-outline" size={19} color={colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder="Find your next obsession" placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel="Search stories or cities" />{query ? <Pressable onPress={() => setQuery('')} accessibilityRole="button" accessibilityLabel="Clear search"><Ionicons name="close-circle" size={20} color={colors.muted} /></Pressable> : null}</View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.people}>
          <Pressable style={styles.person} onPress={() => router.push('/create')} accessibilityRole="button"><View style={styles.createRing}><Ionicons name="add" size={25} color={colors.accent} /></View><Text style={styles.personName}>Create</Text></Pressable>
          {creators.map(person => <Pressable key={person.handle} style={styles.person} onPress={() => { setFeed('For you'); setCategory('All'); setQuery(person.creator); }} accessibilityRole="button" accessibilityLabel={`See ${person.creator}'s posts`}><View style={styles.ring}><GradientFill radius={31} /><View style={[styles.avatar, { backgroundColor: categoryColors[person.category] }]}><Text style={styles.initial}>{person.creator[0]}</Text></View></View><Text style={styles.personName}>{person.creator}</Text></Pressable>)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories}>{categories.map(item => <Pressable key={item} onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]} accessibilityRole="button" accessibilityState={{ selected: category === item }}><Text style={[styles.chipText, category === item && styles.chipTextActive]}>{item === 'All' ? 'All interests' : item}</Text></Pressable>)}</ScrollView>
        <View style={styles.sectionRow}><Text style={styles.sectionTitle}>{query ? 'Search results' : feed === 'Following' ? 'From your people' : 'Worth your scroll'}</Text><Text style={styles.sectionHint}>{filtered.length} STORIES</Text></View>
      </>}
      ListFooterComponent={hasMore ? <Pressable disabled={socialLoading || pending.length > 0} onPress={loadMore} style={styles.reset}><Text style={styles.resetText}>{pending.includes('more') ? 'Loading…' : 'Load more stories'}</Text></Pressable> : null}
      ListEmptyComponent={<View style={styles.empty}><Ionicons name="sparkles-outline" size={32} color={colors.accent} /><Text style={styles.emptyTitle}>{socialLoading ? 'Loading stories…' : socialError ? 'Could not load stories' : feed === 'Following' ? 'Find your people' : 'Nothing here yet'}</Text><Text style={styles.emptyText}>{feed === 'Following' ? 'Follow creators in For you to build your own feed.' : 'Try another search or interest.'}</Text><Pressable style={styles.reset} onPress={() => { setFeed('For you'); setCategory('All'); setQuery(''); }} accessibilityRole="button"><Text style={styles.resetText}>Explore all stories</Text></Pressable></View>}
    />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, list: { paddingHorizontal: 18, paddingBottom: 24 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, backgroundColor: colors.white },
  logo: { color: colors.ink, fontSize: 33, fontWeight: '900', letterSpacing: -1.8 }, logoX: { color: colors.accent }, tagline: { color: colors.muted, fontSize: 13, marginTop: 1 },
  plus: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.ink, justifyContent: 'center', alignItems: 'center' },
  feedTabs: { flexDirection: 'row', gap: 25, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 16 }, feedTab: { paddingTop: 15, paddingBottom: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' }, feedTabActive: { borderBottomColor: colors.accent }, feedText: { color: colors.muted, fontSize: 19, fontWeight: '700' }, feedTextActive: { color: colors.ink },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.search, borderRadius: 14, paddingHorizontal: 13, height: 44, gap: 9 }, searchInput: { flex: 1, color: colors.ink, fontSize: 16 },
  people: { gap: 16, paddingVertical: 19 }, person: { width: 62, alignItems: 'center', gap: 6 }, ring: { width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderColor: colors.accent, padding: 3 }, avatar: { flex: 1, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }, initial: { fontSize: 23, fontWeight: '800', color: colors.ink }, createRing: { width: 62, height: 62, borderRadius: 31, backgroundColor: colors.accentSoft, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accentBorder, alignItems: 'center', justifyContent: 'center' }, personName: { color: colors.ink, fontSize: 13, fontWeight: '600' },
  categories: { gap: 7, paddingBottom: 5 }, chip: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8 }, chipActive: { backgroundColor: colors.ink, borderColor: colors.ink }, chipText: { fontSize: 14, fontWeight: '700', color: colors.muted }, chipTextActive: { color: colors.white },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 23, marginBottom: 14 }, sectionTitle: { fontSize: 20, fontWeight: '800', color: colors.ink }, sectionHint: { fontSize: 12, fontWeight: '700', letterSpacing: 1.3, color: colors.muted },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 }, emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink }, emptyText: { fontSize: 16, color: colors.muted, textAlign: 'center' }, reset: { backgroundColor: colors.accent, borderRadius: 12, padding: 13, marginTop: 6 }, resetText: { fontSize: 16, color: colors.white, fontWeight: '700' },
});


