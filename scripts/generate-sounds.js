/**
 * Génère les sons du jeu (WAV mono 16 bits) sans dépendance externe.
 * Usage : node scripts/generate-sounds.js
 *
 * Remplace librement les fichiers de assets/sounds/ par de vrais enregistrements.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '..', 'assets', 'sounds');

function writeWav(name, samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => {
    const v = Math.max(-1, Math.min(1, s));
    data.writeInt16LE(Math.round(v * 32767), i * 2);
  });
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(OUT, name), Buffer.concat([header, data]));
}

const buffer = (seconds) => new Float32Array(Math.round(seconds * RATE));

/** Ajoute une note douce (sinus + harmonique légère) avec enveloppe attaque/déclin. */
function addNote(buf, start, freq, dur, vol, { attack = 0.01, glide = 0 } = {}) {
  const s0 = Math.round(start * RATE);
  const n = Math.round(dur * RATE);
  let phase = 0;
  for (let i = 0; i < n && s0 + i < buf.length; i++) {
    const t = i / RATE;
    const f = freq * (1 + glide * (t / dur));
    phase += (2 * Math.PI * f) / RATE;
    const env = Math.min(1, t / attack) * Math.exp((-4 * t) / dur);
    buf[s0 + i] += vol * env * (Math.sin(phase) + 0.25 * Math.sin(2 * phase));
  }
}

fs.mkdirSync(OUT, { recursive: true });

// « pop » quand on pose une cagette / sert un fruit
const pop = buffer(0.14);
addNote(pop, 0, 520, 0.14, 0.6, { attack: 0.003, glide: 0.8 });
writeWav('pop.wav', pop);

// tintement de pièces à l'encaissement
const coin = buffer(0.5);
addNote(coin, 0, 1318.5, 0.3, 0.35);
addNote(coin, 0.08, 1760, 0.42, 0.35);
writeWav('coin.wav', coin);

// petite clochette quand un client arrive
const bell = buffer(0.9);
addNote(bell, 0, 987.8, 0.9, 0.22, { attack: 0.005 });
addNote(bell, 0, 1975.5, 0.5, 0.06, { attack: 0.005 });
writeWav('bell.wav', bell);

// musique d'ambiance : arpèges pentatoniques lents sur 4 accords doux (boucle de 24 s)
const BPM = 80;
const beat = 60 / BPM;
const bars = 8; // 8 mesures de 4 temps = 24 s
const music = buffer(bars * 4 * beat);
const chords = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7
  [220.0, 261.63, 329.63, 392.0], // Am7
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [196.0, 246.94, 293.66, 392.0], // G
];
for (let bar = 0; bar < bars; bar++) {
  const chord = chords[bar % chords.length];
  const t0 = bar * 4 * beat;
  // nappe grave
  addNote(music, t0, chord[0] / 2, 4 * beat, 0.12, { attack: 0.6 });
  // arpège
  const pattern = [0, 1, 2, 3, 2, 1, 2, 3];
  pattern.forEach((idx, k) => {
    addNote(music, t0 + (k * beat) / 2, chord[idx], beat * 1.6, 0.1, { attack: 0.02 });
  });
}
// fondu aux extrémités pour une boucle sans clic
const fade = Math.round(0.05 * RATE);
for (let i = 0; i < fade; i++) {
  music[i] *= i / fade;
  music[music.length - 1 - i] *= i / fade;
}
writeWav('music.wav', music);

console.log('Sons générés dans', OUT);
