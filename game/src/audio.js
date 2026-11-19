// Solmar Bay — all sound is synthesised with WebAudio: four radio stations,
// engine hum, coin chimes, punches, sirens and mission stings. No audio files.

import { RADIO } from './config.js';

function midiToFreq(m) {
  return 440 * Math.pow(2, (m - 69) / 12);
}

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.station = 0;
    this.radioGain = null;
    this.sfxGain = null;
    this.engineGain = null;
    this.engineOsc = null;
    this.bar = 0;
    this.nextBarTime = 0;
    this.sirenOn = false;
    this.sirenOsc = null;
    this.sirenGain = null;
  }

  // Created on the first user gesture so the browser allows sound.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.16;
    this.radioGain.connect(this.master);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.5;
    this.sfxGain.connect(this.master);
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineGain.connect(this.master);
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 320;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineOsc.start();
    this.nextBarTime = this.ctx.currentTime + 0.1;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  setStation(id) {
    this.station = ((id % RADIO.length) + RADIO.length) % RADIO.length;
    this.bar = 0;
    if (this.ctx) this.nextBarTime = this.ctx.currentTime + 0.05;
  }

  nextStation() {
    this.setStation(this.station + 1);
  }

  // Called every frame: schedules the radio one bar ahead and follows the car.
  update(dt, speed, wanted) {
    if (!this.ctx || this.muted) return;
    const station = RADIO[this.station];
    const barLen = (60 / station.bpm) * 4;
    while (this.nextBarTime < this.ctx.currentTime + 0.25) {
      this.scheduleBar(station, this.nextBarTime, barLen, this.bar);
      this.nextBarTime += barLen;
      this.bar += 1;
    }
    // Engine hum follows speed; sirens duck the radio while the police chase.
    const target = Math.min(0.14, Math.abs(speed) * 0.003);
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    if (this.engineOsc) this.engineOsc.frequency.value = 55 + Math.abs(speed) * 1.6;
    const duck = wanted > 0 ? 0.05 : 0.16;
    this.radioGain.gain.setTargetAtTime(duck, this.ctx.currentTime, 0.4);
    if (wanted > 0 && !this.sirenOn) this.startSiren();
    if (wanted === 0 && this.sirenOn) this.stopSiren();
  }

  scheduleBar(station, t0, barLen, bar) {
    const beat = barLen / 4;
    const lead = station.leadNotes;
    const bass = station.bassNotes;
    // Lead: one note per beat, cycling the station's phrase.
    for (let b = 0; b < 4; b++) {
      const note = lead[(bar * 4 + b) % lead.length];
      this.tone(midiToFreq(note), t0 + b * beat, beat * 0.9, station.lead, 0.5, this.radioGain);
    }
    // Bass: root on beats 1 and 3.
    for (const b of [0, 2]) {
      const note = bass[(bar * 2 + b / 2) % bass.length];
      this.tone(midiToFreq(note - 12), t0 + b * beat, beat * 1.8, station.bass, 0.8, this.radioGain);
    }
    // Drums: a kick on every beat, a hat on the off-beats.
    for (let b = 0; b < 4; b++) this.kick(t0 + b * beat);
    for (let b = 0; b < 4; b++) this.hat(t0 + (b + 0.5) * beat);
  }

  tone(freq, t, dur, type, vol, dest) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(this.radioGain);
    o.start(t);
    o.stop(t + 0.16);
  }

  hat(t) {
    const len = 0.04;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.25;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 6000;
    src.connect(f);
    f.connect(g);
    g.connect(this.radioGain);
    src.start(t);
  }

  startSiren() {
    this.sirenOn = true;
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.6;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 250;
    lfo.connect(lfoGain);
    lfoGain.connect(this.sirenOsc.frequency);
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0.05;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    lfo.start();
    this.sirenLfo = lfo;
  }

  stopSiren() {
    this.sirenOn = false;
    if (this.sirenOsc) {
      try { this.sirenOsc.stop(); } catch (e) { /* already stopped */ }
      try { this.sirenLfo.stop(); } catch (e) { /* already stopped */ }
      this.sirenOsc = null;
      this.sirenLfo = null;
    }
  }

  blip(freq, dur, type, vol) {
    if (!this.ctx || this.muted) return;
    this.tone(freq, this.ctx.currentTime, dur, type, vol, this.sfxGain);
  }

  coin() {
    this.blip(1318, 0.12, 'sine', 0.6);
    setTimeout(() => this.blip(1760, 0.18, 'sine', 0.6), 70);
  }

  punch() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = 0.09;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = this.ctx.createGain();
    g.gain.value = 0.8;
    src.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    src.start(t);
  }

  // Two-note mission sting: up for a step done, down for a fail.
  chime(good) {
    this.blip(good ? 880 : 440, 0.15, 'triangle', 0.6);
    setTimeout(() => this.blip(good ? 1318 : 330, 0.25, 'triangle', 0.6), 120);
  }

  enterCar() {
    this.blip(220, 0.1, 'square', 0.4);
    setTimeout(() => this.blip(330, 0.12, 'square', 0.4), 90);
  }
}
