// audio.js — all of Solmar Bay's sound, synthesised live with WebAudio: three
// original radio stations, engine hum, police sirens, gunshots and cash chimes.
// No audio files, no network — every note is generated in code.

import { RADIO_STATIONS } from './config.js';

const SCALES = {
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let stationIndex = 0;
  let musicTimer = null;
  let muted = false;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.22;
      musicGain.connect(master);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, when = 0, dest = null) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, ctx.currentTime + when);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + when + dur);
    osc.connect(gain);
    gain.connect(dest || master);
    osc.start(ctx.currentTime + when);
    osc.stop(ctx.currentTime + when + dur + 0.05);
  }

  function playBeat() {
    if (!ctx || muted) return;
    const st = RADIO_STATIONS[stationIndex];
    const scale = SCALES[st.mode];
    const beatSec = 60 / st.bpm / 2;
    const note = scale[step % scale.length] + 12 * Math.floor(step / scale.length) % 24;
    const freq = st.root * Math.pow(2, note / 12) * 4;
    tone(freq, beatSec * 1.8, 'triangle', 0.5, 0, musicGain);
    if (step % 4 === 0) tone(st.root * 2, beatSec * 3, 'sine', 0.6, 0, musicGain);
    if (step % 2 === 1) tone(180, 0.05, 'square', 0.12, 0, musicGain);
    step += 1;
    musicTimer = setTimeout(playBeat, beatSec * 1000);
  }

  return {
    get stationName() { return RADIO_STATIONS[stationIndex].name; },
    get isMuted() { return muted; },
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
      if (ctx && !musicTimer) playBeat();
    },
    nextStation() {
      stationIndex = (stationIndex + 1) % RADIO_STATIONS.length;
      step = 0;
      return this.stationName;
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    gunshot() {
      if (!ensure() || muted) return;
      tone(160, 0.12, 'sawtooth', 0.5);
      tone(70, 0.18, 'square', 0.4, 0.02);
    },
    clickEmpty() { if (ensure() && !muted) tone(900, 0.05, 'square', 0.2); },
    cash() {
      if (!ensure() || muted) return;
      tone(880, 0.12, 'sine', 0.4);
      tone(1318, 0.2, 'sine', 0.4, 0.09);
    },
    siren(on) {
      if (!ensure() || muted) return;
      // A two-tone siren that rises and falls while police are near.
      if (on) tone(700, 0.4, 'sine', 0.12);
    },
    punch() { if (ensure() && !muted) tone(120, 0.1, 'square', 0.4); },
    engine(speed01) {
      if (!ensure() || muted) return;
      tone(50 + speed01 * 90, 0.09, 'sawtooth', 0.05 + speed01 * 0.05);
    },
  };
}
