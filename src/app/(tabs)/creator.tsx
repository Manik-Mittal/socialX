import { GradientFill } from '../../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../state';
import { colors } from '../../theme';

export default function CreatorScreen() {
  const { reels, followers, following, savedIds, socialLoading, socialError, refresh } = useAppState();
  const myPosts = reels.filter(reel => reel.handle === '@you');
  return <SafeAreaView style={styles.screen} edges={['top']}><ScrollView contentContainerStyle={styles.content}>
    <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Back to profile" style={styles.backButton}><Ionicons name="arrow-back" size={21} color={colors.ink} /><Text style={styles.backText}>Profile</Text></Pressable>
    <Text style={styles.eyebrow}>CREATE · CONNECT · GROW</Text><Text style={styles.heading}>Creator studio.</Text>
    <Text style={styles.subheading}>Your publishing activity and community.</Text>
    <View style={styles.balanceCard}><GradientFill tone="dark" radius={24} /><Text style={styles.balanceLabel}>Published reels</Text><Text style={styles.balance}>{socialLoading || socialError ? '—' : myPosts.filter(post => post.mediaType === 'video').length}</Text><Text style={styles.balanceNote}>From your published posts.</Text></View>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : myPosts.length}</Text><Text style={styles.statLabel}>Posts</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : followers.length}</Text><Text style={styles.statLabel}>Followers</Text></View></View>
    <View style={styles.stats}><View style={styles.stat}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : savedIds.length}</Text><Text style={styles.statLabel}>Saved posts</Text></View><View style={styles.divider} /><View style={styles.stat}><Text style={styles.statNumber}>{socialLoading || socialError ? '—' : following.length}</Text><Text style={styles.statLabel}>Following</Text></View></View>
    <Pressable onPress={refresh} disabled={socialLoading} style={styles.backButton} accessibilityRole="button"><Text style={styles.backText}>Refresh activity</Text></Pressable>
    <Pressable onPress={() => router.push('/create')} style={styles.button}><GradientFill /><Ionicons name="add-circle-outline" color={colors.white} size={20} /><Text style={styles.buttonText}>Create a reel</Text></Pressable>
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  backButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, alignSelf: 'flex-start', marginBottom: 14 }, backText: { fontSize: 16, fontWeight: '700', color: colors.ink },
  screen: { flex: 1, backgroundColor: colors.canvas }, content: { padding: 18, paddingTop: 24, paddingBottom: 34 },
  eyebrow: { color: colors.accent, fontWeight: '800', fontSize: 13, letterSpacing: 1.4 }, heading: { fontSize: 27, fontWeight: '800', color: colors.ink, marginTop: 7 }, subheading: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 7 },
  balanceCard: { backgroundColor: colors.ink, borderRadius: 24, padding: 23, marginTop: 25 }, balanceTop: { flexDirection: 'row', justifyContent: 'space-between' }, demo: { color: colors.onDarkMuted, fontSize: 13, fontWeight: '800', letterSpacing: 1 }, balanceLabel: { color: colors.onDarkAccent, fontSize: 16, marginTop: 23 }, balance: { color: colors.white, fontSize: 39, fontWeight: '900', marginTop: 3 }, balanceNote: { color: colors.onDarkMuted, fontSize: 14, marginTop: 2 },
  stats: { backgroundColor: colors.white, borderRadius: 19, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', marginTop: 14, paddingVertical: 18 }, stat: { flex: 1, alignItems: 'center' }, statNumber: { fontSize: 22, fontWeight: '800', color: colors.ink }, statLabel: { fontSize: 14, color: colors.muted, marginTop: 3 }, divider: { width: 1, backgroundColor: colors.border },
  sectionTitle: { fontSize: 19, fontWeight: '800', color: colors.ink, marginTop: 30, marginBottom: 14 }, step: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, flexDirection: 'row', gap: 15, marginBottom: 10 }, stepNumber: { color: colors.accent, fontSize: 19, fontWeight: '900' }, stepTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' }, stepBody: { color: colors.muted, fontSize: 14, marginTop: 4, maxWidth: 245, lineHeight: 20 },
  button: { backgroundColor: colors.ink, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, padding: 16, marginTop: 18 }, buttonText: { color: colors.white, fontSize: 17, fontWeight: '800' },
});



