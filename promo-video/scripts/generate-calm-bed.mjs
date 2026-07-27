import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 44100;
const seconds = 18;
const samples = sampleRate * seconds;
const channels = 2;
const data = Buffer.alloc(samples * channels * 2);

for (let i = 0; i < samples; i++) {
  const t = i / sampleRate;
  const fadeIn = Math.min(1, t / 2.2);
  const fadeOut = Math.min(1, (seconds - t) / 2.5);
  const envelope = Math.max(0, Math.min(fadeIn, fadeOut));
  const slowPulse = 0.82 + 0.18 * Math.sin(2 * Math.PI * 0.08 * t);
  const pad =
    Math.sin(2 * Math.PI * 174.61 * t) * 0.34 +
    Math.sin(2 * Math.PI * 220 * t + 0.45) * 0.24 +
    Math.sin(2 * Math.PI * 261.63 * t + 1.1) * 0.17 +
    Math.sin(2 * Math.PI * 349.23 * t + 0.2) * 0.08;
  const value = Math.max(-1, Math.min(1, pad * envelope * slowPulse * 0.14));
  const pcm = Math.round(value * 32767);
  data.writeInt16LE(pcm, i * 4);
  data.writeInt16LE(pcm, i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + data.length, 4);
header.write('WAVE', 8);
header.write('fmt ', 12);
header.writeUInt32LE(16, 16);
header.writeUInt16LE(1, 20);
header.writeUInt16LE(channels, 22);
header.writeUInt32LE(sampleRate, 24);
header.writeUInt32LE(sampleRate * channels * 2, 28);
header.writeUInt16LE(channels * 2, 32);
header.writeUInt16LE(16, 34);
header.write('data', 36);
header.writeUInt32LE(data.length, 40);

const out = path.resolve('public/promo-video/calm-ambient-bed.wav');
fs.mkdirSync(path.dirname(out), {recursive: true});
fs.writeFileSync(out, Buffer.concat([header, data]));
console.log(out);
