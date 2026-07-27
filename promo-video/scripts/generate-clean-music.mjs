import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 48000;
const duration = 64;
const channels = 2;
const frames = sampleRate * duration;
const pcm = Buffer.alloc(frames * channels * 2);

const chords = [
  [130.81, 164.81, 196.0, 246.94],
  [110.0, 130.81, 164.81, 196.0],
  [87.31, 130.81, 164.81, 196.0],
  [98.0, 146.83, 196.0, 220.0],
];

const melody = [329.63, 392.0, 493.88, 392.0, 293.66, 329.63, 392.0, 293.66];

const smoothPulse = (phase) => {
  const attack = Math.min(1, phase / 0.32);
  const release = Math.min(1, (4 - phase) / 1.15);
  return Math.max(0, Math.min(attack, release));
};

for (let i = 0; i < frames; i++) {
  const t = i / sampleRate;
  const chordPhase = t % 4;
  const chord = chords[Math.floor(t / 4) % chords.length];
  const chordEnv = smoothPulse(chordPhase);

  let left = 0;
  let right = 0;
  chord.forEach((frequency, index) => {
    const pan = (index - 1.5) / 5;
    const fundamental = Math.sin(2 * Math.PI * frequency * t);
    const harmonic = 0.18 * Math.sin(2 * Math.PI * frequency * 2 * t);
    const tone = (fundamental + harmonic) * chordEnv * 0.055;
    left += tone * (1 - pan);
    right += tone * (1 + pan);
  });

  const noteIndex = Math.floor(t / 2) % melody.length;
  const notePhase = t % 2;
  const noteAttack = Math.min(1, notePhase / 0.025);
  const noteDecay = Math.exp(-2.25 * notePhase);
  const noteEnv = noteAttack * noteDecay;
  const note = melody[noteIndex];
  const bell = (
    Math.sin(2 * Math.PI * note * t) +
    0.32 * Math.sin(2 * Math.PI * note * 2 * t) +
    0.10 * Math.sin(2 * Math.PI * note * 3 * t)
  ) * noteEnv * 0.045;

  const delayedTime = t - 0.23;
  const delayedPhase = ((delayedTime % 2) + 2) % 2;
  const delayedIndex = Math.floor(Math.max(0, delayedTime) / 2) % melody.length;
  const delayedEnv = delayedTime > 0 ? Math.min(1, delayedPhase / 0.025) * Math.exp(-2.25 * delayedPhase) : 0;
  const delayedNote = melody[delayedIndex];
  const echo = Math.sin(2 * Math.PI * delayedNote * delayedTime) * delayedEnv * 0.012;

  left += bell * 0.92 + echo * 0.65;
  right += bell * 1.08 + echo;

  const fadeIn = Math.min(1, t / 1.4);
  const fadeOut = Math.min(1, (duration - t) / 2.5);
  const master = Math.max(0, Math.min(fadeIn, fadeOut));
  left = Math.max(-1, Math.min(1, left * master));
  right = Math.max(-1, Math.min(1, right * master));

  pcm.writeInt16LE(Math.round(left * 32767), i * 4);
  pcm.writeInt16LE(Math.round(right * 32767), i * 4 + 2);
}

const header = Buffer.alloc(44);
header.write('RIFF', 0);
header.writeUInt32LE(36 + pcm.length, 4);
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
header.writeUInt32LE(pcm.length, 40);

const output = path.resolve('public/promo-video/lifedock-clean-music.wav');
fs.writeFileSync(output, Buffer.concat([header, pcm]));
console.log(output);
