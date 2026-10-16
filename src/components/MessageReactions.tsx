import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { reactionEmoji, reactionError, readReactions, writeReaction, type MessageReaction, type ReactionEmoji } from '../backend/messageReactions';
import { colors } from '../theme';

export function useMessageReactions(ids: number[], me: string) {
  const [rows, setRows] = useState<MessageReaction[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const writing = useRef(false);
  const version = useRef(0);
  const mounted = useRef(true);
  const key = ids.join(',');
  useEffect(() => { mounted.current = true; const requests = version; return () => { mounted.current = false; requests.current++; }; }, []);
  const refresh = useCallback(async () => {
    if (writing.current) return;
    const request = ++version.current;
    try {
      const data = await readReactions(key ? key.split(',').map(Number) : []);
      if (mounted.current && request === version.current) { setRows(data); setError(''); setLoadedKey(key); }
    } catch (e) { if (mounted.current && request === version.current) setError(reactionError(e)); }
  }, [key]);
  useFocusEffect(useCallback(() => {
    void refresh();
    const timer = setInterval(() => { if (AppState.currentState === 'active') void refresh(); }, 5000);
    return () => { clearInterval(timer); version.current++; };
  }, [refresh]));
  async function react(id: number, emoji: ReactionEmoji | null) {
    if (writing.current) return false;
    writing.current = true; version.current++; setSaving(true); setError('');
    try {
      await writeReaction(id, me, emoji);
      if (mounted.current) setRows(old => [...old.filter(row => row.message_id !== id || row.user_id !== me), ...(emoji ? [{ message_id: id, user_id: me, emoji }] : [])]);
      return true;
    } catch (e) { if (mounted.current) setError(reactionError(e)); return false; }
    finally { writing.current = false; if (mounted.current) setSaving(false); }
  }
  return { rows, error, saving, loaded: loadedKey === key, refresh, react };
}

export function ReactionBadges({ rows, me, open }: { rows: MessageReaction[]; me: string; open: () => void }) {
  if (!rows.length) return null;
  return <View style={s.badges}>{reactionEmoji.filter(emoji => rows.some(row => row.emoji === emoji)).map(emoji => {
    const matches = rows.filter(row => row.emoji === emoji);
    const mine = matches.some(row => row.user_id === me);
    return <Pressable key={emoji} onPress={open} accessibilityRole="button" accessibilityLabel={`${emoji}, ${matches.length} reaction${matches.length > 1 ? 's' : ''}${mine ? ', including yours' : ''}. Change reaction`} style={[s.badge, mine && s.selected]}><Text style={s.emoji}>{emoji} <Text style={s.count}>{matches.length}</Text></Text></Pressable>;
  })}</View>;
}

export function ReactionPicker({ visible, own, saving, error, loaded, choose, close, retry }: { visible: boolean; own?: ReactionEmoji; saving: boolean; error: string; loaded: boolean; choose: (emoji: ReactionEmoji | null) => void; close: () => void; retry: () => void }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={() => { if (!saving) close(); }}>
    <View style={s.overlay}><Pressable accessibilityLabel="Close reactions" accessibilityRole="button" disabled={saving} onPress={close} style={StyleSheet.absoluteFill} />
      <View style={s.sheet} accessibilityViewIsModal><Text style={s.title}>React to message</Text><View style={s.choices}>{reactionEmoji.map(emoji => <Pressable key={emoji} disabled={saving || !loaded} onPress={() => choose(own === emoji ? null : emoji)} accessibilityRole="button" accessibilityLabel={own === emoji ? `Remove ${emoji} reaction` : `React ${emoji}`} accessibilityState={{ selected: own === emoji, disabled: saving || !loaded }} style={[s.choice, own === emoji && s.selected]}><Text style={s.emoji}>{emoji}</Text></Pressable>)}</View>
        <Text style={s.hint}>{saving ? 'Saving…' : !loaded ? 'Loading reactions…' : 'Tap your selected emoji again to remove it.'}</Text>
        {!!own && <Pressable disabled={saving} onPress={() => choose(null)} style={s.action} accessibilityRole="button"><Text style={s.link}>Remove reaction</Text></Pressable>}
        {!!error && <><Text accessibilityRole="alert" style={s.hint}>{error}</Text><Pressable disabled={saving} onPress={retry} style={s.action} accessibilityRole="button"><Text style={s.link}>Retry</Text></Pressable></>}
        <Pressable disabled={saving} onPress={close} style={s.action} accessibilityRole="button"><Text style={s.link}>Cancel</Text></Pressable>
      </View>
    </View>
  </Modal>;
}
const s = StyleSheet.create({
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, badge: { borderRadius: 20, backgroundColor: colors.white, paddingHorizontal: 9, minHeight: 44, justifyContent: 'center', borderWidth: 2, borderColor: colors.border },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft }, emoji: { fontSize: 26 }, count: { fontSize: 14, color: colors.ink },
  overlay: { flex: 1, backgroundColor: '#00000066', justifyContent: 'center', alignItems: 'center', padding: 22 }, sheet: { width: '100%', maxWidth: 380, borderRadius: 24, padding: 20, backgroundColor: colors.white },
  title: { fontSize: 21, fontWeight: '700', color: colors.ink, marginBottom: 16 }, choices: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }, choice: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  hint: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: 14 }, action: { minHeight: 44, justifyContent: 'center', alignItems: 'center', marginTop: 8 }, link: { color: colors.accent, fontSize: 17, fontWeight: '700' },
});
