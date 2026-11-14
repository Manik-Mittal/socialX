import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import type { VideoPlayer } from 'expo-video';

// One preference for all published reels during this app session.
let muted = Platform.OS === 'web';
const listeners = new Set<() => void>();
export const getReelMuted = () => muted;
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function setReelMuted(next: boolean) {
  if (muted === next) return;
  muted = next;
  listeners.forEach(listener => listener());
}

export function useReelSound(player: VideoPlayer) {
  const soundMuted = useSyncExternalStore(subscribe, getReelMuted, getReelMuted);
  useEffect(() => {
    const apply = () => {
      // Expo player settings are mutable native properties.
      // eslint-disable-next-line react-hooks/immutability
      player.muted = getReelMuted();
    };
    apply();
    const unsubscribe = subscribe(apply);
    // Includes the built-in player mute control on web and native.
    // Applying the shared value emits the same value and is ignored by the store.
    const listener = player.addListener('mutedChange', event => setReelMuted(event.muted));
    return () => { unsubscribe(); listener.remove(); };
  }, [player]);
  return { muted: soundMuted, toggleMute: () => setReelMuted(!getReelMuted()) };
}
