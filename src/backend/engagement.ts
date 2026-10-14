import { client } from './social';
export type Stats = { likes: number; comments: number; liked: boolean };
export type Comment = { id: number; user_id: string; body: string; created_at: string; profiles: { display_name: string } | null };
export function engagementError(error: unknown) {
  const e = error as { code?: string; message?: string };
  return ['PGRST202','PGRST205','42P01'].includes(e?.code ?? '')
    ? 'Likes and comments need setup. Run 202610140001_engagement.sql in Supabase, then retry.'
    : e?.message || 'Could not connect. Please retry.';
}
export async function getStats(id: string): Promise<Stats> {
  const { data, error } = await client().rpc('post_engagement', { target: id }).single();
  if (error) throw error;
  return data as Stats;
}
export async function setLike(id: string, userId: string, liked: boolean) {
  const query = client().from('post_likes');
  const { error } = liked ? await query.insert({ post_id: id, user_id: userId }) : await query.delete().eq('post_id', id).eq('user_id', userId);
  if (error && !(liked && error.code === '23505')) throw error;
}
export async function getComments(id: string, before?: number): Promise<Comment[]> {
  let query = client().from('post_comments').select('id,user_id,body,created_at,profiles(display_name)').eq('post_id', id).order('id', { ascending: false }).limit(30);
  if (before !== undefined) query = query.lt('id', before);
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as Comment[];
}
export async function addComment(id: string, userId: string, body: string, nonce: string): Promise<void> {
  const text = body.trim();
  if (!text || text.length > 1000) throw new Error('Write a comment of 1–1,000 characters.');
  const { error } = await client().from('post_comments').insert({ post_id: id, user_id: userId, body: text, client_nonce: nonce });
  if (!error) return;
  const { data: existing } = await client().from('post_comments').select('id').eq('user_id', userId).eq('client_nonce', nonce).maybeSingle();
  if (!existing) throw error;
}
