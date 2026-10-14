import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import type { VideoPlayer } from 'expo-video';
import { AppState, Pressable, Text } from 'react-native';
import { useAuth } from '../auth';
import { client } from '../backend/social';
import { colors } from '../theme';

// Accumulate actual playback progress, not time spent buffering or paused.
export function useReelView(player: VideoPlayer, id: string, authorId?: string, active = true) {
  const { session } = useAuth();
  const focused = useRef(false);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; player.pause(); }; }, [player]));
  useEffect(() => {
    if (!active || !session || session.user.id === authorId) return;
    let watched = 0;
    let previous = player.currentTime;
    let lastTick = Date.now();
    let sent = false;
    let pending = false;
    let retryAfter = 0;
    const timer = setInterval(() => {
      const now = Date.now();
      const position = player.currentTime;
      const delta = position - previous;
      const elapsed = (now - lastTick) / 1000;
      previous = position; lastTick = now;
      if (!focused.current || AppState.currentState !== 'active' || !player.playing || player.status !== 'readyToPlay' || elapsed > 1.5) return;
      // Ignore seek jumps and loop resets. Count at most elapsed wall-clock time.
      if (delta > 0 && delta <= elapsed * Math.max(1, player.playbackRate) + 0.25) watched += Math.min(delta, elapsed);
      if (watched < 3 || sent || pending || now < retryAfter) return;
      pending = true;
      void client().rpc('record_reel_view', { target: id }).then(({ error }) => {
        sent = !error; pending = false; retryAfter = Date.now() + 30000;
      }, () => { pending = false; retryAfter = Date.now() + 30000; });
    }, 500);
    return () => clearInterval(timer);
  }, [active, authorId, id, player, session]);
}

export function CreatorViews({ id, authorId, dark = false }: { id: string; authorId?: string; dark?: boolean }) {
  const { session } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const owner = !!authorId && session?.user.id === authorId;
  useFocusEffect(useCallback(() => {
    if (!owner) return;
    let live = true;
    async function load() {
      const { data, error: failure } = await client().rpc('creator_reel_views', { target: id });
      if (!live) return;
      if (failure) setError(['PGRST202','42883'].includes(failure.code) ? 'Run the reel views SQL setup, then retry.' : 'Could not load views. Tap to retry.');
      else { setCount(Number(data)); setError(''); }
    }
    void load().catch(() => { if (live) setError('Could not load views. Tap to retry.'); });
    return () => { live = false; };
    // Retry intentionally refreshes the same reel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, owner, retry]));
  if (!owner) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Refresh unique reel views" onPress={() => setRetry(value => value + 1)} style={{ paddingVertical: 10 }}>
    <Text style={{ color: dark ? colors.white : colors.muted, fontSize: 15, fontWeight: '700' }}>{error || (count === null ? 'Loading views…' : `${count.toLocaleString()} unique ${count === 1 ? 'view' : 'views'}`)}</Text>
  </Pressable>;
}
