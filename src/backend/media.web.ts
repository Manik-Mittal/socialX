export async function readMedia(uri: string): Promise<{ bytes: ArrayBuffer; type: string }> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Could not read the selected file. Choose it again.');
  const blob = await response.blob();
  if (blob.size > 25 * 1024 * 1024) throw new Error('Choose a file smaller than 25 MB.');
  return { bytes: await blob.arrayBuffer(), type: blob.type };
}
