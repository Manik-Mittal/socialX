import { client } from './social';
export type ExportSource = { url: string; filename: string; mime: string; title: string };
export async function getReelExport(id: string): Promise<ExportSource> {
  const db = client();
  const { data, error } = await db.from('posts').select('id,title,media_path,media_type').eq('id', id).single();
  if (error || !data) throw new Error('This reel is unavailable. Refresh and try again.');
  if (data.media_type !== 'video') throw new Error('Only video reels can be exported here.');
  const extension = data.media_path.split('.').pop()?.toLowerCase();
  const mime = ({ mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm' } as Record<string, string>)[extension ?? ''];
  if (!mime) throw new Error('This video format cannot be exported.');
  // Resolve a fresh URL rather than relying on a feed URL that may have expired.
  const signed = await db.storage.from('socialx-media').createSignedUrl(data.media_path, 600);
  if (signed.error || !signed.data) throw new Error('Could not access this video. Please try again.');
  return { url: signed.data.signedUrl, filename: `socialx-${data.id}.${extension}`, mime, title: data.title };
}
