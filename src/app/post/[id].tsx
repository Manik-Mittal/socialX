import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { chatError, getSharedPost } from '../../backend/chat';
import { ChatError, ChatHeader, chatStyles as s } from '../../components/ChatUI';
import { ReelCard } from '../../components/ReelCard';
import type { Reel } from '../../data';
import { useAppState } from '../../state';

export default function SharedPostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const { cacheReel } = useAppState();
  const [post, setPost] = useState<Reel | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const load = useCallback(() => {
    let active = true;
    void getSharedPost(id, session!.user.id).then(value => { if (active) { setPost(value); cacheReel(value); setError(''); } }).catch(e => { if (active) setError(chatError(e)); });
    return () => { active = false; };
  }, [id, session, cacheReel]);
  // Changing the retry key deliberately reruns the focus fetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useFocusEffect(useCallback(() => load(), [load, retry]));
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}><ChatHeader title="Shared reel" back /><ChatError error={error} retry={() => setRetry(value => value + 1)} /><ScrollView contentContainerStyle={{ padding: 16 }}>{post ? <ReelCard reel={post} /> : !error && <Text style={s.muted}>Loading reel…</Text>}</ScrollView></SafeAreaView>;
}
