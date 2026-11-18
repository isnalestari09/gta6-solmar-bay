// All sound is synthesized live with WebAudio — no audio files, no network.
// Three radio stations (Q cycles them) plus one-shot effects. Audio only
// starts after the first user gesture, as browsers require.

const SCALES = {
  // [root, mode] semitone sets, in Hz base 110 (A2).
  solmar: [0, 3, 5, 7, 10, 12, 15],
  coral: [0, 2, 3, 7, 8, 10, 12],
  palm: [0, 2, 4, 7, 9, 12, 14],
};

export class Radio {
  constructor() {
    this.ctx = null;
    this.station = 0;
    this.muted = false;
    this._timer = null;
    this._step = 0;
    this._master = null;
    this._musicGain = null;
    this._sfxGain = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this._master = this.ctx.createGain();
    this._master.gain.value = 0.5;
    this._master.connect(this.ctx.destination);
    this._musicGain = this.ctx.createGain();
    this._musicGain.gain.value = 0.16;
    this._musicGain.connect(this._master);
    this._sfxGain = this.ctx.createGain();
    this._sfxGain.gain.value = 0.5;
    this._sfxGain.connect(this._master);
    this._startLoop();
  }

  _note(freq, when, dur, type, vol, dest) {
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(dest);
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  _startLoop() {
    const tick = () => {
      if (!this.ctx || this.muted) return;
      const names = ['solmar', 'coral', 'palm'];
      const scale = SCALES[names[this.station]];
      const now = this.ctx.currentTime + 0.05;
      const root = this.station === 1 ? 98 : 110;
      // Bass on beats 0 and 2, a lead note on most steps, hats on off-beats.
      const beat = this._step % 8;
      if (beat === 0 || beat === 4) {
        this._note(root / 2, now, 0.5, 'sine', 0.5, this._musicGain);
      }
      if (beat % 2 === 0) {
        const semis = scale[(this._step * 3 + this.station) % scale.length];
        const f = root * Math.pow(2, semis / 12) * (this.station === 2 ? 2 : 1);
        this._note(f, now, 0.42, this.station === 1 ? 'square' : 'triangle', 0.22, this._musicGain);
      }
      if (this.station === 0 && beat === 6) {
        const semis = scale[(this._step + 2) % scale.length];
        this._note(root * 2 * Math.pow(2, semis / 12), now, 0.8, 'sine', 0.12, this._musicGain);
      }
      this._step++;
    };
    const interval = this.station === 1 ? 170 : 260;
    this._timer = setInterval(tick, interval);
  }

  nextStation() {
    this.station = (this.station + 1) % 3;
    if (this._timer) { clearInterval(this._timer); this._startLoop(); }
    return this.station;
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this._master) this._master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  // --- one-shot effects -------------------------------------------------
  _blip(freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g); g.connect(this._sfxGain);
    osc.start(now); osc.stop(now + dur + 0.02);
  }

  shoot() { this._blip(880, 0.12, 'square', 0.25, 120); }
  punch() { this._blip(140, 0.1, 'sine', 0.4, 60); }
  coin() { this._blip(1320, 0.09, 'sine', 0.3); setTimeout(() => this._blip(1760, 0.14, 'sine', 0.3), 70); }
  cash() { this._blip(660, 0.08, 'triangle', 0.3); setTimeout(() => this._blip(990, 0.16, 'triangle', 0.3), 80); }
  crash() { this._blip(90, 0.25, 'sawtooth', 0.35, 40); }
  siren() { this._blip(700, 0.4, 'sine', 0.12, 950); }
  mission() {
    this._blip(523, 0.12, 'triangle', 0.3);
    setTimeout(() => this._blip(659, 0.12, 'triangle', 0.3), 110);
    setTimeout(() => this._blip(784, 0.22, 'triangle', 0.3), 220);
  }
}
