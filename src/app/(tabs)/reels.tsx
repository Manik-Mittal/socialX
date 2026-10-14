import { GradientFill } from '../../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Reel } from '../../data';
import { useAppState } from '../../state';
import { colors } from '../../theme';
import { ReelEngagement } from '../../components/ReelEngagement';
import { CreatorViews, useReelView } from '../../components/ReelViews';

type VideoReel = Reel & { mediaUri: string; mediaType: 'video' };
const viewabilityConfig = { itemVisiblePercentThreshold: 70 };

function ReelPage({ reel, height, active }: { reel: VideoReel; height: number; active: boolean }) {
  const { savedIds, toggleSaved, followingHandles, toggleFollowing, pending, socialLoading } = useAppState();
  const player = useVideoPlayer(reel.mediaUri, video => { video.loop = true; });
  useReelView(player, reel.id, reel.authorId, active);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const saved = savedIds.includes(reel.id);
  const [muted, setMuted] = useState(false);
  const following = followingHandles.includes(reel.handle);
  function toggleMute() {
    // Expo exposes audio settings through mutable native player properties.
    // eslint-disable-next-line react-hooks/immutability
    player.muted = !muted;
    setMuted(!muted);
  }

  useEffect(() => {
    if (active) player.play();
    else player.pause();
    // useVideoPlayer releases the native player on unmount. Cleanup must not
    // call methods on it; active=false handles pausing while still mounted.
  }, [active, player]);

  return (
    <View style={[styles.page, { height }]}>
      <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="cover" />
      <View style={styles.shade} pointerEvents="none" />
      <View style={styles.pageContent}>
        <View style={styles.story}>
          <Text style={styles.category}>{reel.category.toUpperCase()} · {reel.city}</Text>
          <Text style={styles.creator}>{reel.handle}</Text>
          <Text style={styles.title}>{reel.title}</Text>
          <CreatorViews id={reel.id} authorId={reel.authorId} dark />
          {reel.description ? <Text style={styles.description}>{reel.description}</Text> : null}
          {reel.sponsored ? <Text style={styles.sponsored}>PAID PARTNERSHIP</Text> : null}
        </View>
        <View style={styles.actions}>
          <ReelEngagement id={reel.id} dark />
          <Pressable onPress={toggleMute} style={styles.action} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute reel' : 'Mute reel'}><Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={25} color={colors.white} /><Text style={styles.actionLabel}>{muted ? 'Sound off' : 'Sound on'}</Text></Pressable>
          <Pressable onPress={() => isPlaying ? player.pause() : player.play()} style={styles.action} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause reel' : 'Play reel'}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={25} color={colors.white} />
            <Text style={styles.actionLabel}>{isPlaying ? 'Pause' : 'Play'}</Text>
          </Pressable>
          <Pressable disabled={pending.length > 0 || socialLoading} onPress={() => toggleSaved(reel.id)} style={styles.action} accessibilityRole="button" accessibilityLabel={saved ? 'Remove saved reel' : 'Save reel'}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={25} color={colors.white} />
            <Text style={styles.actionLabel}>{pending.includes(`save:${reel.id}`) ? 'Saving…' : saved ? 'Saved' : 'Save'}</Text>
          </Pressable>
          {reel.handle !== '@you' ? <Pressable disabled={pending.length > 0 || socialLoading} onPress={() => toggleFollowing(reel.handle)} style={styles.action} accessibilityRole="button" accessibilityLabel={`${following ? 'Unfollow' : 'Follow'} ${reel.creator}`}>
            <Ionicons name={following ? 'person-remove-outline' : 'person-add-outline'} size={25} color={colors.white} />
            <Text style={styles.actionLabel}>{following ? 'Following' : 'Follow'}</Text>
          </Pressable> : null}
        </View>
      </View>
    </View>
  );
}

export default function ReelsScreen() {
  const { reels, feedIds, followingHandles, socialLoading, refresh, hasMore, loadMore, pending } = useAppState();
  const [feed, setFeed] = useState('For you');
  const videoReels = useMemo(() => reels.filter((reel): reel is VideoReel => feedIds.includes(reel.id) && reel.mediaType === 'video' && !!reel.mediaUri && (feed === 'For you' || followingHandles.includes(reel.handle))), [reels, feedIds, feed, followingHandles]);
  const [height, setHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: VideoReel }[] }) => {
    if (viewableItems[0]) setActiveId(viewableItems[0].item.id);
  }, []);

  function onLayout(event: LayoutChangeEvent) {
    setHeight(event.nativeEvent.layout.height);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={styles.header}>
        <View style={styles.feedChoices}>{['For you', 'Following'].map(label => <Pressable key={label} onPress={() => { setActiveId(null); setFeed(label); }} accessibilityRole="button" accessibilityState={{ selected: feed === label }}><Text style={[styles.feedChoice, feed === label && styles.feedChoiceActive]}>{label}</Text></Pressable>)}</View>
        <Pressable onPress={() => router.push('/create')} style={styles.create} accessibilityRole="button" accessibilityLabel="Create a reel">
          <Ionicons name="add" size={23} color={colors.white} />
        </Pressable>
      </View>
<Pressable onPress={hasMore ? loadMore : refresh} disabled={socialLoading || pending.length > 0} accessibilityRole="button" style={{ padding: 10 }}><Text style={{ color: colors.white, textAlign: 'center', fontSize: 14 }}>{socialLoading ? 'Loading…' : hasMore ? 'Load more reels' : 'Refresh reels'}</Text></Pressable>
      {videoReels.length ? (
        <View style={styles.feed} onLayout={onLayout}>
          {height > 0 ? <FlatList
            key={feed}
            data={videoReels}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ReelPage reel={item} height={height} active={focused && (activeId ?? videoReels[0].id) === item.id} />}
            extraData={[activeId, focused, height]}
            refreshing={socialLoading}
            onRefresh={refresh}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
          /> : null}
        </View>
      ) : (
        <View style={styles.empty}>
          <View style={styles.filmFrame}><GradientFill tone="dark" radius={25} /><Text style={styles.frameLabel}>YOUR NEXT GREAT STORY</Text><View style={styles.emptyIcon}><Ionicons name="play" size={38} color={colors.accent} /></View><Text style={styles.frameFooter}>60 seconds. Endless possibilities.</Text></View>
          <Text style={styles.emptyTitle}>{feed === 'Following' ? 'Your people. Their stories.' : 'Make the first move.'}</Text>
          <Text style={styles.emptyText}>{feed === 'Following' ? 'Videos from creators you follow will appear here.' : 'A new idea. A hidden place. A moment worth sharing. Your first reel starts with you.'}</Text>
          <Pressable onPress={() => router.push('/create')} style={styles.emptyButton} accessibilityRole="button"><GradientFill radius={15} /><Text style={styles.emptyButtonText}>Create a reel</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  feedChoices: { flexDirection: 'row', gap: 22 }, feedChoice: { color: colors.onDarkMuted, fontSize: 17, fontWeight: '700', paddingVertical: 10 }, feedChoiceActive: { color: colors.white, borderBottomWidth: 2, borderBottomColor: colors.highlight },
  filmFrame: { width: 190, height: 205, borderRadius: 25, borderWidth: 1, borderColor: colors.darkBorder, backgroundColor: colors.darkSurface, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24, transform: [{ rotate: '-4deg' }] }, frameLabel: { color: colors.highlight, letterSpacing: 2, fontSize: 11, fontWeight: '800' }, frameFooter: { color: colors.onDarkMuted, fontSize: 13 },
  header: { height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: colors.white, fontSize: 21, fontWeight: '800' },
  create: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  feed: { flex: 1 },
  page: { width: '100%', backgroundColor: colors.darkSurface, justifyContent: 'flex-end' },
  shade: { ...StyleSheet.absoluteFill, backgroundColor: '#00000035' },
  pageContent: { paddingHorizontal: 18, paddingBottom: 32, flexDirection: 'row', alignItems: 'flex-end', gap: 18 },
  story: { flex: 1 },
  category: { color: colors.onDarkAccent, fontSize: 14, fontWeight: '800', letterSpacing: 1 },
  creator: { color: colors.white, fontSize: 17, fontWeight: '800', marginTop: 11 },
  title: { color: colors.white, fontSize: 25, fontWeight: '800', lineHeight: 30, marginTop: 8 },
  description: { color: '#F2F7FF', fontSize: 16, lineHeight: 23, marginTop: 6 },
  sponsored: { color: '#F8DB9A', fontSize: 13, fontWeight: '800', letterSpacing: 0.7, marginTop: 12 },
  actions: { alignItems: 'center', gap: 10 },
  action: { alignItems: 'center', minWidth: 46, gap: 4 },
  actionLabel: { color: colors.white, fontSize: 14, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 34, paddingBottom: 24 },
  emptyIcon: { width: 86, height: 86, borderRadius: 29, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.white, fontSize: 24, fontWeight: '800', marginTop: 24 },
  emptyText: { color: colors.onDarkMuted, fontSize: 17, lineHeight: 25, textAlign: 'center', marginTop: 9 },
  emptyButton: { backgroundColor: colors.accent, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 14, marginTop: 25 },
  emptyButtonText: { color: colors.white, fontSize: 17, fontWeight: '800' },
});




