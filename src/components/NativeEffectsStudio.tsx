import { useEffect, useRef, useState } from 'react';
import { AppState, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera } from 'expo-camera';
import { useEvent } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { Lens } from '@snap/camera-kit-react-native';
import type { CameraStudioProps } from './CameraStudio';

type SDK = typeof import('@snap/camera-kit-react-native');
type Look = Lens & { section: 'Colors' | 'Faces' };
// The SDK owns a single native session. Serialize teardown before opening another.
let sessionQueue: Promise<unknown> = Promise.resolve();
const groups = [
  { id: process.env.EXPO_PUBLIC_CAMERA_KIT_COLOR_GROUP_ID?.trim(), section: 'Colors' as const },
  { id: process.env.EXPO_PUBLIC_CAMERA_KIT_FACE_GROUP_ID?.trim(), section: 'Faces' as const },
];
const message = (e: unknown) => e instanceof Error ? e.message : 'Camera effects could not load. Close the camera and retry.';
function bounded<T>(job: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Camera request timed out. Close the camera and retry.')), 20000);
    job.then(resolve, reject).finally(() => clearTimeout(timer));
  });
}

export function NativeEffectsStudio({ token, onClose, onCapture }: CameraStudioProps & { token: string }) {
  const [sdk, setSDK] = useState<SDK | null>(null);
  const [looks, setLooks] = useState<Look[]>([]);
  const [section, setSection] = useState<'Colors' | 'Faces'>('Colors');
  const [selected, setSelected] = useState('');
  const [front, setFront] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const mounted = useRef(true);
  const capture = useRef<Promise<{ uri: string }> | null>(null);
  const stopJob = useRef<Promise<void> | null>(null);
  const busy = useRef(false);
  const started = useRef(0);

  useEffect(() => {
    let live = true;
    mounted.current = true;
    let module: SDK | undefined;
    const init = sessionQueue.then(async () => {
      const camera = await Camera.requestCameraPermissionsAsync();
      if (!live) return;
      if (!camera.granted) throw new Error('Camera permission is required. Allow it in your phone settings and reopen the camera.');
      const mic = await Camera.requestMicrophonePermissionsAsync();
      if (!live) return;
      if (!mic.granted) throw new Error('Microphone permission is required to record reels with sound.');
      module = await import('@snap/camera-kit-react-native');
      if (!live) return;
      await bounded(module.CameraKitReactNative.createNewSession(token));
      if (!live) return;
      setSDK(module);
      const loaded: Look[] = [];
      // The wrapper keeps one pending lens-group callback, so requests must be sequential.
      for (const group of groups) {
        if (!group.id || !live) continue;
        const lenses = await bounded(module.CameraKitReactNative.loadLensGroup(group.id));
        loaded.push(...lenses.map(lens => ({ ...lens, section: group.section })));
      }
      if (live) { setLooks(loaded); setLoading(false); if (!loaded.length) setError('No lenses are published in the configured groups yet.'); }
    });
    sessionQueue = init.catch(() => {});
    void init.catch(e => { if (live) { setError(message(e)); setLoading(false); } });
    const timeout = setTimeout(() => { if (live) setError('If the camera is still loading, check the Camera Kit token, network and lens groups. Close and retry.'); }, 20000);
    void init.finally(() => clearTimeout(timeout)).catch(() => {});
    return () => {
      live = false; mounted.current = false; clearTimeout(timeout);
      sessionQueue = init.catch(() => {}).then(async () => {
        if (!module) return;
        if (stopJob.current) await stopJob.current.catch(() => {});
        else if (capture.current) await bounded(module.CameraKitReactNative.stopTakingVideo()).catch(() => {});
        await bounded(module.CameraKitReactNative.closeSession());
      }).catch(() => {});
    };
  }, [token]);

  async function choose(look?: Look) {
    if (!sdk || busy.current || capture.current) return;
    busy.current = true; setChanging(true); setError('');
    try {
      const applied = await bounded(look ? sdk.CameraKitReactNative.applyLens(look.id, {}) : sdk.CameraKitReactNative.removeLens());
      if (!applied) throw new Error('This effect could not be applied. Try another one.');
      if (mounted.current) { setSelected(look?.id ?? ''); if (look?.facingPreference) setFront(look.facingPreference === 'FRONT'); }
    } catch (e) { if (mounted.current) setError(message(e)); }
    finally { busy.current = false; if (mounted.current) setChanging(false); }
  }

  function start() {
    if (!sdk || busy.current || capture.current || loading) return;
    setError(''); started.current = Date.now(); setSeconds(0); setRecording(true);
    const result = sdk.CameraKitReactNative.takeVideo();
    capture.current = result;
    // Attach a rejection handler immediately, rather than waiting until Stop.
    void result.catch(e => { capture.current = null; if (mounted.current) { setRecording(false); setError(message(e)); } });
  }
  function stop(): Promise<void> {
    if (stopJob.current) return stopJob.current;
    const result = capture.current;
    if (!sdk || !result) return Promise.resolve();
    setFinishing(true); setRecording(false);
    stopJob.current = (async () => {
      try {
        await bounded(sdk.CameraKitReactNative.stopTakingVideo());
        const clip = await bounded(result);
        if (!clip?.uri) throw new Error('The recording was empty. Please try again.');
        if (mounted.current) setUri(clip.uri);
      } catch (e) { if (mounted.current) setError(message(e)); }
      finally { capture.current = null; stopJob.current = null; if (mounted.current) setFinishing(false); }
    })();
    return stopJob.current;
  }
  const stopRef = useRef(stop);
  useEffect(() => { stopRef.current = stop; });
  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      const elapsed = (Date.now() - started.current) / 1000;
      setSeconds(Math.min(60, Math.floor(elapsed)));
      if (elapsed >= 59) void stopRef.current();
    }, 200);
    return () => clearInterval(timer);
  }, [recording]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active' && capture.current) void stopRef.current();
    });
    return () => sub.remove();
  }, []);

  const NativePreview = sdk?.NativeView;
  const disabled = loading || changing || recording || finishing;
  return <SafeAreaView style={s.page}>
    <View style={s.header}><Pressable accessibilityRole="button" disabled={recording || finishing} onPress={onClose} style={s.button}><Text style={s.text}>Close</Text></Pressable><Text style={s.heading}>Reel camera</Text><Text style={s.text}>{recording ? `${seconds}s` : '60s max'}</Text></View>
    {uri ? <Review uri={uri} onCapture={onCapture} onRetake={() => { setUri(null); setSelected(''); void choose(); }} /> : <>
      <View style={s.preview}>{NativePreview && <NativePreview style={StyleSheet.absoluteFill} cameraPosition={front ? 'front' : 'back'} mirrorFramesHorizontally={front} />}{!sdk && <Text style={s.text}>{loading ? 'Opening camera…' : 'Camera unavailable'}</Text>}</View>
      <View style={s.header}>{(['Colors', 'Faces'] as const).map(label => <Pressable accessibilityRole="button" accessibilityState={{ selected: section === label }} key={label} onPress={() => setSection(label)} style={[s.button, section === label && s.selected]}><Text style={s.text}>{label}</Text></Pressable>)}<Pressable accessibilityRole="button" disabled={disabled} onPress={() => setFront(value => !value)} style={s.button}><Text style={s.text}>Flip</Text></Pressable></View>
      <ScrollView horizontal style={{ flexGrow: 0 }} contentContainerStyle={s.looks} showsHorizontalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !selected }} disabled={disabled} onPress={() => void choose()} style={s.look}><View style={[s.circle, !selected && s.selected]}><Text style={s.text}>○</Text></View><Text style={s.text}>Original</Text></Pressable>
        {looks.filter(look => look.section === section).map(look => <Pressable key={look.id} accessibilityRole="button" accessibilityState={{ selected: selected === look.id }} disabled={disabled} onPress={() => void choose(look)} style={s.look}><View style={[s.circle, selected === look.id && s.selected]}>{look.icons[0]?.imageUrl ? <Image source={{ uri: look.icons[0].imageUrl }} style={s.icon} /> : <Text style={s.text}>✦</Text>}</View><Text numberOfLines={2} style={[s.text, { textAlign: 'center' }]}>{look.name}</Text></Pressable>)}
      </ScrollView>
      <Text style={s.hint}>{loading ? 'Loading lenses…' : changing ? 'Applying effect…' : !looks.some(look => look.section === section) ? 'No effects available in this category yet.' : 'Choose a look before recording.'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={recording ? 'Stop recording' : 'Start recording'} disabled={!sdk || loading || changing || finishing} onPress={() => recording ? void stop() : start()} style={[s.record, (loading || changing || finishing) && { opacity: .4 }]}><Text style={{ color: 'white', fontSize: 30 }}>{recording ? '■' : '●'}</Text></Pressable>
      <Text style={s.hint}>{finishing ? 'Saving recording…' : 'Powered by Snap Camera Kit'}</Text>
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </SafeAreaView>;
}

function Review({ uri, onCapture, onRetake }: { uri: string; onCapture: CameraStudioProps['onCapture']; onRetake: () => void }) {
  const player = useVideoPlayer(uri);
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [error, setError] = useState('');
  function accept() {
    const duration = player.duration * 1000;
    const size = player.videoTrack?.size;
    if (!duration || duration > 60000 || !size) { setError('This recording could not be read or exceeds 60 seconds. Please retake it.'); return; }
    onCapture({ uri, duration, width: size.width, height: size.height, type: 'video', mimeType: 'video/mp4' });
  }
  return <><VideoView player={player} style={s.preview} nativeControls contentFit="contain" /><Text style={s.hint}>Preview your recorded effect and sound before posting.</Text><View style={s.header}><Pressable accessibilityRole="button" onPress={onRetake} style={s.button}><Text style={s.text}>Retake</Text></Pressable><Pressable accessibilityRole="button" disabled={status !== 'readyToPlay'} onPress={accept} style={[s.button, s.selected]}><Text style={s.text}>Use video</Text></Pressable></View>{(error || status === 'error') && <Text style={s.error}>{error || 'Video playback failed. Please retake.'}</Text>}</>;
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
