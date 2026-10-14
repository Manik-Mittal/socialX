import { router } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { useAuth } from '../auth';
import { colors } from '../theme';
export function ManageReelButton({ id, authorId, dark = false }: { id: string; authorId?: string; dark?: boolean }) {
  const { session } = useAuth();
  if (!authorId || session?.user.id !== authorId) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel="Edit your reel" onPress={() => router.push({ pathname: '/edit-reel/[id]', params: { id } })} style={{ paddingVertical: 12 }}><Text style={{ fontSize: 15, fontWeight: '700', color: dark ? colors.white : colors.accent }}>Edit</Text></Pressable>;
}
