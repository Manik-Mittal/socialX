import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import type { ExportSource } from '../backend/reelExport';

export type PreparedReel = { canShare: boolean; share: () => Promise<void>; save: () => Promise<string>; dispose: () => void };
export async function prepareReel(source: ExportSource): Promise<PreparedReel> {
  const directory = new Directory(Paths.cache, 'reel-exports');
  directory.create({ idempotent: true, intermediates: true });
  // Sharing apps may read asynchronously; retain shared files for up to a day.
  for (const item of directory.list()) {
    if (item instanceof File && Date.now() - Number(item.name.split('_')[0]) > 86400000) {
      try { item.delete(); } catch { /* Cache eviction can retry next time. */ }
    }
  }
  const file = new File(directory, `${Date.now()}_${source.filename}`);
  let shared = false;
  const dispose = () => { if (!shared) { try { if (file.exists) file.delete(); } catch { /* OS cache cleanup is also safe. */ } } };
  try {
    await File.downloadFileAsync(source.url, file);
    if (!file.size || file.size > 25 * 1024 * 1024) throw new Error('The downloaded reel is empty or exceeds 25 MB.');
    const canShare = await Sharing.isAvailableAsync();
    return {
      canShare,
      share: async () => {
        if (!canShare) throw new Error('Sharing is unavailable on this device. Save the video instead.');
        shared = true;
        await Sharing.shareAsync(file.uri, { mimeType: source.mime, dialogTitle: 'Share reel', UTI: source.mime === 'video/mp4' ? 'public.mpeg-4' : source.mime === 'video/quicktime' ? 'com.apple.quicktime-movie' : 'org.webmproject.webm' });
      },
      save: async () => {
        const permission = await requestPermissionsAsync(true, ['video']);
        if (!permission.granted) throw new Error('Allow saving videos in your phone settings, then try again. You can still share to another app.');
        try { await Asset.create(file.uri); }
        catch { throw new Error('Your gallery could not save this video format. Try Share to another app instead.'); }
        return 'Video saved to your photo library.';
      },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
