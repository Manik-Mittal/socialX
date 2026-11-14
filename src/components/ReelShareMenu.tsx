import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getReelExport } from '../backend/reelExport';
import { prepareReel, type PreparedReel } from '../sharing/reelFile';
import { colors } from '../theme';

export function ReelShareMenu({ id, onClose }: { id: string; onClose: () => void }) {
  const [prepared, setPrepared] = useState<PreparedReel | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [retry, setRetry] = useState(0);
  const alive = useRef(true);
  const locked = useRef(false);
  useEffect(() => {
    alive.current = true;
    let active = true;
    let file: PreparedReel | undefined;
    void getReelExport(id).then(prepareReel).then(result => {
      file = result;
      if (active) setPrepared(result); else result.dispose();
    }).catch(e => { if (active) setError(e instanceof Error ? e.message : 'Could not prepare reel.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; alive.current = false; file?.dispose(); };
  }, [id, retry]);

  async function act(action: 'share' | 'save') {
    if (!prepared || locked.current) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'share') await prepared.share();
      else { const message = await prepared.save(); if (alive.current) setNotice(message); }
    } catch (e) {
      // Closing the system share sheet is not a failed export.
      if (alive.current && (e as { name?: string }).name !== 'AbortError') setError(e instanceof Error ? e.message : 'Could not export this reel. Please retry.');
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!busy) onClose(); }}>
    <View style={s.backdrop}><SafeAreaView edges={['bottom']} style={s.sheet}>
      <Text style={s.title}>Share reel</Text>
      <Pressable disabled={busy} accessibilityRole="button" style={s.button} onPress={() => { onClose(); router.push({ pathname: '/messages', params: { postId: id } }); }}><Text style={s.label}>Send in SocialX</Text></Pressable>
      {loading && <View style={s.progress}><ActivityIndicator color={colors.accent} /><Text style={s.hint}>Preparing video…</Text></View>}
      <Pressable accessibilityRole="button" disabled={!prepared?.canShare || busy} style={[s.button, (!prepared?.canShare || busy) && s.disabled]} onPress={() => void act('share')}><Text style={s.label}>Share to another app</Text></Pressable>
      <Pressable accessibilityRole="button" disabled={!prepared || busy} style={[s.button, (!prepared || busy) && s.disabled]} onPress={() => void act('save')}><Text style={s.label}>{Platform.OS === 'web' ? 'Download video' : 'Save video to phone'}</Text></Pressable>
      {prepared && !prepared.canShare && <Text style={s.hint}>Download the video, then share it from your files.</Text>}
      {busy && <ActivityIndicator color={colors.accent} />}
      {!!notice && <Text accessibilityLiveRegion="polite" style={s.hint}>{notice}</Text>}
      {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
      {!loading && !prepared && <Pressable style={s.button} onPress={() => { setLoading(true); setError(''); setRetry(value => value + 1); }}><Text style={s.label}>Retry download</Text></Pressable>}
      <Pressable accessibilityRole="button" disabled={busy} style={s.button} onPress={onClose}><Text style={s.label}>Close</Text></Pressable>
    </SafeAreaView></View>
  </Modal>;
}
const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12, width: '100%', maxWidth: 600, alignSelf: 'center' },
  title: { fontSize: 22, fontWeight: '800', color: colors.ink },
  button: { minHeight: 48, justifyContent: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.accentSoft },
  label: { color: colors.accent, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  hint: { color: colors.muted, fontSize: 15, textAlign: 'center' }, error: { color: '#AA2440', fontSize: 15 },
  disabled: { opacity: .4 }, progress: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
});
