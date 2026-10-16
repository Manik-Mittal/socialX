import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../auth';
import { chatError, getContact, getSharedPost, messagePage, sendMessage, type Message } from '../../backend/chat';
import { ChatError, ChatHeader, chatStyles as s } from '../../components/ChatUI';
import { colors } from '../../theme';
import { ReactionBadges, ReactionPicker, useMessageReactions } from '../../components/MessageReactions';

export default function ChatRoute() {
  const { userId, postId } = useLocalSearchParams<{ userId: string; postId?: string }>();
  return <Conversation key={`${userId}:${postId ?? ''}`} peerId={userId} initialPost={postId} />;
}
function Conversation({ peerId, initialPost }: { peerId: string; initialPost?: string }) {
  const { session } = useAuth();
  const me = session!.user.id;
  const [name, setName] = useState('Conversation');
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactionMessage, setReactionMessage] = useState<number | null>(null);
  const reactions = useMessageReactions(messages.map(message => message.id), me);
  const current = useRef<Message[]>([]);
  const receivedThrough = useRef(0);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState(initialPost);
  const [attachmentTitle, setAttachmentTitle] = useState('Loading reel…');
  const [attachmentReady, setAttachmentReady] = useState(!initialPost);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const [sending, setSending] = useState(false);
  const [older, setOlder] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const live = useRef(true);
  useEffect(() => { live.current = true; return () => { live.current = false; }; }, []);
  const reading = useRef(false);
  const writing = useRef(false);
  const draft = useRef<{ body: string; post?: string; nonce: string } | null>(null);
  const list = useRef<FlatList<Message>>(null);
  const merge = useCallback((rows: Message[]) => {
    current.current = [...new Map([...current.current, ...rows].map(row => [row.id, row])).values()].sort((a, b) => b.id - a.id);
    setMessages(current.current);
  }, []);
  const load = useCallback(async (history = false) => {
    if (reading.current) return;
    reading.current = true;
    if (history) setOlder(true);
    try {
      if (peerId === me) throw new Error('Choose another person to message.');
      const person = await getContact(peerId);
      if (!live.current) return;
      setName(person.display_name);
      const previous = current.current;
      if (history || !previous.length) {
        const rows = await messagePage(me, peerId, history ? previous[previous.length - 1]?.id : undefined);
        if (!live.current) return;
        merge(rows); setHasMore(rows.length === 50);
        if (!history) receivedThrough.current = rows[0]?.id ?? 0;
      } else {
        let cursor = receivedThrough.current;
        for (;;) {
          const rows = await messagePage(me, peerId, undefined, cursor);
          if (!live.current) return;
          merge(rows);
          if (rows.length) receivedThrough.current = rows[rows.length - 1].id;
          if (rows.length < 50) break;
          cursor = rows[rows.length - 1].id;
        }
      }
      setReady(true); setError('');
    } catch (e) { if (live.current) setError(chatError(e)); }
    finally { reading.current = false; if (live.current) setOlder(false); }
  }, [me, peerId, merge]);
  useFocusEffect(useCallback(() => {
    live.current = true;
    void load();
    if (initialPost) void getSharedPost(initialPost, me).then(post => {
      if (!live.current) return;
      if (post.mediaType !== 'video') throw new Error('Only reels can be shared in chat.');
      setAttachmentTitle(post.title); setAttachmentReady(true);
    }).catch(e => { if (live.current) { setAttachmentTitle(chatError(e)); setAttachmentReady(false); } });
    const timer = setInterval(() => { if (AppState.currentState === 'active') void load(); }, 5000);
    return () => clearInterval(timer);
  }, [load, initialPost, me]));
  async function send() {
    if (writing.current || !ready || (!body.trim() && !attachment) || (attachment && !attachmentReady)) return;
    writing.current = true; setSending(true); setSendError('');
    if (!draft.current || draft.current.body !== body || draft.current.post !== attachment) {
      draft.current = { body, post: attachment, nonce: `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}` };
    }
    try {
      const sent = await sendMessage(me, peerId, body, attachment, draft.current.nonce);
      if (!live.current) return;
      merge([sent]); setBody(''); setAttachment(undefined); draft.current = null;
      list.current?.scrollToOffset({ offset: 0, animated: true });
    } catch (e) { if (live.current) setSendError(`${chatError(e)} Your draft is kept; tap Send to retry.`); }
    finally { writing.current = false; if (live.current) setSending(false); }
  }
  return <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
    <ChatHeader title={name} back />
    <ChatError error={error} retry={() => void load()} />
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <FlatList ref={list} inverted data={messages} keyExtractor={item => String(item.id)} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => {
          const mine = item.sender_id === me;
          return <Pressable onLongPress={() => setReactionMessage(item.id)} delayLongPress={400} accessibilityHint="Long press to react" accessibilityActions={[{ name: 'activate', label: 'React to message' }]} onAccessibilityAction={() => setReactionMessage(item.id)} style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
            {item.kind === 'reel' && <Pressable accessibilityRole="button" accessibilityLabel={item.post_id ? 'Open shared reel. Long press to react' : 'Reel unavailable. Long press to react'} onLongPress={() => setReactionMessage(item.id)} delayLongPress={400} onPress={() => { if (item.post_id) router.push({ pathname: '/post/[id]', params: { id: item.post_id } }); }} style={[styles.reel, { borderColor: mine ? '#FFFFFF66' : colors.border }]}>
              <Ionicons name="play-circle-outline" size={30} color={mine ? colors.white : colors.accent} /><View style={{ flex: 1 }}><Text style={[s.text, mine && styles.white]}>{item.post_id ? 'Shared reel' : 'Reel unavailable'}</Text><Text style={[s.muted, mine && styles.white]}>{item.post_id ? 'Tap to watch' : 'This reel was deleted'}</Text></View>
            </Pressable>}
            {!!item.body && <Text style={[s.text, mine && styles.white]}>{item.body}</Text>}
            <Text style={[styles.time, mine && styles.white]}>{new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
            <ReactionBadges rows={reactions.rows.filter(row => row.message_id === item.id)} me={me} open={() => setReactionMessage(item.id)} />
          </Pressable>;
        }}
        ListEmptyComponent={<View style={s.empty}><Text style={s.muted}>{ready ? 'Say hello or share a reel.' : error ? 'Could not load this chat.' : 'Loading chat…'}</Text></View>}
        ListFooterComponent={hasMore ? <Pressable disabled={older} accessibilityRole="button" onPress={() => void load(true)} style={s.icon}><Text style={[s.link, { textAlign: 'center' }]}>{older ? 'Loading…' : 'Load earlier messages'}</Text></Pressable> : null} />
      {!!sendError && <Text accessibilityRole="alert" style={[s.text, s.notice]}>{sendError}</Text>}
      {!!attachment && <View style={[s.notice, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}><Ionicons name="videocam-outline" size={24} color={colors.accent} /><Text numberOfLines={2} style={[s.text, { flex: 1 }]}>{attachmentTitle}</Text><Pressable disabled={sending} accessibilityRole="button" accessibilityLabel="Remove attached reel" onPress={() => setAttachment(undefined)} style={s.icon}><Ionicons name="close" size={24} color={colors.ink} /></Pressable></View>}
      <View style={styles.composer}><TextInput value={body} onChangeText={setBody} editable={!sending} multiline maxLength={2000} placeholder="Write a message…" accessibilityLabel="Message" style={[s.input, { flex: 1, maxHeight: 130 }]} /><Pressable accessibilityRole="button" accessibilityLabel="Send message" disabled={sending || !ready || (!body.trim() && !attachment) || (!!attachment && !attachmentReady)} onPress={() => void send()} style={[styles.send, (sending || !ready || (!body.trim() && !attachment) || (!!attachment && !attachmentReady)) && { opacity: 0.4 }]}><Ionicons name="send" size={22} color={colors.white} /><Text style={styles.white}>{sending ? 'Sending' : 'Send'}</Text></Pressable></View>
    </KeyboardAvoidingView>
    <ReactionPicker visible={reactionMessage !== null} own={reactions.rows.find(row => row.message_id === reactionMessage && row.user_id === me)?.emoji} saving={reactions.saving} loaded={reactions.loaded} error={reactions.error} retry={() => void reactions.refresh()} close={() => setReactionMessage(null)} choose={emoji => { if (reactionMessage !== null) void reactions.react(reactionMessage, emoji).then(saved => { if (saved && live.current) setReactionMessage(null); }); }} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  bubble: { maxWidth: '88%', padding: 13, borderRadius: 20, marginVertical: 5, gap: 7 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 5 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderBottomLeftRadius: 5 },
  white: { color: colors.white }, time: { fontSize: 12, color: colors.muted, alignSelf: 'flex-end' },
  reel: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderWidth: 1, minWidth: 190 },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.white },
  send: { minHeight: 52, borderRadius: 18, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', padding: 10, gap: 3 },
});
