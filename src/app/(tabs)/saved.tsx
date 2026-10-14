import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReelCard } from '../../components/ReelCard';
import { useAppState } from '../../state';
import { colors } from '../../theme';

export default function SavedScreen() {
  const { reels, savedIds, socialLoading, socialError, refresh } = useAppState();
  const saved = reels.filter(reel => savedIds.includes(reel.id));
  return <SafeAreaView style={styles.screen} edges={['top']}>
    <FlatList refreshing={socialLoading} onRefresh={refresh} data={saved} keyExtractor={item => item.id} renderItem={({ item }) => <ReelCard reel={item} />} contentContainerStyle={styles.list}
      ListHeaderComponent={<><Text style={styles.eyebrow}>YOUR COLLECTION</Text><Text style={styles.heading}>Saved stories</Text><Text style={styles.subheading}>The things you want to come back to.</Text></>}
      ListEmptyComponent={<View style={styles.empty}><Text style={styles.icon}>🔖</Text><Text style={styles.emptyTitle}>{socialLoading ? 'Loading your collection…' : socialError ? 'Could not load saved posts' : 'Your list starts here'}</Text><Text style={styles.emptyText}>Save reels you love and find them here anytime.</Text><Pressable onPress={() => router.replace('/')} style={styles.button}><Text style={styles.buttonText}>Explore stories</Text></Pressable></View>} />
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas }, list: { paddingHorizontal: 18, paddingTop: 24, paddingBottom: 30, flexGrow: 1 },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 1.4, color: colors.accent },
  heading: { fontSize: 28, fontWeight: '800', color: colors.ink, marginTop: 5 }, subheading: { fontSize: 16, color: colors.muted, marginTop: 5, marginBottom: 24 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 90 }, icon: { fontSize: 55 },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: colors.ink, marginTop: 12 }, emptyText: { fontSize: 16, color: colors.muted, marginTop: 6, textAlign: 'center' },
  button: { backgroundColor: colors.accent, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 13, marginTop: 22 }, buttonText: { color: colors.white, fontWeight: '800', fontSize: 16 },
});

