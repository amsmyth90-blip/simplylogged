import fs from 'node:fs';
import path from 'node:path';

const sampleRate = 48000;
const duration = 64;
const channels = 2;

const clamp = (value) => Math.max(-1, Math.min(1, value));
const fade = (t) => Math.min(1, t / 0.9, (duration - t) / 2.2);
const tone = (frequency, t, harmonics = [1]) =>
  harmonics.reduce((sum, strength, index) => sum + strength * Math.sin(2 * Math.PI * frequency * (index + 1) * t), 0);

const tracks = [
  {
    file: 'lifedock-found-it-upbeat.wav',
    bpm: 98,
    chords: [[130.81, 164.81, 196], [146.83, 185, 220], [110, 146.83, 196], [98, 130.81, 174.61]],
    melody: [392, 493.88, 523.25, 493.88, 440, 392, 329.63, 392],
    render: ({t, beat, beatPhase, chord, note}) => {
      const bassEnv = Math.min(1, beatPhase / 0.018) * Math.exp(-3.8 * beatPhase);
      const bass = tone(chord[0] / 2, t, [1, 0.1]) * bassEnv * 0.06;
      const strumPhase = ((beat * 2) % 1 + beatPhase * 2) % 1;
      const strumEnv = Math.min(1, strumPhase / 0.012) * Math.exp(-4.8 * strumPhase);
      const strum = chord.reduce((sum, frequency) => sum + tone(frequency * 2, t, [1, 0.2]) * strumEnv * 0.026, 0);
      const leadEnv = Math.min(1, beatPhase / 0.012) * Math.exp(-4.5 * beatPhase);
      const lead = tone(note, t, [1, 0.18, 0.04]) * leadEnv * 0.04;
      return [bass + strum * 0.86 + lead, bass + strum + lead * 0.82];
    },
  },
  {
    file: 'lifedock-family-warm.wav',
    bpm: 86,
    chords: [[130.81, 164.81, 196], [110, 146.83, 174.61], [87.31, 130.81, 164.81], [98, 146.83, 196]],
    melody: [329.63, 392, 440, 392, 293.66, 329.63, 392, 493.88],
    render: ({t, beat, beatPhase, chord, note}) => {
      const chordEnv = Math.min(1, beatPhase / 0.12) * Math.exp(-0.42 * beatPhase);
      let left = 0;
      let right = 0;
      chord.forEach((frequency, index) => {
        const sound = tone(frequency, t, [1, 0.16]) * chordEnv * 0.042;
        left += sound * (0.82 + index * 0.06);
        right += sound * (1.06 - index * 0.05);
      });
      const notePhase = (beat % 2) + beatPhase;
      const noteEnv = Math.min(1, notePhase / 0.018) * Math.exp(-2.25 * notePhase);
      const lead = tone(note, t, [1, 0.28, 0.07]) * noteEnv * 0.055;
      return [left + lead * 0.88, right + lead * 1.08];
    },
  },
  {
    file: 'lifedock-dentist-light.wav',
    bpm: 104,
    chords: [[146.83, 185, 220], [123.47, 164.81, 196], [110, 146.83, 185], [130.81, 164.81, 220]],
    melody: [440, 554.37, 493.88, 659.25, 440, 493.88, 369.99, 493.88],
    render: ({t, beat, beatPhase, chord, note}) => {
      const pluckEnv = Math.min(1, beatPhase / 0.012) * Math.exp(-4.3 * beatPhase);
      const bassEnv = Math.min(1, beatPhase / 0.02) * Math.exp(-3.0 * beatPhase);
      const root = chord[0] / 2;
      const bass = tone(root, t, [1, 0.12]) * bassEnv * 0.07;
      let pluck = 0;
      chord.forEach((frequency) => { pluck += tone(frequency * 2, t, [1, 0.22]) * pluckEnv * 0.032; });
      const offbeat = ((beat + beatPhase + 0.5) % 1);
      const offEnv = Math.min(1, offbeat / 0.01) * Math.exp(-6.2 * offbeat);
      const sparkle = tone(note, t, [1, 0.18]) * offEnv * 0.037;
      return [bass + pluck + sparkle * 0.78, bass + pluck * 0.86 + sparkle];
    },
  },
  {
    file: 'lifedock-paper-bright.wav',
    bpm: 112,
    chords: [[164.81, 207.65, 246.94], [130.81, 174.61, 220], [146.83, 185, 220], [146.83, 196, 246.94]],
    melody: [659.25, 493.88, 587.33, 739.99, 659.25, 587.33, 493.88, 587.33],
    render: ({t, beat, beatPhase, chord, note}) => {
      const pulseEnv = Math.min(1, beatPhase / 0.008) * Math.exp(-5.4 * beatPhase);
      const halfPhase = ((beat * 2) % 1 + beatPhase * 2) % 1;
      const halfEnv = Math.min(1, halfPhase / 0.008) * Math.exp(-6.5 * halfPhase);
      const root = tone(chord[0] / 2, t, [1]) * pulseEnv * 0.055;
      const keys = chord.reduce((sum, frequency) => sum + tone(frequency * 2, t, [1, 0.14]) * halfEnv * 0.025, 0);
      const melodyEnv = Math.min(1, beatPhase / 0.009) * Math.exp(-5.9 * beatPhase);
      const bright = tone(note, t, [1, 0.22, 0.05]) * melodyEnv * 0.042;
      return [root + keys * 0.84 + bright, root + keys + bright * 0.78];
    },
  },
];

for (const track of tracks) {
  const frames = sampleRate * duration;
  const pcm = Buffer.alloc(frames * channels * 2);
  const secondsPerBeat = 60 / track.bpm;

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;
    const beatPosition = t / secondsPerBeat;
    const beat = Math.floor(beatPosition);
    const beatPhase = (beatPosition - beat) * secondsPerBeat;
    const chord = track.chords[Math.floor(beat / 4) % track.chords.length];
    const note = track.melody[beat % track.melody.length];
    const [rawLeft, rawRight] = track.render({t, beat, beatPhase, chord, note});
    const master = Math.max(0, fade(t));
    pcm.writeInt16LE(Math.round(clamp(rawLeft * master) * 32767), i * 4);
    pcm.writeInt16LE(Math.round(clamp(rawRight * master) * 32767), i * 4 + 2);
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

  const output = path.resolve('public/promo-video', track.file);
  fs.writeFileSync(output, Buffer.concat([header, pcm]));
  console.log(output);
}
