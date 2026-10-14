import { File } from 'expo-file-system';
export async function readMedia(uri: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const file = new File(uri);
  if (file.size > 25 * 1024 * 1024) throw new Error('Choose a file smaller than 25 MB.');
  return { bytes: await file.arrayBuffer(), type: file.type };
}
