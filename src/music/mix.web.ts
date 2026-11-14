import { Asset } from 'expo-asset';
import type { MusicTrack } from './catalog';

export const canMixMusic = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && typeof AudioContext !== 'undefined';
export async function mixMusic(uri: string, track: MusicTrack, keepOriginal: boolean, durationMs?: number | null) {
  if (!canMixMusic) throw new Error('This browser cannot export music. Use the latest SocialX app or Chrome.');
  const context = new AudioContext();
  // Resume during the Apply button gesture, before fetching or decoding.
  await context.resume();
  const video = document.createElement('video');
  video.playsInline = true; video.preload = 'auto'; video.crossOrigin = 'anonymous';
  let stream: MediaStream | undefined;
  let recorder: MediaRecorder | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let frame = 0;
  let music: AudioBufferSourceNode | undefined;
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Video took too long to load.')), 20000);
      video.onloadeddata = () => { clearTimeout(timeout); resolve(); };
      video.onerror = () => { clearTimeout(timeout); reject(new Error('Could not read this video.')); };
      video.src = uri; video.load();
    });
    // MediaRecorder WebM may omit duration metadata; our camera supplies it.
    const duration = Number.isFinite(video.duration) ? video.duration : (durationMs ?? 0) / 1000;
    if (duration <= 0 || duration > 60.1) throw new Error('Choose a video up to 60 seconds.');
    const response = await fetch(Asset.fromModule(track.asset).uri);
    if (!response.ok) throw new Error('Could not load the music track.');
    const audio = await context.decodeAudioData(await response.arrayBuffer());
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    canvas.height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    const drawing = canvas.getContext('2d');
    if (!drawing) throw new Error('Video processing is unavailable.');
    const destination = context.createMediaStreamDestination();
    const original = context.createMediaElementSource(video);
    const originalGain = context.createGain(); originalGain.gain.value = keepOriginal ? .8 : 0;
    original.connect(originalGain).connect(destination);
    music = context.createBufferSource(); music.buffer = audio; music.loop = true;
    const gain = context.createGain(); gain.gain.value = keepOriginal ? .55 : 1;
    music.connect(gain).connect(destination);
    stream = canvas.captureStream(30);
    destination.stream.getAudioTracks().forEach(t => stream!.addTrack(t));
    const mimeType = ['video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    if (!mimeType) throw new Error('This browser has no supported video exporter.');
    recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2000000, audioBitsPerSecond: 128000 });
    const chunks: Blob[] = [];
    const draw = () => { drawing.drawImage(video, 0, 0, canvas.width, canvas.height); frame = requestAnimationFrame(draw); };
    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder!.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder!.onerror = () => reject(new Error('Music export failed. Please retry.'));
      recorder!.onstop = () => resolve(new Blob(chunks, { type: mimeType.split(';')[0] }));
      video.onended = () => { if (recorder?.state === 'recording') recorder.stop(); };
      timer = setTimeout(() => reject(new Error('Export paused or timed out. Keep this page open and try again.')), (duration + 20) * 1000);
      drawing.drawImage(video, 0, 0, canvas.width, canvas.height);
      recorder!.start(250); music!.start(); draw();
      void video.play().catch(reject);
    });
    if (!blob.size || blob.size > 25 * 1024 * 1024) throw new Error('The finished reel must be under 25 MB. Try a shorter video.');
    return { uri: URL.createObjectURL(blob), mimeType: blob.type };
  } finally {
    if (timer) clearTimeout(timer);
    cancelAnimationFrame(frame); video.pause();
    if (recorder?.state === 'recording') recorder.stop();
    stream?.getTracks().forEach(t => t.stop());
    music?.disconnect(); await context.close();
    video.removeAttribute('src'); video.load();
  }
}
