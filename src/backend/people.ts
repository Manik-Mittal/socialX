import { client, hydrate } from './social';
import { validId } from './chat';
export type PublicPerson = { id: string; display_name: string; bio: string };
export async function searchPeople(term: string, offset = 0): Promise<PublicPerson[]> {
  const text = term.trim();
  if (text.length < 2) return [];
  const literal = text.replace(/[\\%_]/g, '\\$&');
  const { data, error } = await client().from('profiles').select('id,display_name,bio').ilike('display_name', `%${literal}%`).order('display_name').order('id').range(offset, offset + 29);
  if (error) throw error;
  return data;
}
export async function publicProfile(id: string, viewer: string) {
  if (!validId(id)) throw new Error('Invalid profile link.');
  const results = await Promise.all([
    client().from('profiles').select('id,display_name,bio').eq('id', id).maybeSingle(),
    client().from('posts').select('id', { count: 'exact', head: true }).eq('author_id', id),
    client().from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
    client().from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id),
    client().from('follows').select('following_id').eq('follower_id', viewer).eq('following_id', id).maybeSingle(),
  ]);
  for (const result of results) if (result.error) throw result.error;
  if (!results[0].data) throw new Error('This profile is no longer available.');
  return { person: results[0].data as PublicPerson, posts: results[1].count ?? 0, followers: results[2].count ?? 0, following: results[3].count ?? 0, isFollowing: !!results[4].data };
}
export async function personPosts(id: string, viewer: string, offset = 0) {
  const { data, error } = await client().from('posts').select('*').eq('author_id', id).order('created_at', { ascending: false }).order('id').range(offset, offset + 29);
  if (error) throw error;
  return { posts: await hydrate(data, viewer), hasMore: data.length === 30 };
}
