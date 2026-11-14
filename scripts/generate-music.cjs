// Original synthesized instrumentals: no samples, recordings, or existing melodies.
const fs = require('node:fs');
const path = require('node:path');
const rate = 22050;
const tracks = [
  { id: 'daylight', bpm: 100, roots: [48, 53, 57, 55], notes: [0, 7, 12, 4, 9, 7, 4, 12] },
  { id: 'nightwalk', bpm: 80, roots: [45, 50, 48, 52], notes: [0, 3, 10, 7, 12, 10, 3, 7] },
  { id: 'spark', bpm: 120, roots: [50, 55, 59, 57], notes: [12, 7, 4, 9, 7, 12, 16, 4] },
];
const folder = path.resolve(__dirname, '../assets/music');
fs.mkdirSync(folder, { recursive: true });
for (const track of tracks) {
  const beat = 60 / track.bpm;
  const count = Math.round(beat * 32 * rate);
  const buffer = Buffer.alloc(44 + count * 2);
  buffer.write('RIFF', 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36); buffer.writeUInt32LE(count * 2, 40);
  let seed = 1837;
  for (let i = 0; i < count; i++) {
    const t = i / rate, b = t / beat, root = track.roots[Math.floor(b / 8) % 4];
    const local = (b % .5) * beat;
    const note = root + 12 + track.notes[Math.floor(b * 2) % 8];
    const freq = 440 * 2 ** ((note - 69) / 12);
    const melody = .17 * Math.sin(2 * Math.PI * freq * local) * Math.exp(-local * 9) * Math.min(1, local * 150);
    const bassTime = (b % 2) * beat;
    const bass = .14 * Math.sin(2 * Math.PI * 440 * 2 ** ((root - 12 - 69) / 12) * bassTime) * Math.exp(-bassTime * 3);
    const drumTime = (b % 1) * beat;
    const kick = .16 * Math.sin(2 * Math.PI * (48 * drumTime + 2 * (1 - Math.exp(-drumTime * 24)))) * Math.exp(-drumTime * 22);
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const hat = .025 * (seed / 2147483648 - 1) * Math.exp(-local * 85);
    const fade = Math.min(1, t * 100, (count / rate - t) * 100);
    buffer.writeInt16LE(Math.round(Math.max(-1, Math.min(1, (melody + bass + kick + hat) * fade)) * 32767), 44 + i * 2);
  }
  fs.writeFileSync(path.join(folder, `${track.id}.wav`), buffer);
}
