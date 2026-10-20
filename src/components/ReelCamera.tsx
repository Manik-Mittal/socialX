import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { CameraStudioProps } from './CameraStudio';
import { Review } from './ReelReview';
import { FilterCameraView, type FilterCameraRef } from '../../modules/socialx-camera';
import { filterMatrix, type ReelFilterId } from '../camera/filters';
import { ReelFilterPicker } from './ReelFilterPicker';

export function ReelCamera({ onCapture, onClose, onSystemCamera }: CameraStudioProps) {
  const camera = useRef<CameraView>(null);
  const filterCamera = useRef<FilterCameraRef>(null);
  const [filter, setFilter] = useState<ReelFilterId>('original');
  const [intensity, setIntensity] = useState(1);
  const matrix = useMemo(() => filterMatrix(filter, intensity), [filter, intensity]);
  const live = useRef(true);
  const busy = useRef(false);
  const [permission, setPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [front, setFront] = useState(true);
  const [torch, setTorch] = useState(false);
  const [muted, setMuted] = useState(false);
  const [zoom, setZoom] = useState(0);
  const [ready, setReady] = useState(false);
  const [recording, setRecording] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [foreground, setForeground] = useState(AppState.currentState === 'active');

  useEffect(() => {
    live.current = true;
    async function permissions() {
      try {
        const result = await Camera.requestCameraPermissionsAsync();
        if (!live.current) return;
        if (!result.granted) { setPermission('denied'); return; }
        const mic = await Camera.requestMicrophonePermissionsAsync();
        if (live.current) { setMuted(!mic.granted); setPermission('granted'); }
      } catch { if (live.current) { setPermission('denied'); setError('Could not open the camera. Please retry.'); } }
    }
    void permissions();
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        if (busy.current) {
          if (FilterCameraView) void filterCamera.current?.stop().catch(() => {});
          else camera.current?.stopRecording();
        }
        setReady(false);
      }
      setForeground(state === 'active');
    });
    return () => { live.current = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!recording) return;
    const start = Date.now();
    const timer = setInterval(() => setSeconds(Math.floor((Date.now() - start) / 1000)), 250);
    return () => clearInterval(timer);
  }, [recording]);

  async function record() {
    if ((!camera.current && !filterCamera.current) || !ready || busy.current) return;
    busy.current = true; setError(''); setSeconds(0); setRecording(true);
    try {
      const result = FilterCameraView
        ? await filterCamera.current!.record()
        : await camera.current!.recordAsync({ maxDuration: 59, maxFileSize: 24 * 1024 * 1024 });
      if (live.current) {
        if (!result?.uri) throw new Error('No video was recorded. Try again.');
        setReady(false); setUri(result.uri);
      }
    } catch (e) { if (live.current) setError(e instanceof Error ? e.message : 'Recording failed. Please retry.'); }
    finally { busy.current = false; if (live.current) { setRecording(false); setFinishing(false); } }
  }

  function stop() {
    if (!busy.current || finishing) return;
    setFinishing(true);
    if (FilterCameraView) void filterCamera.current?.stop().catch(() => { if (live.current) setError('Could not stop recording. Close the camera and retry.'); });
    else camera.current?.stopRecording();
  }

  async function toggleSound() {
    if (!muted) { setMuted(true); return; }
    const result = await Camera.requestMicrophonePermissionsAsync();
    if (!live.current) return;
    if (result.granted) { setMuted(false); setError(''); }
    else setError('Allow microphone access in phone settings to record sound.');
  }

  const locked = recording || finishing;
  return <SafeAreaView style={s.page}>
    <View style={s.row}>
      <Pressable accessibilityRole="button" onPress={onClose} disabled={locked} style={s.button}><Text style={s.text}>Back</Text></Pressable>
      <Text style={s.heading}>Reel camera</Text><Text style={s.text}>{recording ? `● ${seconds}s` : '60s max'}</Text>
    </View>
    {uri ? <Review uri={uri} onCapture={onCapture} onRetake={() => { setReady(false); setUri(null); }} /> : <>
      <View style={s.preview}>
        {permission === 'granted' && FilterCameraView ? <FilterCameraView ref={filterCamera} style={StyleSheet.absoluteFill} front={front} muted={muted} torch={torch} zoom={zoom} matrix={matrix} active={foreground} onReady={() => setReady(true)} onError={event => { setReady(false); setError(event.nativeEvent.message); }} /> : permission === 'granted' && foreground ? <CameraView ref={camera} style={StyleSheet.absoluteFill} mode="video" facing={front ? 'front' : 'back'} mirror={front} mute={muted} enableTorch={!front && torch} zoom={zoom} videoQuality="720p" onCameraReady={() => setReady(true)} onMountError={event => { setReady(false); setError(event.message); }} /> : <Text style={s.hint}>{permission === 'loading' ? 'Opening camera…' : permission === 'denied' ? 'Camera access is needed to record a reel.' : 'Camera paused'}</Text>}
        {permission === 'granted' && <View style={s.tools}>
          <Control icon="camera-reverse-outline" label="Flip" disabled={locked} onPress={() => { setReady(false); setFront(!front); setTorch(false); setZoom(0); }} />
          <Control icon={torch ? 'flash' : 'flash-off-outline'} label={torch ? 'Light on' : 'Light off'} disabled={locked || front} onPress={() => setTorch(!torch)} />
          <Control icon={muted ? 'mic-off-outline' : 'mic-outline'} label={muted ? 'Silent' : 'Sound'} disabled={locked} onPress={() => void toggleSound().catch(() => setError('Could not access the microphone.'))} />
        </View>}
      </View>
      {permission === 'denied' ? <View style={s.row}><Pressable style={s.button} onPress={() => void Linking.openSettings()}><Text style={s.text}>Open settings</Text></Pressable><Pressable style={s.button} onPress={onSystemCamera}><Text style={s.text}>Phone camera</Text></Pressable></View> : <>
        {!!FilterCameraView && <ReelFilterPicker selected={filter} intensity={intensity} disabled={locked} onSelect={setFilter} onIntensity={setIntensity} />}
        <View style={s.row}><Pressable accessibilityLabel="Zoom out" disabled={locked} style={s.button} onPress={() => setZoom(value => Math.max(0, value - .05))}><Text style={s.text}>−</Text></Pressable><Text style={s.text}>Zoom · {Math.round(zoom * 100)}%</Text><Pressable accessibilityLabel="Zoom in" disabled={locked} style={s.button} onPress={() => setZoom(value => Math.min(1, value + .05))}><Text style={s.text}>+</Text></Pressable></View>
        <Pressable accessibilityRole="button" accessibilityLabel={recording ? 'Stop recording' : 'Start recording'} disabled={!ready || finishing} onPress={() => recording ? stop() : void record()} style={[s.record, (!ready || finishing) && s.dim]}><View style={recording ? s.stop : s.dot} /></Pressable>
        <Text style={s.hint}>{finishing ? 'Saving recording…' : recording ? 'Tap to stop' : 'Tap to record'}</Text>
        {!FilterCameraView && <Text style={s.hint}>Original camera · Install the new SocialX app build to use color filters.</Text>}
      </>}
    </>}
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
  </SafeAreaView>;
}

function Control({ icon, label, disabled, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; disabled: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[s.control, disabled && s.dim]}><Ionicons name={icon} size={26} color="white" /><Text style={s.label}>{label}</Text></Pressable>;
}
const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0C1020', paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 8 },
  heading: { color: 'white', fontSize: 20, fontWeight: '700' }, text: { color: 'white', fontSize: 17 },
  button: { minHeight: 48, minWidth: 48, padding: 12, alignItems: 'center', borderRadius: 16, backgroundColor: '#252C43' },
  preview: { flex: 1, minHeight: 160, borderRadius: 24, overflow: 'hidden', backgroundColor: '#151E30', justifyContent: 'center' },
  tools: { position: 'absolute', right: 12, top: 16, gap: 12 },
  control: { minWidth: 66, minHeight: 66, borderRadius: 33, padding: 10, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#111827AA' },
  label: { color: 'white', fontSize: 13 }, dim: { opacity: .4 },
  record: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: 'white', alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  dot: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#E15B96' }, stop: { width: 30, height: 30, borderRadius: 7, backgroundColor: '#E15B96' },
  hint: { color: '#BFC8DF', fontSize: 14, textAlign: 'center', paddingVertical: 8, paddingHorizontal: 8 }, error: { color: '#FFB9CC', fontSize: 15, paddingVertical: 8 },
});
