// Solmar Bay — all sound is synthesised with WebAudio: four radio stations
// with their own step-sequenced patterns, plus coin, punch, chime, siren and
// engine sounds. No audio files, no network.

import { RADIO_STATIONS } from './config.js';

const NOTE = {
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880.0,
};

// Each station: a bass line and a lead line, 16 steps a bar, plus a hat
// pattern (1 = tick). The steps index into these arrays by scale degree.
const PATTERNS = {
  baywave: {
    wave: 'sawtooth', leadWave: 'square',
    bass: ['C2', 'C2', 'G2', 'C2', 'A2', 'A2', 'G2', 'A2', 'F2', 'F2', 'G2', 'F2', 'G2', 'G2', 'C2', 'G2'],
    lead: ['C4', 'E4', 'G4', 'C5', 'G4', 'E4', 'A4', 'C5', 'G4', 'A4', 'F4', 'G4', 'E4', 'G4', 'D4', 'G4'],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0],
  },
  palma: {
    wave: 'triangle', leadWave: 'sine',
    bass: ['C3', null, 'G2', null, 'A2', null, 'G2', null, 'F2', null, 'G2', null, 'C3', null, 'G2', null],
    lead: ['E4', null, 'G4', null, 'A4', null, 'G4', null, 'F4', null, 'E4', null, 'D4', null, 'E4', null],
    hat: [0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0],
  },
  coral: {
    wave: 'square', leadWave: 'triangle',
    bass: ['A2', 'A2', 'E2', 'A2', 'D2', 'D2', 'E2', 'D2', 'A2', 'A2', 'E2', 'A2', 'G2', 'E2', 'A2', 'E2'],
    lead: ['A4', 'C5', 'E5', 'C5', 'A4', 'G4', 'A4', 'E4', 'D4', 'E4', 'G4', 'A4', 'C5', 'A4', 'G4', 'E4'],
    hat: [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 0],
  },
  noche: {
    wave: 'sine', leadWave: 'sine',
    bass: ['F2', null, null, 'F2', null, 'C3', null, null, 'A2', null, null, 'A2', null, 'G2', null, null],
    lead: ['F4', 'A4', 'C5', 'A4', 'G4', 'A4', 'E4', 'G4', 'F4', 'E4', 'D4', 'E4', 'C4', 'D4', 'E4', 'F4'],
    hat: [1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
  },
};

export class AudioEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.stationIndex = 0;
    this.muted = false;
    this.playing = false;
    this._step = 0;
    this._nextTime = 0;
    this._timer = null;
    this._sirenOsc = null;
    this._sirenGain = null;
    this._engineOsc = null;
    this._engineGain = null;
  }

  // Must be called from a user gesture at least once.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.context = new Ctx();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.32;
    this.musicGain.connect(this.master);
    this.sfxGain = this.context.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    this.startMusic();
    this._startEngineHum();
  }

  get station() {
    return RADIO_STATIONS[this.stationIndex];
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  nextStation() {
    this.stationIndex = (this.stationIndex + 1) % RADIO_STATIONS.length;
    this._step = 0;
  }

  setStation(index) {
    this.stationIndex = ((index % RADIO_STATIONS.length) + RADIO_STATIONS.length) % RADIO_STATIONS.length;
    this._step = 0;
  }

  startMusic() {
    if (!this.context || this.playing) return;
    this.playing = true;
    this._nextTime = this.context.currentTime + 0.1;
    this._timer = setInterval(() => this._schedule(), 40);
  }

  _schedule() {
    if (!this.context) return;
    const pattern = PATTERNS[this.station.id];
    const stepDur = 60 / this.station.bpm / 4;
    while (this._nextTime < this.context.currentTime + 0.15) {
      const step = this._step % 16;
      const bassNote = pattern.bass[step];
      if (bassNote) this._blip(NOTE[bassNote], stepDur * 1.8, pattern.wave, 0.5, this._nextTime, this.musicGain);
      const leadNote = pattern.lead[step];
      if (leadNote && step % 2 === 0) {
        this._blip(NOTE[leadNote], stepDur * 0.9, pattern.leadWave, 0.16, this._nextTime, this.musicGain);
      }
      if (pattern.hat[step]) this._hat(this._nextTime);
      this._nextTime += stepDur;
      this._step += 1;
    }
  }

  _blip(freq, dur, wave, vol, when, dest) {
    const osc = this.context.createOscillator();
    const gain = this.context.createGain();
    osc.type = wave;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(when);
    osc.stop(when + dur + 0.05);
  }

  _hat(when) {
    const buffer = this.context.createBuffer(1, 2205, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.context.createBufferSource();
    src.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = 0.12;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    src.start(when);
  }

  _startEngineHum() {
    this._engineOsc = this.context.createOscillator();
    this._engineOsc.type = 'sawtooth';
    this._engineOsc.frequency.value = 55;
    this._engineGain = this.context.createGain();
    this._engineGain.gain.value = 0;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    this._engineOsc.connect(filter);
    filter.connect(this._engineGain);
    this._engineGain.connect(this.master);
    this._engineOsc.start();
  }

  setEngine(speed01) {
    if (!this._engineOsc) return;
    this._engineOsc.frequency.value = 55 + speed01 * 90;
    this._engineGain.gain.value = speed01 > 0.02 ? 0.05 + speed01 * 0.05 : 0;
  }

  setSiren(level01) {
    if (!this.context) return;
    if (level01 <= 0) {
      if (this._sirenGain) this._sirenGain.gain.value = 0;
      return;
    }
    if (!this._sirenOsc) {
      this._sirenOsc = this.context.createOscillator();
      this._sirenOsc.type = 'sine';
      this._sirenOsc.frequency.value = 750;
      const lfo = this.context.createOscillator();
      lfo.frequency.value = 1.4;
      const lfoGain = this.context.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(this._sirenOsc.frequency);
      this._sirenGain = this.context.createGain();
      this._sirenGain.gain.value = 0;
      this._sirenOsc.connect(this._sirenGain);
      this._sirenGain.connect(this.master);
      this._sirenOsc.start();
      lfo.start();
    }
    this._sirenGain.gain.value = 0.03 + level01 * 0.06;
  }

  playCoin() {
    if (!this.context) return;
    const t = this.context.currentTime;
    this._blip(988, 0.09, 'sine', 0.5, t, this.sfxGain);
    this._blip(1319, 0.16, 'sine', 0.5, t + 0.08, this.sfxGain);
  }

  playPunch() {
    if (!this.context) return;
    const t = this.context.currentTime;
    this._blip(140, 0.12, 'sine', 0.7, t, this.sfxGain);
    const buffer = this.context.createBuffer(1, 4410, 44100);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.context.createBufferSource();
    src.buffer = buffer;
    const gain = this.context.createGain();
    gain.gain.value = 0.4;
    src.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t);
  }

  playChime() {
    if (!this.context) return;
    // Duck the music for a beat so the chime cuts through.
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(0.12, this.context.currentTime);
      this.musicGain.gain.linearRampToValueAtTime(0.32, this.context.currentTime + 0.8);
    }
    const t = this.context.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      this._blip(freq, 0.3, 'triangle', 0.35, t + i * 0.09, this.sfxGain);
    });
  }

  playBusted() {
    if (!this.context) return;
    const t = this.context.currentTime;
    this._blip(392, 0.25, 'square', 0.25, t, this.sfxGain);
    this._blip(311, 0.4, 'square', 0.25, t + 0.22, this.sfxGain);
  }
}
