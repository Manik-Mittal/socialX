import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useEngagement } from '../engagement';
import { colors } from '../theme';
export function ReelEngagement({ id, dark = false, share = true }: { id: string; dark?: boolean; share?: boolean }) {
  const { entries, refresh, toggle } = useEngagement();
  const entry = entries[id];
  useFocusEffect(useCallback(() => { void refresh(id); }, [id, refresh]));
  const color = dark ? colors.white : colors.ink;
  const action = { alignItems: 'center' as const, minWidth: 48, minHeight: 44, gap: 4, justifyContent: 'center' as const };
  const label = { color, fontSize: 14, fontWeight: '700' as const };
  return <View style={{ gap: dark ? 12 : 8 }}>
    <View style={{ flexDirection: dark ? 'column' : 'row', gap: dark ? 12 : 24 }}>
      <Pressable style={action} accessibilityRole="button" accessibilityLabel={entry?.stats?.liked ? 'Unlike reel' : 'Like reel'} accessibilityState={{ selected: !!entry?.stats?.liked }} disabled={!entry?.stats || entry.busy || !!entry.error} onPress={() => void toggle(id)}><Ionicons name={entry?.stats?.liked ? 'heart' : 'heart-outline'} size={26} color={entry?.stats?.liked ? '#EF4770' : color} /><Text style={label}>{entry?.busy ? '…' : entry?.stats?.likes ?? '—'}</Text></Pressable>
      <Pressable style={action} accessibilityRole="button" accessibilityLabel="Open comments" onPress={() => router.push({ pathname: '/comments/[id]', params: { id } })}><Ionicons name="chatbubble-outline" size={25} color={color} /><Text style={label}>{entry?.stats?.comments ?? '—'}</Text></Pressable>
      {share && <Pressable style={action} accessibilityRole="button" accessibilityLabel="Share reel in a chat" onPress={() => router.push({ pathname: '/messages', params: { postId: id } })}><Ionicons name="paper-plane-outline" size={25} color={color} /><Text style={label}>Share</Text></Pressable>}
    </View>
    {!!entry?.error && <Pressable accessibilityRole="button" accessibilityLabel={entry.error + ' Retry'} onPress={() => void refresh(id)}><Text style={[label, { fontSize: 12, maxWidth: dark ? 80 : undefined }]}>{dark ? 'Unavailable. Retry' : entry.error + ' Tap to retry.'}</Text></Pressable>}
  </View>;
}
