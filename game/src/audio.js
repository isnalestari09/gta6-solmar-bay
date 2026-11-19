// Solmar Bay — all sound is synthesized with WebAudio. No audio files, no network.
// Four radio stations, engine hum, sirens and one-shot effects.

import { clamp } from './config.js';

const STATIONS = [
  { name: 'BAYWAVE FM', desc: 'Synthwave', bpm: 96, wave: 'sawtooth', scale: [0, 3, 5, 7, 10], base: 110, bright: 0.5 },
  { name: 'SOLMAR SOUL', desc: 'Smooth soul', bpm: 72, wave: 'triangle', scale: [0, 2, 4, 7, 9], base: 130.8, bright: 0.35 },
  { name: 'CORAL ROCK', desc: 'Garage rock', bpm: 132, wave: 'square', scale: [0, 3, 5, 6, 10], base: 98, bright: 0.7 },
  { name: 'NIGHT DRIVE', desc: 'Late-night ambient', bpm: 60, wave: 'sine', scale: [0, 2, 5, 7, 9], base: 87.3, bright: 0.25 },
];

let ctx = null;
let master = null;
let musicGain = null;
let engineOsc = null;
let engineGain = null;
let sirenOscA = null;
let sirenOscB = null;
let sirenGain = null;
let stationIndex = 0;
let muted = false;
let stepTimer = 0;
let stepIndex = 0;
let started = false;

function ensureContext() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.16;
    musicGain.connect(master);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    sirenOscA = ctx.createOscillator();
    sirenOscA.type = 'sine';
    sirenOscA.frequency.value = 660;
    sirenOscB = ctx.createOscillator();
    sirenOscB.type = 'sine';
    sirenOscB.frequency.value = 880;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0;
    sirenOscA.connect(sirenGain);
    sirenOscB.connect(sirenGain);
    sirenGain.connect(master);
    sirenOscA.start();
    sirenOscB.start();
    return true;
  } catch (err) {
    return false;
  }
}

function noteFreq(base, semitone) {
  return base * Math.pow(2, semitone / 12);
}

function blip(freq, dur, type, vol, when = 0) {
  if (!ctx || muted) return;
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

export function initAudio() {
  if (started) return;
  started = true;
  if (!ensureContext()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

export function resumeAudio() {
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

export function currentStation() {
  return STATIONS[stationIndex];
}

export function setStation(i) {
  stationIndex = ((i % STATIONS.length) + STATIONS.length) % STATIONS.length;
  stepIndex = 0;
  stepTimer = 0;
  return currentStation();
}

export function cycleStation() {
  return setStation(stationIndex + 1);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.55;
  return muted;
}

export function isMuted() {
  return muted;
}

export function playCoin() {
  blip(988, 0.12, 'sine', 0.5);
  blip(1319, 0.2, 'sine', 0.5, 0.09);
}

export function playPunch() {
  blip(140, 0.12, 'square', 0.4);
  blip(70, 0.18, 'sine', 0.5);
}

export function playCrash() {
  blip(90, 0.25, 'sawtooth', 0.5);
  blip(55, 0.35, 'square', 0.35, 0.05);
}

export function playCash() {
  blip(784, 0.1, 'sine', 0.45);
  blip(988, 0.1, 'sine', 0.45, 0.08);
  blip(1175, 0.22, 'sine', 0.5, 0.16);
}

export function playMission() {
  blip(523, 0.14, 'triangle', 0.5);
  blip(659, 0.14, 'triangle', 0.5, 0.12);
  blip(784, 0.3, 'triangle', 0.55, 0.24);
}

export function playFail() {
  blip(392, 0.2, 'sawtooth', 0.35);
  blip(311, 0.35, 'sawtooth', 0.35, 0.16);
}

export function playBusted() {
  // Two-tone police whistle: a falling pair, then a flat warning note.
  blip(1046, 0.14, 'square', 0.35);
  blip(784, 0.14, 'square', 0.35, 0.14);
  blip(784, 0.3, 'square', 0.3, 0.28);
}

export function playEnterCar() {
  blip(220, 0.08, 'square', 0.3);
  blip(330, 0.12, 'square', 0.3, 0.07);
}

export function setEngine(speed01, driving) {
  if (!ctx) return;
  const target = driving ? 0.05 + speed01 * 0.075 : 0;
  engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
  engineOsc.frequency.setTargetAtTime(52 + speed01 * 130, ctx.currentTime, 0.08);
}

export function setSiren(on) {
  if (!ctx) return;
  sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, ctx.currentTime, 0.15);
}

export function updateAudio(dt) {
  if (!ctx || muted) return;
  const st = STATIONS[stationIndex];
  const stepDur = 60 / st.bpm / 2;
  stepTimer += dt;
  while (stepTimer >= stepDur) {
    stepTimer -= stepDur;
    const degree = st.scale[stepIndex % st.scale.length];
    const octave = stepIndex % 8 < 4 ? 0 : 12;
    const freq = noteFreq(st.base, degree + octave);
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = st.wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14 * st.bright + 0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + stepDur * 1.8);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t);
    osc.stop(t + stepDur * 2);
    if (stepIndex % 4 === 0) blip(st.base / 2, 0.3, 'sine', 0.25);
    stepIndex++;
  }
  // Wail the siren between its two tones.
  if (sirenGain && sirenGain.gain.value > 0.005) {
    const wail = Math.sin(performance.now() / 380) > 0;
    sirenOscA.frequency.setTargetAtTime(wail ? 660 : 520, ctx.currentTime, 0.05);
    sirenOscB.frequency.setTargetAtTime(wail ? 880 : 700, ctx.currentTime, 0.05);
  }
}
