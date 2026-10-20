import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { CameraStudioProps } from './CameraStudio';

export function Review({ uri, onCapture, onRetake }: { uri: string; onCapture: CameraStudioProps['onCapture']; onRetake: () => void }) {
  const player = useVideoPlayer(uri);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [error, setError] = useState('');
  function accept() {
    const duration = player.duration * 1000;
    const size = player.videoTrack?.size;
    if (!duration || duration > 60000 || !size) { setError('This recording could not be read or exceeds 60 seconds. Please retake it.'); return; }
    onCapture({ uri, duration, width: size.width, height: size.height, type: 'video', mimeType: uri.toLowerCase().endsWith('.mov') ? 'video/quicktime' : 'video/mp4' });
  }
  return <><VideoView player={player} style={s.preview} nativeControls contentFit="contain" /><Text style={s.hint}>Preview your recording and sound before posting.</Text><View style={s.header}><Pressable accessibilityRole="button" onPress={onRetake} style={s.button}><Text style={s.text}>Retake</Text></Pressable><Pressable accessibilityRole="button" disabled={status !== 'readyToPlay'} onPress={accept} style={[s.button, s.selected]}><Text style={s.text}>Use video</Text></Pressable></View>{(error || status === 'error') && <Text style={s.error}>{error || 'Video playback failed. Please retake.'}</Text>}</>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0C1020', paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 12 },
  heading: { color: 'white', fontSize: 20, fontWeight: '700' }, text: { color: 'white', fontSize: 16 },
  button: { minHeight: 44, padding: 12, borderRadius: 16, backgroundColor: '#252C43' },
  selected: { borderWidth: 2, borderColor: '#C5A5FF' },
  preview: { flex: 1, minHeight: 160, borderRadius: 24, overflow: 'hidden', backgroundColor: '#151E30', alignItems: 'center', justifyContent: 'center' },
  looks: { gap: 16, paddingVertical: 10 }, look: { width: 80, alignItems: 'center', gap: 8 },
  circle: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#30354D', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  icon: { width: 60, height: 60, borderRadius: 30 },
  record: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: 'white', backgroundColor: '#AD427D', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8 },
  hint: { fontSize: 14, color: '#BFC8DF', textAlign: 'center', paddingVertical: 8 }, error: { color: '#FFB9CC', fontSize: 15, paddingVertical: 10 },
});
