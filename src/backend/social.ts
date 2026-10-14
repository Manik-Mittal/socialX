import { supabase } from '../auth';
import type { Reel } from '../data';
import { readMedia } from './media';

export type Person = { id: string; name: string; handle: string };
type Post = { id: string; author_id: string; title: string; description: string; city: string; category: Reel['category']; media_path: string; media_type: 'image' | 'video'; created_at: string };
export function client() {
  if (!supabase) throw new Error('Connect Supabase before using your account.');
  return supabase;
}
export function handleFor(id: string) { return `@creator_${id.replaceAll('-', '')}`; }
function failure(error: { code?: string; message: string }) {
  if (['PGRST205', '42P01'].includes(error.code ?? '')) return new Error('Social features need the new database setup. Run the social migration in Supabase, then retry.');
  return new Error(error.message);
}

// Read all relationship pages so counts and saved collections are never silently truncated.
async function rows<T>(table: string, order: string, match: Record<string, string> = {}): Promise<T[]> {
  const result: T[] = [];
  for (let start = 0; ; start += 200) {
    const { data, error } = await client().from(table).select('*').match(match).order(order).range(start, start + 199);
    if (error) throw failure(error);
    result.push(...data as T[]);
    if (data.length < 200) return result;
  }
}
export async function hydrate(posts: Post[], userId: string): Promise<Reel[]> {
  if (!posts.length) return [];
  const authorIds = [...new Set(posts.map(post => post.author_id))];
  const { data: authors, error: authorError } = await client().from('profiles').select('id,display_name').in('id', authorIds);
  if (authorError) throw failure(authorError);
  const { data: media, error } = await client().storage.from('socialx-media').createSignedUrls(posts.map(post => post.media_path), 3600);
  if (error) throw failure(error);
  return posts.map((post, index) => ({ id: post.id, authorId: post.author_id,
    creator: authors.find(author => author.id === post.author_id)?.display_name ?? 'Creator',
    handle: post.author_id === userId ? '@you' : handleFor(post.author_id),
    title: post.title, description: post.description, city: post.city, category: post.category,
    mediaUri: media[index]?.signedUrl ?? undefined, mediaType: post.media_type,
    mediaMissing: !media[index]?.signedUrl, emoji: '', action: 'Save reel',
  }));
}
export async function feedPage(userId: string, offset = 0) {
  const { data, error } = await client().from('posts').select('*').order('created_at', { ascending: false }).order('id').range(offset, offset + 29);
  if (error) throw failure(error);
  return { reels: await hydrate(data as Post[], userId), hasMore: data.length === 30 };
}
export async function loadSocial(userId: string) {
  const [feed, saves, follows, followers, own] = await Promise.all([
    feedPage(userId), rows<{ post_id: string }>('saved_posts', 'post_id', { user_id: userId }),
    rows<{ following_id: string }>('follows', 'following_id', { follower_id: userId }),
    rows<{ follower_id: string }>('follows', 'follower_id', { following_id: userId }),
    rows<Post>('posts', 'id', { author_id: userId }),
  ]);
  const savedPosts: Post[] = [];
  for (let i = 0; i < saves.length; i += 100) {
    const { data, error } = await client().from('posts').select('*').in('id', saves.slice(i, i + 100).map(save => save.post_id));
    if (error) throw failure(error);
    savedPosts.push(...data as Post[]);
  }
  const peopleIds = [...new Set([...follows.map(row => row.following_id), ...followers.map(row => row.follower_id)])];
  const people = new Map<string, Person>();
  for (let i = 0; i < peopleIds.length; i += 100) {
    const { data, error } = await client().from('profiles').select('id,display_name').in('id', peopleIds.slice(i, i + 100));
    if (error) throw failure(error);
    data.forEach(person => people.set(person.id, { id: person.id, name: person.display_name, handle: handleFor(person.id) }));
  }
  const extras: Reel[] = [];
  const unique = [...new Map([...own, ...savedPosts].map(post => [post.id, post])).values()];
  for (let i = 0; i < unique.length; i += 100) extras.push(...await hydrate(unique.slice(i, i + 100), userId));
  return { reels: [...new Map([...feed.reels, ...extras].map(reel => [reel.id, reel])).values()], feedIds: feed.reels.map(reel => reel.id),
    hasMore: feed.hasMore, savedIds: saves.map(save => save.post_id),
    following: follows.map(row => people.get(row.following_id)!).filter(Boolean),
    followers: followers.map(row => people.get(row.follower_id)!).filter(Boolean) };
}
export async function setSaved(userId: string, postId: string, save: boolean) {
  const query = client().from('saved_posts');
  const { error } = save ? await query.insert({ user_id: userId, post_id: postId }) : await query.delete().eq('user_id', userId).eq('post_id', postId);
  if (error && error.code !== '23505') throw failure(error);
}
export async function setFollowing(userId: string, target: string, follow: boolean) {
  const query = client().from('follows');
  const { error } = follow ? await query.insert({ follower_id: userId, following_id: target }) : await query.delete().eq('follower_id', userId).eq('following_id', target);
  if (error && error.code !== '23505') throw failure(error);
}
export async function publishPost(userId: string, reel: Reel): Promise<Reel> {
  if (!reel.mediaUri || !reel.mediaType) throw new Error('Choose a photo or video first.');
  const { bytes, type } = await readMedia(reel.mediaUri);
  if (!bytes.byteLength || bytes.byteLength > 25 * 1024 * 1024) throw new Error('Choose a non-empty file smaller than 25 MB.');
  const mime = (reel.mimeType || type).split(';')[0].toLowerCase();
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
  const ext = extensions[mime];
  if (!ext || !mime.startsWith(`${reel.mediaType}/`)) throw new Error('Use JPG, PNG, WebP, MP4, WebM or MOV media.');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket = client().storage.from('socialx-media');
  const { error: uploadError } = await bucket.upload(path, bytes, { contentType: mime, upsert: false });
  if (uploadError) throw failure(uploadError);
  const { data, error } = await client().from('posts').insert({ author_id: userId, title: reel.title, description: reel.description, city: reel.city, category: reel.category, media_path: path, media_type: reel.mediaType }).select('*').single();
  if (error) {
    // A network timeout may follow a committed insert. Check before removing the upload.
    const lookup = await client().from('posts').select('*').eq('media_path', path).maybeSingle();
    if (lookup.data) return { ...reel, id: lookup.data.id, authorId: userId };
    if (!lookup.error) await bucket.remove([path]);
    throw new Error('Could not confirm publication. Refresh your profile before retrying to avoid duplicates.');
  }
  // Keep the local preview immediately; subsequent loads use the persistent media path.
  return { ...reel, id: data.id, authorId: userId };
}
