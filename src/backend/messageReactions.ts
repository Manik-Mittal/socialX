import { client } from './social';
export const reactionEmoji = ['❤️', '😂', '😮', '😢', '😡', '👍', '🔥', '🎉'] as const;
export type ReactionEmoji = typeof reactionEmoji[number];
export type MessageReaction = { message_id: number; user_id: string; emoji: ReactionEmoji };
export function reactionError(error: unknown) {
  const code = (error as { code?: string })?.code;
  return ['PGRST205', 'PGRST202', '42P01', '42883', '42501'].includes(code ?? '')
    ? 'Reactions need setup. Run 202610140004_message_reactions.sql in Supabase, then retry.'
    : 'Could not sync reactions. Check your connection and retry.';
}
export async function readReactions(ids: number[]): Promise<MessageReaction[]> {
  const rows: MessageReaction[] = [];
  // Two participants means at most 200 rows per batch, below the API row cap.
  for (let start = 0; start < ids.length; start += 100) {
    const { data, error } = await client().from('message_reactions').select('message_id,user_id,emoji').in('message_id', ids.slice(start, start + 100));
    if (error) throw error;
    rows.push(...data as MessageReaction[]);
  }
  return rows;
}
export async function writeReaction(messageId: number, userId: string, emoji: ReactionEmoji | null) {
  if (emoji === null) {
    const { error } = await client().from('message_reactions').delete().eq('message_id', messageId).eq('user_id', userId);
    if (error) throw error;
  } else {
    // An RPC avoids granting updates to identity columns just to use upsert.
    const { error } = await client().rpc('set_message_reaction', { target_message: messageId, chosen_emoji: emoji });
    if (error) throw error;
  }
}
