import type { ExportSource } from '../backend/reelExport';
export type PreparedReel = { canShare: boolean; share: () => Promise<void>; save: () => Promise<string>; dispose: () => void };
export async function prepareReel(source: ExportSource): Promise<PreparedReel> {
  const response = await fetch(source.url);
  if (!response.ok) throw new Error('Could not download this reel. Please retry.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 25 * 1024 * 1024) throw new Error('The downloaded reel is empty or exceeds 25 MB.');
  const file = new File([blob], source.filename, { type: source.mime });
  const canShare = !!navigator.share && !!navigator.canShare?.({ files: [file] });
  return {
    canShare,
    // Called directly from a second user tap, preserving browser user activation.
    share: async () => {
      if (!canShare) throw new Error('This browser cannot share videos directly. Download the video and share it from your files.');
      await navigator.share({ files: [file], title: source.title });
    },
    save: async () => {
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url; link.download = source.filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      return 'Download started. Check your browser’s downloads.';
    },
    dispose: () => {},
  };
}
