import { client, hydrate } from './social';

export type Message = { id: number; sender_id: string; recipient_id: string; body: string; kind: 'text' | 'reel'; post_id: string | null; created_at: string };
export type Contact = { id: string; display_name: string };
export type Conversation = { peer_id: string; display_name: string; body: string; kind: 'text' | 'reel'; created_at: string; message_id: number };
export const validId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export function chatError(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (['PGRST205', 'PGRST202', '42P01', '42883'].includes(e?.code ?? '')) return 'Chat needs database setup. Run 202610130001_messages.sql in Supabase, then retry.';
  return e?.message || 'Could not connect. Please retry.';
}
export async function inbox(offset = 0): Promise<Conversation[]> {
  const { data, error } = await client().rpc('chat_inbox', { page_offset: offset });
  if (error) throw error;
  return data;
}
export async function findContacts(term: string, userId: string): Promise<Contact[]> {
  const literal = term.trim().replace(/[\\%_]/g, '\\$&');
  if (literal.length < 2) return [];
  const { data, error } = await client().from('profiles').select('id,display_name').neq('id', userId)
    .ilike('display_name', `%${literal}%`).order('display_name').order('id').limit(30);
  if (error) throw error;
  return data;
}
export async function getContact(id: string): Promise<Contact> {
  if (!validId(id)) throw new Error('Invalid person. Return to Messages and select someone.');
  const { data, error } = await client().from('profiles').select('id,display_name').eq('id', id).single();
  if (error) throw error;
  return data;
}
export async function messagePage(userId: string, peerId: string, before?: number, after?: number): Promise<Message[]> {
  if (!validId(userId) || !validId(peerId)) throw new Error('Invalid conversation.');
  let query = client().from('messages').select('*')
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${peerId}),and(sender_id.eq.${peerId},recipient_id.eq.${userId})`)
    .order('id', { ascending: after !== undefined }).limit(50);
  if (before !== undefined) query = query.lt('id', before);
  if (after !== undefined) query = query.gt('id', after);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function sendMessage(userId: string, peerId: string, body: string, postId: string | undefined, nonce: string): Promise<Message> {
  if (!validId(peerId) || userId === peerId) throw new Error('Choose another person to message.');
  if (body.trim().length > 2000 || (!body.trim() && !postId)) throw new Error('Write a message of up to 2,000 characters or attach a reel.');
  const { data, error } = await client().from('messages').insert({ sender_id: userId, recipient_id: peerId,
    body: body.trim(), post_id: postId || null, kind: postId ? 'reel' : 'text', client_nonce: nonce }).select('*').single();
  if (!error) return data;
  // A lost response can follow a committed insert. The same nonce makes retries safe.
  const { data: existing } = await client().from('messages').select('*').eq('sender_id', userId).eq('client_nonce', nonce).maybeSingle();
  if (existing) return existing;
  throw error;
}
export async function getSharedPost(id: string, userId: string) {
  if (!validId(id)) throw new Error('This reel link is invalid.');
  const { data, error } = await client().from('posts').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('This post is no longer available.');
  return (await hydrate([data], userId))[0];
}
