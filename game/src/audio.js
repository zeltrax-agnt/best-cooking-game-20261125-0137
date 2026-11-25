// audio.js — every sound is a WebAudio oscillator, made on the spot.
// No audio files, no network: chop thock, grill sizzle, serve ding, jingles.
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicTimer = null;
    this.musicStep = 0;
  }

  ensure() {
    if (!this.ctx) {
      try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { this.ctx = null; }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  toggleMute() { this.muted = !this.muted; return this.muted; }

  tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
    if (this.muted) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  chop() { this.tone(180, 0.07, 'square', 0.10); this.tone(90, 0.09, 'triangle', 0.14, 0.02); }
  grab() { this.tone(520, 0.06, 'sine', 0.10, 0, 760); }
  place() { this.tone(300, 0.08, 'triangle', 0.12, 0, 210); }
  sizzleStart() { this.tone(1200, 0.25, 'sawtooth', 0.03, 0, 900); }
  ready() { this.tone(880, 0.12, 'sine', 0.12); this.tone(1320, 0.16, 'sine', 0.10, 0.10); }
  serve() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.16, 'triangle', 0.12, i * 0.09));
  }
  error() { this.tone(160, 0.18, 'sawtooth', 0.10, 0, 110); }
  expire() { this.tone(220, 0.3, 'sawtooth', 0.10, 0, 90); this.tone(147, 0.4, 'sawtooth', 0.08, 0.18, 70); }
  rush() { [392, 523, 659].forEach((f, i) => this.tone(f, 0.14, 'square', 0.07, i * 0.11)); }
  gameOver() { [392, 330, 262, 196].forEach((f, i) => this.tone(f, 0.28, 'triangle', 0.11, i * 0.2)); }

  // A light kitchen hum: a soft bass line that ticks along while playing.
  startMusic(rush) {
    if (this.musicTimer) return;
    const bass = [131, 165, 196, 165, 131, 165, 220, 196];
    this.musicTimer = window.setInterval(() => {
      if (this.muted) return;
      const f = bass[this.musicStep % bass.length];
      this.tone(f, 0.22, 'sine', 0.045);
      if (rush && this.musicStep % 2 === 0) this.tone(f * 2, 0.1, 'triangle', 0.03);
      this.musicStep += 1;
    }, rush ? 300 : 460);
  }

  stopMusic() {
    if (this.musicTimer) { window.clearInterval(this.musicTimer); this.musicTimer = null; }
  }
}
