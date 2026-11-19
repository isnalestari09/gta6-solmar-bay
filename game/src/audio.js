// Solmar Bay — all sound is synthesized with WebAudio: no audio files.
// Four radio stations (step sequencers with different roots/tempos/waves),
// one-shot effects, and a two-tone siren that ducks the music while wanted.
import { STATIONS } from './config.js';

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.station = 0;
    this.musicGain = null;
    this.sirenGain = null;
    this.step = 0;
    this.nextStepTime = 0;
    this.timer = null;
    this.sirenOsc = null;
    this.sirenLfo = null;
  }

  // Created lazily on the first user gesture; headless runs stay silent.
  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.ctx.destination);
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.0;
      this.sirenGain.connect(this.ctx.destination);
      this.startSiren();
      this.startSequencer();
      return true;
    } catch {
      return false;
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.ctx) {
      this.musicGain.gain.value = m ? 0 : 0.16;
      this.sirenGain.gain.value = m ? 0 : this.sirenOn ? 0.05 : 0;
    }
  }

  setStation(i) {
    this.station = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
    this.step = 0;
  }

  cycleStation() {
    this.setStation(this.station + 1);
  }

  stationName() {
    return STATIONS[this.station].name;
  }

  startSiren() {
    this.sirenOn = false;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'sine';
    this.sirenOsc.frequency.value = 700;
    this.sirenLfo = this.ctx.createOscillator();
    this.sirenLfo.type = 'square';
    this.sirenLfo.frequency.value = 0.6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 220;
    this.sirenLfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenOsc.connect(this.sirenGain);
    this.sirenOsc.start();
    this.sirenLfo.start();
  }

  setSiren(on) {
    this.sirenOn = on;
    if (!this.ctx || this.muted) return;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, this.ctx.currentTime, 0.2);
    this.musicGain.gain.setTargetAtTime(on ? 0.07 : 0.16, this.ctx.currentTime, 0.3);
  }

  startSequencer() {
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 40);
  }

  schedule() {
    if (!this.ctx || this.muted) return;
    const st = STATIONS[this.station];
    const stepDur = 60 / st.bpm / 2; // eighth notes
    while (this.nextStepTime < this.ctx.currentTime + 0.15) {
      this.playStep(st, this.step, this.nextStepTime, stepDur);
      this.step = (this.step + 1) % 32;
      this.nextStepTime += stepDur;
    }
  }

  playStep(st, step, t, dur) {
    const scale = [0, 2, 3, 5, 7, 8, 10, 12];
    const bassNotes = [0, 0, 3, 5, 0, 0, 5, 3];
    // Bass on every quarter note.
    if (step % 2 === 0) {
      const semis = bassNotes[(step / 2) % 8] + 12;
      this.tone(st.wave, 55 * Math.pow(2, semis / 12), t, dur * 1.8, 0.5);
    }
    // Sparse lead plucks on the bright stations, denser on the dark ones.
    const leadSteps = st.bright ? [0, 6, 11, 18, 22, 27] : [4, 12, 20, 28];
    if (leadSteps.includes(step)) {
      const semis = scale[(step * 3 + st.root) % 8] + 24;
      this.tone('triangle', 55 * Math.pow(2, semis / 12), t, dur * 1.4, 0.22);
    }
    // Hat tick every eighth note on fast stations.
    if (st.bpm >= 110 && step % 2 === 1) {
      this.noise(t, 0.03, 0.08);
    }
  }

  tone(wave, freq, t, dur, vol) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = wave;
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noise(t, dur, vol) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = vol;
    src.connect(g);
    g.connect(this.musicGain);
    src.start(t);
  }

  blip(freq, dur, vol, wave = 'sine') {
    if (!this.ctx || this.muted) return;
    this.tone(wave, freq, this.ctx.currentTime, dur, vol);
  }

  coin() {
    if (!this.ctx || this.muted) return;
    this.tone('sine', 880, this.ctx.currentTime, 0.09, 0.3);
    this.tone('sine', 1318, this.ctx.currentTime + 0.07, 0.14, 0.3);
  }

  punch() {
    if (!this.ctx || this.muted) return;
    this.noise(this.ctx.currentTime, 0.08, 0.35);
    this.tone('square', 90, this.ctx.currentTime, 0.08, 0.25);
  }

  chime() {
    if (!this.ctx || this.muted) return;
    [523, 659, 784].forEach((f, i) => {
      this.tone('triangle', f, this.ctx.currentTime + i * 0.09, 0.25, 0.28);
    });
  }

  thud() {
    if (!this.ctx || this.muted) return;
    this.tone('sine', 70, this.ctx.currentTime, 0.16, 0.4);
  }
}
