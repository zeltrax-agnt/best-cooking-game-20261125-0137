// audio.js — all sound is synthesized with WebAudio: no audio files, no
// network, just little oscillators and noise. Created lazily on the first
// player gesture so browsers never complain.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol = 0.08, when = 0, lowpass = 1200) {
  if (muted) return;
  const c = ensureCtx();
  if (!c) return;
  const t0 = c.currentTime + when;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  click() { tone(660, 0.06, 'triangle', 0.07); },
  pickup() { tone(520, 0.08, 'triangle', 0.09); tone(780, 0.07, 'triangle', 0.07, 0.05); },
  place() { tone(440, 0.07, 'triangle', 0.09); tone(330, 0.09, 'triangle', 0.07, 0.04); },
  chop() { noiseBurst(0.09, 0.14, 0, 2400); },
  sizzle() { noiseBurst(0.35, 0.06, 0, 5200); },
  ding() { tone(880, 0.16, 'sine', 0.12); tone(1318, 0.22, 'sine', 0.09, 0.09); },
  serve() {
    tone(523, 0.1, 'triangle', 0.1);
    tone(659, 0.1, 'triangle', 0.1, 0.09);
    tone(784, 0.16, 'triangle', 0.11, 0.18);
    tone(1046, 0.22, 'sine', 0.09, 0.27);
  },
  coin() { tone(988, 0.09, 'square', 0.05); tone(1319, 0.14, 'square', 0.05, 0.07); },
  lost() { tone(392, 0.22, 'sawtooth', 0.06); tone(311, 0.3, 'sawtooth', 0.06, 0.16); },
  burn() { noiseBurst(0.4, 0.12, 0, 900); tone(220, 0.3, 'sawtooth', 0.05, 0.05, 110); },
  rush() {
    tone(392, 0.12, 'square', 0.06);
    tone(523, 0.12, 'square', 0.06, 0.12);
    tone(659, 0.2, 'square', 0.07, 0.24);
  },
  error() { tone(180, 0.14, 'square', 0.06); },
};
