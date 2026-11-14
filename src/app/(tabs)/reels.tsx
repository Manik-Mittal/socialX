import { GradientFill } from '../../components/GradientFill';
import { Ionicons } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, FlatList, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Reel } from '../../data';
import { useAppState } from '../../state';
import { colors } from '../../theme';
import { ReelEngagement } from '../../components/ReelEngagement';
import { CreatorViews, useReelView } from '../../components/ReelViews';
import { getReelMuted, useReelSound } from '../../reelSound';

type VideoReel = Reel & { mediaUri: string; mediaType: 'video' };

function ReelPage({ reel, height, active }: { reel: VideoReel; height: number; active: boolean }) {
  const insets = useSafeAreaInsets();
  const { savedIds, toggleSaved, followingHandles, toggleFollowing, pending, socialLoading, refresh } = useAppState();
  const player = useVideoPlayer(reel.mediaUri, video => { video.loop = true; video.muted = getReelMuted(); });
  useReelView(player, reel.id, reel.authorId, active);
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const saved = savedIds.includes(reel.id);
  const { muted, toggleMute } = useReelSound(player);
  const manuallyPaused = useRef(false);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  // A delayed load/source replacement can start a player after it left the screen.
  useEventListener(player, 'playingChange', ({ isPlaying: playing }) => {
    if (playing && (!active || manuallyPaused.current)) player.pause();
  });
  const following = followingHandles.includes(reel.handle);

  useEffect(() => {
    manuallyPaused.current = false;
  }, [active]);
  useEffect(() => {
    if (!active) player.pause();
    else if (status !== 'error' && !manuallyPaused.current) player.play();
    // useVideoPlayer owns release. Never pause an already released player in cleanup.
  }, [active, player, status]);


  return (
    <View style={[styles.page, { height }]}>
      <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" playsInline surfaceType="textureView" />
      {active && status === 'loading' && <View pointerEvents="none" style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator color="white" size="large" /></View>}
      <View style={styles.shade} pointerEvents="none" />
      {status === 'error' && <View style={[styles.videoError, { top: insets.top + 72 }]}>
        <Text style={styles.errorText}>This video couldn’t load. Check your connection and refresh.</Text>
        <Pressable onPress={refresh} disabled={socialLoading} accessibilityRole="button" style={styles.retry}><Text style={styles.actionLabel}>{socialLoading ? 'Refreshing…' : 'Refresh video'}</Text></Pressable>
      </View>}
      <View style={[styles.pageContent, { paddingBottom: 96 + insets.bottom }]}>
        <View style={styles.story}>
          <Text style={styles.category}>{reel.category.toUpperCase()} · {reel.city}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Open ${reel.creator}'s profile`} disabled={!reel.authorId} onPress={() => router.push({ pathname: '/user/[id]', params: { id: reel.authorId! } })}><Text style={styles.creator}>{reel.creator}</Text></Pressable>
          <Text style={styles.title} numberOfLines={2}>{reel.title}</Text>
          <CreatorViews id={reel.id} authorId={reel.authorId} dark />
          {reel.description ? <Text style={styles.description} numberOfLines={2}>{reel.description}</Text> : null}
          {reel.sponsored ? <Text style={styles.sponsored}>PAID PARTNERSHIP</Text> : null}
        </View>
        <View style={styles.actions}>
          <ReelEngagement id={reel.id} dark />
          <Pressable onPress={toggleMute} style={styles.action} accessibilityRole="button" accessibilityLabel={muted ? 'Unmute reel' : 'Mute reel'}><Ionicons name={muted ? 'volume-mute-outline' : 'volume-high-outline'} size={25} color={colors.white} /><Text style={styles.actionLabel}>{muted ? 'Sound off' : 'Sound on'}</Text></Pressable>
          <Pressable disabled={!active} onPress={() => { manuallyPaused.current = isPlaying; if (isPlaying) player.pause(); else player.play(); }} style={styles.action} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause reel' : 'Play reel'}>
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
  const insets = useSafeAreaInsets();
  const { reels, feedIds, followingHandles, socialLoading, refresh, hasMore, loadMore, pending } = useAppState();
  const [feed, setFeed] = useState('For you');
  const videoReels = useMemo(() => reels.filter((reel): reel is VideoReel => feedIds.includes(reel.id) && reel.mediaType === 'video' && !!reel.mediaUri && (feed === 'For you' || followingHandles.includes(reel.handle))), [reels, feedIds, feed, followingHandles]);
  const [height, setHeight] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const scrollIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
  }, []);
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState !== 'background' && AppState.currentState !== 'inactive');
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => setForeground(state === 'active'));
    const visibility = () => setForeground(!document.hidden);
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    return () => { listener.remove(); if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility); };
  }, []);

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => setFocused(false);
  }, []));

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!height || !videoReels.length) return;
    const index = Math.min(videoReels.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / height)));
    setActiveId(videoReels[index].id);
    // Pause during movement, including browser wheel scrolling. Only the final
    // visible page may resume once scrolling settles.
    setScrolling(true);
    if (scrollIdleTimer.current) clearTimeout(scrollIdleTimer.current);
    scrollIdleTimer.current = setTimeout(() => setScrolling(false), 160);
  }, [height, videoReels]);

  function onLayout(event: LayoutChangeEvent) {
    const nextHeight = Math.round(event.nativeEvent.layout.height);
    if (nextHeight > 0 && nextHeight !== height) { setActiveId(null); setHeight(nextHeight); }
  }
  const playingId = videoReels.some(reel => reel.id === activeId) ? activeId : videoReels[0]?.id;

  return (
    <View style={styles.screen}>
      {focused ? <StatusBar style="light" /> : null}
      <View style={[styles.header, { top: insets.top, left: insets.left, right: insets.right }]}>
        <View style={styles.feedChoices}>{['For you', 'Following'].map(label => <Pressable key={label} onPress={() => { setActiveId(null); setFeed(label); }} accessibilityRole="button" accessibilityState={{ selected: feed === label }}><Text style={[styles.feedChoice, feed === label && styles.feedChoiceActive]}>{label}</Text></Pressable>)}</View>
        <View style={styles.headerActions}>
        <Pressable onPress={refresh} disabled={socialLoading || pending.length > 0} style={styles.headerRefresh} accessibilityRole="button" accessibilityLabel="Refresh reels">
          {socialLoading ? <ActivityIndicator color={colors.white} /> : <Ionicons name="refresh" size={22} color={colors.white} />}
        </Pressable>
        <Pressable onPress={() => router.push('/create')} style={styles.create} accessibilityRole="button" accessibilityLabel="Create a reel">
          <Ionicons name="add" size={23} color={colors.white} />
        </Pressable>
        </View>
      </View>
      {videoReels.length ? (
        <View style={styles.feed} onLayout={onLayout}>
          {height > 0 ? <FlatList
            key={`${feed}:${height}`}
            style={styles.list}
            data={videoReels}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <ReelPage reel={item} height={height} active={focused && foreground && !scrolling && playingId === item.id} />}
            extraData={[playingId, focused, foreground, scrolling, height]}
            refreshing={socialLoading}
            onRefresh={refresh}
            onEndReached={loadMore}
            onEndReachedThreshold={0.5}
            pagingEnabled
            showsVerticalScrollIndicator={false}
            onScroll={onScroll}
            onMomentumScrollEnd={onScroll}
            scrollEventThrottle={16}
            snapToInterval={height}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
            initialNumToRender={1}
            maxToRenderPerBatch={2}
            windowSize={3}
            removeClippedSubviews={false}
          /> : null}
        </View>
      ) : (
        <View style={[styles.empty, { paddingTop: insets.top + 56, paddingBottom: 96 + insets.bottom }]}>
          <View style={styles.filmFrame}><GradientFill tone="dark" radius={25} /><Text style={styles.frameLabel}>YOUR NEXT GREAT STORY</Text><View style={styles.emptyIcon}><Ionicons name="play" size={38} color={colors.accent} /></View><Text style={styles.frameFooter}>60 seconds. Endless possibilities.</Text></View>
          <Text style={styles.emptyTitle}>{feed === 'Following' ? 'Your people. Their stories.' : 'Make the first move.'}</Text>
          <Text style={styles.emptyText}>{feed === 'Following' ? 'Videos from creators you follow will appear here.' : 'A new idea. A hidden place. A moment worth sharing. Your first reel starts with you.'}</Text>
          {hasMore && <Pressable onPress={loadMore} disabled={socialLoading || pending.length > 0} accessibilityRole="button" style={styles.retry}><Text style={styles.actionLabel}>Load more reels</Text></Pressable>}
          <Pressable onPress={() => router.push('/create')} style={styles.emptyButton} accessibilityRole="button"><GradientFill radius={15} /><Text style={styles.emptyButtonText}>Create a reel</Text><Ionicons name="arrow-forward" size={18} color={colors.white} /></Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.dark },
  feedChoices: { flexDirection: 'row', gap: 22 }, feedChoice: { color: colors.onDarkMuted, fontSize: 17, fontWeight: '700', paddingVertical: 10 }, feedChoiceActive: { color: colors.white, borderBottomWidth: 2, borderBottomColor: colors.highlight },
  filmFrame: { width: 190, height: 205, borderRadius: 25, borderWidth: 1, borderColor: colors.darkBorder, backgroundColor: colors.darkSurface, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 24, transform: [{ rotate: '-4deg' }] }, frameLabel: { color: colors.highlight, letterSpacing: 2, fontSize: 11, fontWeight: '800' }, frameFooter: { color: colors.onDarkMuted, fontSize: 13 },
  header: { position: 'absolute', zIndex: 2, height: 56, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerRefresh: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: '#00000055' },
  headerTitle: { color: colors.white, fontSize: 21, fontWeight: '800' },
  create: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  feed: { flex: 1, minHeight: 0, overflow: 'hidden' },
  list: { ...StyleSheet.absoluteFill },
  page: { width: '100%', backgroundColor: colors.darkSurface, justifyContent: 'flex-end', overflow: 'hidden' },
  // Explicit size also bounds the HTML video element, whose intrinsic size ignores right/bottom.
  video: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  videoError: { position: 'absolute', top: 24, left: 24, right: 24, alignItems: 'center', zIndex: 1, backgroundColor: '#000000CC', borderRadius: 12, padding: 16 },
  errorText: { color: colors.white, fontSize: 16, textAlign: 'center' },
  retry: { padding: 12, marginTop: 4 },
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




