import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer } from 'expo-video';
import type { ImagePickerAsset } from 'expo-image-picker';
import { musicTracks, type MusicTrack } from '../music/catalog';
import { canMixMusic, mixMusic } from '../music/mix';
import { colors } from '../theme';

export function ReelMusicPicker({ original, onApply, onBusy, onPending }: {
  original: ImagePickerAsset; onApply: (asset: ImagePickerAsset) => void;
  onBusy: (busy: boolean) => void; onPending: (pending: boolean) => void;
}) {
  const [selected, setSelected] = useState<MusicTrack | null>(null);
  const [keepOriginal, setKeepOriginal] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false), alive = useRef(true);
  const outputs = useRef<string[]>([]);
  const preview = useVideoPlayer(selected?.asset ?? null);
  const { isPlaying } = useEvent(preview, 'playingChange', { isPlaying: preview.playing });
  useEffect(() => {
    alive.current = true;
    const generated = outputs.current;
    return () => {
      alive.current = false;
      // The last output may still be used by the newly published feed item.
      // Keep it until page reload; reclaim superseded previews here.
      if (Platform.OS === 'web') generated.slice(0, -1).forEach(uri => URL.revokeObjectURL(uri));
    };
  }, []);
  function choose(track: MusicTrack | null) {
    preview.pause(); setSelected(track); setMessage('');
    onPending(track !== null);
    if (!track) onApply(original);
  }
  async function apply() {
    if (!selected || lock.current) return;
    lock.current = true; setBusy(true); onBusy(true); setMessage(''); preview.pause();
    try {
      const result = await mixMusic(original.uri, selected, keepOriginal, original.duration);
      if (!alive.current) { if (Platform.OS === 'web') URL.revokeObjectURL(result.uri); return; }
      outputs.current.push(result.uri);
      onApply({ ...original, ...result, fileSize: undefined, fileName: undefined });
      onPending(false); setMessage(`${selected.title} applied. Play the reel preview to check the mix.`);
    } catch (error) {
      if (alive.current) setMessage(error instanceof Error ? error.message : 'Could not add music.');
    } finally {
      lock.current = false;
      if (alive.current) { setBusy(false); onBusy(false); }
    }
  }
  return <View style={s.panel}>
    <Text style={s.heading}>Add music</Text>
    <Text style={s.hint}>Original SocialX instrumentals · no third-party samples</Text>
    <View style={s.tracks}>
      <Pressable disabled={busy} accessibilityRole="button" accessibilityState={{ selected: !selected }} onPress={() => choose(null)} style={[s.track, !selected && s.selected]}><Text style={s.title}>Original audio only</Text></Pressable>
      {musicTracks.map(track => <Pressable key={track.id} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: selected?.id === track.id }} onPress={() => choose(track)} style={[s.track, selected?.id === track.id && s.selected]}><Text style={s.title}>{track.title}</Text><Text style={s.hint}>{track.mood}</Text></Pressable>)}
    </View>
    {selected && <>
      <View style={s.row}><Text style={s.title}>Keep original sound</Text><Switch value={keepOriginal} disabled={busy} onValueChange={value => { setKeepOriginal(value); onPending(true); setMessage(''); }} /></View>
      <View style={s.row}>
        <Pressable disabled={busy} accessibilityRole="button" style={s.track} onPress={() => { if (isPlaying) preview.pause(); else preview.play(); }}><Text style={s.title}>{isPlaying ? 'Stop preview' : 'Listen to track'}</Text></Pressable>
        <Pressable disabled={busy || !canMixMusic} accessibilityRole="button" onPress={apply} style={[s.apply, (!canMixMusic || busy) && { opacity: .5 }]}>{busy ? <ActivityIndicator color="white" /> : <Text style={s.white}>Apply music</Text>}</Pressable>
      </View>
      <Text style={s.hint}>{busy ? 'Adding music… Keep this screen open.' : 'Apply music, then review your reel before posting.'}</Text>
    </>}
    {!canMixMusic && <Text style={s.hint}>Music export needs the latest SocialX app build. Expo Go cannot add music to a video.</Text>}
    {!!message && <Text accessibilityRole="alert" style={s.hint}>{message}</Text>}
  </View>;
}
const s = StyleSheet.create({
  panel: { marginTop: 20, padding: 16, borderRadius: 20, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, gap: 12 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.ink },
  title: { fontSize: 16, fontWeight: '700', color: colors.ink },
  hint: { fontSize: 14, lineHeight: 20, color: colors.muted },
  tracks: { gap: 8 }, track: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12, gap: 4 },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  apply: { padding: 14, borderRadius: 12, backgroundColor: colors.accent }, white: { color: 'white', fontWeight: '800', fontSize: 16 },
});
