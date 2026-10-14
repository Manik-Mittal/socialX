import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { Reel } from '../data';
import { colors } from '../theme';
import { useAppState } from '../state';

function ReelVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={styles.media} nativeControls contentFit="cover" />;
}

function ReelMedia({ reel }: { reel: Reel }) {
  if (reel.mediaMissing) return <View style={[styles.media, styles.illustration]}><Text style={styles.description}>Media unavailable. Refresh to retry.</Text></View>;
  if (reel.mediaType === 'video' && reel.mediaUri) {
    return <ReelVideo uri={reel.mediaUri} />;
  }
  if (reel.mediaType === 'image' && reel.mediaUri) {
    return <Image source={{ uri: reel.mediaUri }} style={styles.media} resizeMode="cover" />;
  }
  return <View style={[styles.media, styles.illustration]}><Text style={styles.description}>Media unavailable. Refresh to retry.</Text></View>;
}

export function ReelCard({ reel }: { reel: Reel }) {
  const { savedIds, toggleSaved, followingHandles, toggleFollowing, pending, socialLoading } = useAppState();
  const saved = savedIds.includes(reel.id);
  const following = followingHandles.includes(reel.handle);
  return (
    <View style={styles.card}>
      <View style={styles.authorHeader}><View style={styles.creatorAvatar}><Text style={styles.creatorInitial}>{reel.creator[0]}</Text></View><View style={styles.creatorText}><Text style={styles.creator}>{reel.creator}</Text><Text style={styles.handle}>{reel.city} · {reel.mediaType === 'video' ? 'Reel' : 'Story'}</Text></View>{reel.handle !== '@you' ? <Pressable disabled={pending.length > 0 || socialLoading} onPress={() => toggleFollowing(reel.handle)} style={styles.followButton} accessibilityRole="button" accessibilityLabel={`${following ? 'Unfollow' : 'Follow'} ${reel.creator}`}><Text style={styles.followText}>{following ? 'Following' : '+ Follow'}</Text></Pressable> : null}</View>
      <ReelMedia reel={reel} />
      <View style={styles.content}>
        <View style={styles.topline}>
          <Text style={styles.category}>{reel.category.toUpperCase()} · {reel.city}</Text>
          {reel.sponsored ? <Text style={styles.sponsored}>PAID PARTNERSHIP</Text> : null}
        </View>
        <Text style={styles.title}>{reel.title}</Text>
        <Text style={styles.description}>{reel.description}</Text>
        <View style={styles.footer}>
          <View style={styles.creatorText}>
            <Text style={styles.handle}>A discovery worth keeping.</Text>
          </View>
          {reel.mediaType === 'video' && <Pressable onPress={() => router.push({ pathname: '/messages', params: { postId: reel.id } })} style={[styles.saveButton, { marginRight: 8 }]} accessibilityRole="button" accessibilityLabel="Share reel in a chat"><Ionicons name="paper-plane-outline" size={20} color={colors.accent} /><Text style={styles.saveText}>Share</Text></Pressable>}
          <Pressable disabled={pending.length > 0 || socialLoading} onPress={() => toggleSaved(reel.id)} style={[styles.saveButton, saved && styles.savedButton]} accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved reel' : reel.action}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={18} color={colors.accent} />
            <Text style={styles.saveText}>{pending.includes(`save:${reel.id}`) ? 'Saving…' : saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, marginBottom: 18 },
  media: { width: '100%', height: 350 },
  authorHeader: { padding: 13, flexDirection: 'row', alignItems: 'center' },
  posterCaption: { position: 'absolute', bottom: 25, left: 23, right: 23 },
  posterKicker: { color: colors.ink, fontSize: 12, letterSpacing: 2, fontWeight: '800', marginBottom: 8 },
  posterTitle: { color: colors.ink, fontSize: 32, lineHeight: 35, fontWeight: '900', letterSpacing: -1, maxWidth: 290 },
  illustration: { alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 100, marginBottom: 65, transform: [{ rotate: '-12deg' }] },
  mediaTag: { position: 'absolute', left: 18, top: 18, fontSize: 13, fontWeight: '800', letterSpacing: 1.3, color: colors.ink, backgroundColor: '#FFFFFFB8', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 10 },
  content: { padding: 17 },
  topline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  category: { color: colors.accent, fontSize: 13, fontWeight: '800', letterSpacing: 1.1 },
  sponsored: { color: colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  title: { color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 10 },
  description: { color: colors.muted, fontSize: 16, lineHeight: 23, marginTop: 5 },
  footer: { flexDirection: 'row', alignItems: 'center', marginTop: 18 },
  creatorAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.accentSoft, justifyContent: 'center', alignItems: 'center' },
  creatorInitial: { fontSize: 18, fontWeight: '800', color: colors.accent },
  creatorText: { flex: 1, marginLeft: 9 },
  creator: { fontSize: 15, fontWeight: '800', color: colors.ink },
  handle: { fontSize: 14, color: colors.muted },
  followButton: { borderRadius: 11, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 9, paddingVertical: 9, marginRight: 7 },
  followText: { color: colors.accent, fontSize: 14, fontWeight: '800' },
  saveButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.accentSoft, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  savedButton: { backgroundColor: colors.accentSelected },
  saveText: { color: colors.accent, fontSize: 15, fontWeight: '800' },
});

