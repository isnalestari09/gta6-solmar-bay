// All sound is synthesised with WebAudio: no audio files, no network.
// Four radio stations are simple chord loops at different tempos and
// timbres; effects are short oscillator bursts.

import { RADIOS } from './config.js';

const CHORDS = {
  pop: [[261.6, 329.6, 392.0], [196.0, 246.9, 293.7], [220.0, 277.2, 329.6], [246.9, 293.7, 392.0]],
  dangdut: [[220.0, 277.2, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [220.0, 277.2, 329.6]],
  chill: [[130.8, 164.8, 196.0], [110.0, 138.6, 164.8], [98.0, 123.5, 146.8], [146.8, 174.6, 220.0]],
  synth: [[110.0, 130.8, 164.8], [98.0, 123.5, 146.8], [87.3, 110.0, 130.8], [123.5, 146.8, 174.6]],
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.station = 0;
    this.muted = false;
    this._step = 0;
    this._timer = null;
    this._master = null;
  }

  ensure() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this._master = this.ctx.createGain();
    this._master.gain.value = 0.35;
    this._master.connect(this.ctx.destination);
  }

  _tone(freq, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(gain); gain.connect(this._master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  coinPickup() { [880, 1108.7, 1318.5, 1760].forEach((f, i) => this._tone(f, 0.12, 'sine', 0.25, i * 0.07)); }
  shoot() { this._tone(220, 0.12, 'square', 0.2); this._tone(110, 0.1, 'sawtooth', 0.15, 0.02); }
  crash() { this._tone(70, 0.25, 'sawtooth', 0.3); this._tone(50, 0.3, 'square', 0.2, 0.05); }
  missionDone() { [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this._tone(f, 0.25, 'triangle', 0.25, i * 0.12)); }
  siren() { this._tone(660, 0.4, 'sine', 0.12); this._tone(880, 0.4, 'sine', 0.12, 0.4); }

  startRadio() {
    this.ensure();
    if (!this.ctx || this._timer) return;
    const beat = () => {
      if (this.muted) return;
      const station = RADIOS[this.station];
      const chord = CHORDS[station.hue][this._step % CHORDS[station.hue].length];
      chord.forEach((f) => this._tone(f, 0.5, 'triangle', 0.06));
      this._tone(55, 0.25, 'sine', 0.12);
      this._step += 1;
    };
    const interval = Math.round(60000 / RADIOS[this.station].bpm);
    this._timer = setInterval(beat, interval);
  }

  nextStation() {
    this.station = (this.station + 1) % RADIOS.length;
    if (this._timer) { clearInterval(this._timer); this._timer = null; this._step = 0; this.startRadio(); }
    return RADIOS[this.station].name;
  }

  stopRadio() { if (this._timer) { clearInterval(this._timer); this._timer = null; } }
  toggleMute() { this.muted = !this.muted; return this.muted; }
}
