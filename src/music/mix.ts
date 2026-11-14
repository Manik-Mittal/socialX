import { requireOptionalNativeModule } from 'expo';
import { Asset } from 'expo-asset';
import type { MusicTrack } from './catalog';

type MusicModule = { mixMusic?: (video: string, audio: string, keepOriginal: boolean) => Promise<string> };
const module = requireOptionalNativeModule<MusicModule>('SocialXCamera');
export const canMixMusic = typeof module?.mixMusic === 'function';
export async function mixMusic(video: string, track: MusicTrack, keepOriginal: boolean, durationMs?: number | null) {
  if (durationMs != null && durationMs > 60000) throw new Error('Choose a video up to 60 seconds.');
  if (!module?.mixMusic) throw new Error('Adding music needs the latest SocialX app build. Expo Go does not include the music exporter.');
  const asset = await Asset.fromModule(track.asset).downloadAsync();
  if (!asset.localUri) throw new Error('Could not load this music track. Please retry.');
  const uri = await module.mixMusic(video, asset.localUri, keepOriginal);
  return { uri, mimeType: 'video/mp4' };
}
