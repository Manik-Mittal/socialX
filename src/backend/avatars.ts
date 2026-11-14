import { supabase } from '../auth';
import { readMedia } from './media';
import type { ImagePickerAsset } from 'expo-image-picker';

export async function avatarUrl(path?: string | null): Promise<string | null> {
  if (!path || !supabase) return null;
  const { data, error } = await supabase.storage.from('socialx-media').createSignedUrl(path, 3600);
  if (error) throw new Error('Could not load profile photo. Please retry.');
  return data.signedUrl;
}
export async function uploadAvatar(userId: string, asset: ImagePickerAsset): Promise<string> {
  if (!supabase) throw new Error('Please log in again.');
  const db = supabase;
  // Check setup before uploading so a missing migration never leaves an orphan file.
  const previous = await db.from('profiles').select('avatar_path').eq('id', userId).single();
  if (previous.error) throw new Error('Profile photos need database setup. Run 202611090001_profile_photos_live_likes.sql in Supabase.');
  if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error('Choose a profile photo smaller than 5 MB.');
  const { bytes, type } = await readMedia(asset.uri);
  if (!bytes.byteLength || bytes.byteLength > 5 * 1024 * 1024) throw new Error('Choose a non-empty photo smaller than 5 MB.');
  const mime = (asset.mimeType || type).split(';')[0].toLowerCase();
  const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as Record<string, string>)[mime];
  if (!ext) throw new Error('Choose a JPG, PNG or WebP photo.');
  const path = `${userId}/avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const bucket = db.storage.from('socialx-media');
  const uploaded = await bucket.upload(path, bytes, { contentType: mime, upsert: false });
  if (uploaded.error) throw new Error(uploaded.error.message);
  const saved = await db.from('profiles').update({ avatar_path: path }).eq('id', userId).select('avatar_path').single();
  if (saved.error) {
    const check = await db.from('profiles').select('avatar_path').eq('id', userId).single();
    if (check.data?.avatar_path !== path) {
      if (!check.error) await bucket.remove([path]);
      throw new Error('Could not confirm the photo update. Refresh your profile before retrying.');
    }
  }
  if (previous.data.avatar_path) await bucket.remove([previous.data.avatar_path]);
  return path;
}
