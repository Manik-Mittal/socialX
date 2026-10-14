import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

export function ChatHeader({ title, back = false }: { title: string; back?: boolean }) {
  return <View style={chatStyles.header}>
    {back && <Pressable accessibilityRole="button" accessibilityLabel="Back to messages" onPress={() => router.canGoBack() ? router.back() : router.replace('/messages')} style={chatStyles.icon}><Ionicons name="arrow-back" size={25} color={colors.ink} /></Pressable>}
    <Text numberOfLines={1} style={chatStyles.heading}>{title}</Text>
  </View>;
}
export function ChatError({ error, retry }: { error: string; retry: () => void }) {
  return error ? <View style={chatStyles.notice}><Text accessibilityRole="alert" style={chatStyles.text}>{error}</Text><Pressable accessibilityRole="button" onPress={retry} style={chatStyles.icon}><Text style={chatStyles.link}>Retry</Text></Pressable></View> : null;
}
export const chatStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.white },
  heading: { fontSize: 25, fontWeight: '800', color: colors.ink, flex: 1 },
  text: { fontSize: 16, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 15, lineHeight: 22, color: colors.muted },
  link: { fontSize: 16, fontWeight: '700', color: colors.accent },
  icon: { padding: 10, minHeight: 44, justifyContent: 'center' },
  notice: { padding: 14, backgroundColor: colors.accentSoft },
  empty: { padding: 30, alignItems: 'center', gap: 10 },
  input: { fontSize: 17, padding: 14, borderRadius: 18, backgroundColor: colors.search, color: colors.ink },
});
