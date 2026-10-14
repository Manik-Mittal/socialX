import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CameraStudioProps } from './CameraStudio';

const filters = [
  { name: 'Original', value: 'none', color: '#64748b' },
  { name: 'Golden', value: 'sepia(.4) saturate(1.35) brightness(1.06)', color: '#dca86b' },
  { name: 'Rosé', value: 'sepia(.25) hue-rotate(310deg) saturate(1.4)', color: '#df9cbf' },
  { name: 'Arctic', value: 'saturate(.7) contrast(1.1) hue-rotate(15deg)', color: '#92c7df' },
  { name: 'Noir', value: 'grayscale(1) contrast(1.2)', color: '#777780' },
  { name: 'Vintage', value: 'sepia(.6) contrast(.85) saturate(.85)', color: '#ac987a' },
];
const effects = ['None', 'Sparkles', 'Hearts', 'Vignette'] as const;
type Effect = typeof effects[number];
type Mode = 'idle' | 'opening' | 'ready' | 'recording' | 'finishing' | 'review';
const button: CSSProperties = { border: '1px solid #ffffff35', borderRadius: 20, background: '#ffffff12', color: 'white', padding: '12px 18px', minHeight: 46, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, flexShrink: 0 };

export function CameraStudio({ onClose, onCapture }: CameraStudioProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const source = useRef<HTMLVideoElement | null>(null);
  const cameraStream = useRef<MediaStream | null>(null);
  const outputStream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const generation = useRef(0);
  const frame = useRef(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewUrl = useRef<string | null>(null);
  const started = useRef(0);
  const settings = useRef({ filter: 'none', effect: 'None' as Effect, mirror: true });
  const [filter, setFilter] = useState(0);
  const [effect, setEffect] = useState<Effect>('None');
  const [mode, setMode] = useState<Mode>('idle');
  const [error, setError] = useState('');
  const [front, setFront] = useState(true);
  const [sound, setSound] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [filterSupported, setFilterSupported] = useState(true);
  const [clip, setClip] = useState<{ uri: string; duration: number; mime: string; size: number } | null>(null);

  function releaseCamera() {
    cancelAnimationFrame(frame.current);
    cameraStream.current?.getTracks().forEach(track => track.stop());
    outputStream.current?.getTracks().forEach(track => track.stop());
    cameraStream.current = null;
    outputStream.current = null;
    if (source.current) { source.current.pause(); source.current.srcObject = null; source.current = null; }
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }

  useEffect(() => {
    const lifecycle = generation;
    const visibility = () => {
      if (document.hidden && recorder.current?.state === 'recording') recorder.current.stop();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      lifecycle.current++;
      if (recorder.current) {
        recorder.current.onstop = null;
        recorder.current.ondataavailable = null;
        recorder.current.onerror = null;
        if (recorder.current.state !== 'inactive') recorder.current.stop();
      }
      releaseCamera();
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, []);

  function draw(time: number) {
    const c = canvas.current;
    const v = source.current;
    const ctx = c?.getContext('2d');
    if (!c || !v || !ctx) return;
    if (v.readyState >= 2 && v.videoWidth) {
      const w = c.width, h = c.height;
      const scale = Math.max(w / v.videoWidth, h / v.videoHeight);
      ctx.save();
      ctx.clearRect(0, 0, w, h);
      if (settings.current.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.filter = settings.current.filter;
      ctx.drawImage(v, (w - v.videoWidth * scale) / 2, (h - v.videoHeight * scale) / 2, v.videoWidth * scale, v.videoHeight * scale);
      ctx.restore();
      const fx = settings.current.effect;
      if (fx === 'Vignette') {
        const gradient = ctx.createRadialGradient(w / 2, h / 2, w * .25, w / 2, h / 2, h * .65);
        gradient.addColorStop(0, 'transparent'); gradient.addColorStop(1, '#000000cc');
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
      } else if (fx !== 'None') {
        for (let i = 0; i < 16; i++) {
          const x = ((i * 137.5 + Math.sin(time / 1400 + i) * 28) % w + w) % w;
          const y = h - ((time / 35 + i * 87) % (h + 50));
          ctx.save(); ctx.translate(x, y);
          ctx.globalAlpha = .45 + .4 * Math.sin(time / 700 + i) ** 2;
          ctx.fillStyle = fx === 'Hearts' ? '#ff93be' : '#fff5c5';
          ctx.font = `${20 + i % 4 * 5}px sans-serif`;
          ctx.fillText(fx === 'Hearts' ? '♥' : '✦', 0, 0); ctx.restore();
        }
      }
    }
    frame.current = requestAnimationFrame(draw);
  }

  async function openCamera(facing = front) {
    const request = ++generation.current;
    releaseCamera(); setMode('opening'); setError('');
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error('Camera access needs HTTPS or localhost. Open the app in a supported browser.');
      if (typeof MediaRecorder === 'undefined' || !canvas.current?.captureStream) throw new Error('Recording effects is not supported in this browser. Try Chrome or Edge, or import a video.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facing ? 'user' : 'environment' }, width: { ideal: 720 }, height: { ideal: 1280 }, frameRate: { ideal: 30, max: 30 } }, audio: sound });
      if (request !== generation.current) { stream.getTracks().forEach(t => t.stop()); return; }
      cameraStream.current = stream;
      const v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.srcObject = stream; source.current = v;
      await v.play();
      if (request !== generation.current) return;
      const ctx = canvas.current?.getContext('2d');
      if (!ctx) throw new Error('Camera preview is unavailable in this browser.');
      const supported = 'filter' in ctx;
      setFilterSupported(supported);
      if (!supported) { setFilter(0); settings.current.filter = 'none'; }
      const actualFacing = stream.getVideoTracks()[0]?.getSettings().facingMode;
      settings.current.mirror = actualFacing ? actualFacing === 'user' : facing;
      setFront(settings.current.mirror);
      draw(0); setMode('ready');
      stream.getVideoTracks()[0].onended = () => {
        if (request !== generation.current) return;
        if (recorder.current?.state === 'recording') recorder.current.stop();
        else { releaseCamera(); setMode('idle'); setError('Camera disconnected. Connect it and try again.'); }
      };
    } catch (err) {
      if (request !== generation.current) return;
      releaseCamera(); setMode('idle');
      const name = err instanceof Error ? err.name : '';
      setError(name === 'NotAllowedError' ? 'Camera or microphone access was denied. Allow access in browser settings, or turn sound off and retry.' : name === 'NotFoundError' ? 'No camera or microphone was found. Connect a camera, or try with sound off.' : err instanceof Error ? err.message : 'Could not open the camera. Please retry.');
    }
  }

  function record() {
    if (mode !== 'ready' || !canvas.current || !cameraStream.current) return;
    setError('');
    try {
      const stream = canvas.current.captureStream(30);
      cameraStream.current.getAudioTracks().forEach(track => stream.addTrack(track.clone()));
      outputStream.current = stream;
      const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(type => MediaRecorder.isTypeSupported(type));
      if (!mimeType) throw new Error('This browser cannot record a supported video format. Try Chrome or Edge.');
      const r = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      const chunks: Blob[] = [];
      const request = generation.current;
      let failed = false;
      recorder.current = r;
      r.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      r.onerror = () => { failed = true; setError('Recording failed. Please try a shorter clip.'); };
      r.onstop = () => {
        if (request !== generation.current) return;
        const duration = Math.min(60000, performance.now() - started.current);
        releaseCamera();
        if (failed || !chunks.length) { setMode('idle'); setError('The recording could not be saved. Please try again.'); return; }
        const blob = new Blob(chunks, { type: r.mimeType });
        const uri = URL.createObjectURL(blob);
        previewUrl.current = uri;
        setClip({ uri, duration, mime: r.mimeType, size: blob.size }); setMode('review');
      };
      r.start(250); started.current = performance.now(); setSeconds(0); setMode('recording');
      timer.current = setInterval(() => {
        const elapsed = performance.now() - started.current;
        setSeconds(Math.min(60, Math.floor(elapsed / 1000)));
        if (elapsed >= 60000 && r.state === 'recording') { setMode('finishing'); r.stop(); }
      }, 200);
    } catch (err) {
      outputStream.current?.getTracks().forEach(t => t.stop()); outputStream.current = null;
      setError(err instanceof Error ? err.message : 'Recording is unavailable.');
    }
  }

  function retake() {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = null; setClip(null); setMode('idle'); setSeconds(0);
  }
  const busy = mode === 'opening' || mode === 'recording' || mode === 'finishing';
  return <div role="dialog" aria-modal="true" aria-label="Reel camera" style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#080d18', color: 'white', overflowY: 'auto', fontFamily: 'system-ui, sans-serif' }}>
    <div style={{ maxWidth: 560, margin: 'auto', padding: '20px 20px 32px' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button style={button} onClick={onClose} aria-label="Close camera">✕</button>
        <div style={{ textAlign: 'center' }}><strong style={{ fontSize: 22, letterSpacing: -.5 }}>SocialX Studio</strong><div style={{ fontSize: 12, color: '#aab7d2', letterSpacing: 1.6, marginTop: 5 }}>MAKE IT YOURS</div></div>
        <span style={{ fontSize: 14, fontWeight: 600, color: mode === 'recording' ? '#ff829e' : '#b6c5e2' }}>{mode === 'recording' ? `● ${seconds}s` : '60s max'}</span>
      </header>
      <div style={{ position: 'relative', borderRadius: 26, overflow: 'hidden', background: 'linear-gradient(145deg,#172a4b,#382443)', aspectRatio: '9 / 12', maxHeight: '55vh', margin: 'auto' }}>
        <canvas ref={canvas} width={540} height={960} aria-label="Live camera with selected effects" style={{ width: '100%', height: '100%', objectFit: 'contain', display: mode === 'review' ? 'none' : 'block' }} />
        {mode === 'review' && clip ? <video src={clip.uri} controls playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : null}
        {(mode === 'idle' || mode === 'opening') && <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 12, padding: 25, textAlign: 'center' }}>
          <span style={{ fontSize: 42 }}>✦</span><strong style={{ fontSize: 28, letterSpacing: -.6 }}>A little more you.</strong><span style={{ color: '#c0cbe0', fontSize: 15 }}>Choose a look. Add a little magic.</span>
          <button style={{ ...button, background: '#6d50dc', marginTop: 12 }} disabled={mode === 'opening'} onClick={() => void openCamera()}>{mode === 'opening' ? 'Opening camera…' : 'Enable camera'}</button>
        </div>}
      </div>
      {error && <p role="alert" style={{ color: '#ffb4c4', fontSize: 15, lineHeight: 1.5 }}>{error}</p>}
      {mode === 'review' && clip ? <>
        <p style={{ textAlign: 'center', color: '#bbc7df', fontSize: 15 }}>Your look is included in this recording.</p>
        <div style={{ display: 'flex', gap: 12 }}><button style={{ ...button, flex: 1 }} onClick={retake}>Retake</button><button style={{ ...button, flex: 1, background: 'linear-gradient(110deg,#245cdb,#a13ca8)' }} onClick={() => { previewUrl.current = null; onCapture({ uri: clip.uri, width: 540, height: 960, type: 'video', duration: clip.duration, mimeType: clip.mime, fileSize: clip.size }); }}>Use video →</button></div>
      </> : <>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '14px 0' }}><button style={button} disabled={busy || mode !== 'ready'} onClick={() => void openCamera(!front)}>↻ Flip</button><button style={button} disabled={mode !== 'idle'} onClick={() => setSound(value => !value)}>Sound {sound ? 'on' : 'off'}</button></div>
        <h3 style={{ fontSize: 16, fontWeight: 650, color: '#e3e8f4', letterSpacing: .3, margin: '20px 0 14px' }}>Filters</h3>
        <div style={{ display: 'flex', overflowX: 'auto', gap: 14, padding: '5px 4px 14px', scrollSnapType: 'x proximity' }}>{filters.map((item, index) => <button key={item.name} disabled={mode === 'finishing' || (!filterSupported && index !== 0)} aria-pressed={filter === index} onClick={() => { setFilter(index); settings.current.filter = item.value; }} style={{ background: 'transparent', border: 0, color: 'white', cursor: 'pointer', minWidth: 74, flexShrink: 0, padding: '3px 0', scrollSnapAlign: 'center', fontFamily: 'inherit', opacity: !filterSupported && index !== 0 ? .35 : 1 }}><span style={{ display: 'block', width: 64, height: 64, margin: '0 auto 12px', borderRadius: '50%', background: `linear-gradient(140deg,${item.color},#292337)`, border: '3px solid #080d18', outline: `2px solid ${filter === index ? '#c6a8ff' : '#ffffff25'}`, boxShadow: filter === index ? '0 0 18px #a77aff30' : 'none', transition: 'outline-color 150ms, box-shadow 150ms', boxSizing: 'border-box' }} /><span style={{ fontSize: 14, fontWeight: filter === index ? 700 : 500, color: filter === index ? '#e5d5ff' : '#bdc8de' }}>{item.name}</span></button>)}</div>
        {!filterSupported && <p style={{ color: '#c0cbe0', fontSize: 14 }}>Color filters are unavailable in this browser. Animated effects still work.</p>}
        <h3 style={{ fontSize: 16, fontWeight: 650, color: '#e3e8f4', letterSpacing: .3, margin: '20px 0 14px' }}>Effects</h3>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>{effects.map(item => <button key={item} aria-pressed={effect === item} style={{ ...button, fontSize: 15, borderColor: effect === item ? '#b99aef' : '#ffffff25', background: effect === item ? '#6344ae' : '#ffffff0c' }} onClick={() => { setEffect(item); settings.current.effect = item; }}>{item}</button>)}</div>
        <div style={{ textAlign: 'center', marginTop: 22, paddingTop: 20, borderTop: '1px solid #ffffff14' }}><button disabled={mode !== 'ready' && mode !== 'recording'} aria-label={mode === 'recording' ? 'Stop recording' : 'Start recording'} onClick={() => { if (mode === 'recording') { setMode('finishing'); recorder.current?.stop(); } else record(); }} style={{ width: 72, height: 72, borderRadius: '50%', border: '5px solid white', background: mode === 'recording' ? '#ff4e75' : 'linear-gradient(130deg,#386cff,#c34aaa)', cursor: 'pointer', opacity: mode === 'ready' || mode === 'recording' ? 1 : .4, color: 'white', fontSize: 26 }}>{mode === 'recording' ? '■' : '●'}</button><p style={{ color: '#b8c5db', fontSize: 14, lineHeight: 1.5 }}>{mode === 'finishing' ? 'Preparing your video…' : 'Filters and effects are saved in your video.'}</p></div>
      </>}
    </div>
  </div>;
}
