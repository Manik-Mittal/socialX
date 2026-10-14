import { client } from './social';
import type { Reel } from '../data';
import { categories } from '../theme';
export type PostDetails = Pick<Reel, 'title' | 'description' | 'city' | 'category'>;
export async function editPost(id: string, userId: string, details: PostDetails): Promise<PostDetails> {
  const next = { category: details.category, title: details.title.trim(), description: details.description.trim(), city: details.city.trim() };
  if (!next.title || next.title.length > 70 || !next.city || next.city.length > 40 || next.description.length > 240 || !categories.includes(next.category)) throw new Error('Enter a title (up to 70 characters), city (up to 40), and description (up to 240).');
  const { data, error } = await client().from('posts').update(next).eq('id', id).eq('author_id', userId).select('title,description,city,category').single();
  if (error) throw new Error(error.code === '42501' ? 'Editing needs the edit-posts SQL migration. Run it in Supabase and retry.' : 'Could not save changes. Refresh and retry.');
  return data as PostDetails;
}
export async function deletePost(id: string, userId: string): Promise<string> {
  const { data: post, error: readError } = await client().from('posts').select('media_path').eq('id', id).eq('author_id', userId).maybeSingle();
  if (readError) throw new Error('Could not verify this post. Please retry.');
  if (!post) throw new Error('This post is unavailable or does not belong to you.');
  const { data, error } = await client().from('posts').delete().eq('id', id).eq('author_id', userId).select('id');
  if (error || !data?.length) {
    // Only remove storage after confirming that publication is gone.
    const check = await client().from('posts').select('id').eq('id', id).maybeSingle();
    if (check.error || check.data) throw new Error('Could not confirm deletion. Refresh before retrying.');
  }
  return post.media_path;
}
export async function removePostMedia(path: string, userId: string) {
  if (!path.startsWith(`${userId}/`)) throw new Error('Invalid media ownership.');
  const { error } = await client().storage.from('socialx-media').remove([path]);
  if (error) throw new Error('The reel is deleted, but its video file could not be removed. Retry file cleanup.');
}
