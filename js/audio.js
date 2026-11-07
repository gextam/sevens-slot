/* ============================================================================
   BLAZING 7s — synthesized stepper-machine sound (Web Audio, no audio files).
   Coin clinks, bet beeps, lever ratchet, stepper motor whir and ticks, reel
   stop clunks with rising "ding" tones, credit-count dings, jackpot bells and
   siren, hopper payout rattle and an attract jingle.
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS || (root.SEVENS = {});
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function lsGet(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

  function AudioEngine() {
    this.ctx = null; this.ready = false;
    this.volume = parseFloat(lsGet('b7.volume', '0.8'));
    this.muted = lsGet('b7.muted', '0') === '1' || /[?&]mute=1/.test(root.location ? root.location.search : '');
    this._motor = null; this._hopper = null; this._count = []; this._lastTick = [];
  }
  const P = AudioEngine.prototype;

  P.init = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return true; }
    const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return false;
    const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
    this.master = ctx.createGain(); this.master.gain.value = this.muted ? 0 : this.volume;
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12; this.comp.knee.value = 16; this.comp.ratio.value = 4; this.comp.attack.value = 0.002; this.comp.release.value = 0.18;
    this.master.connect(this.comp); this.comp.connect(ctx.destination);
    this.sfx = ctx.createGain(); this.sfx.connect(this.master);
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this._impulse(0.9, 4);   // small cabinet / casino room
    this.reverbGain = ctx.createGain(); this.reverbGain.gain.value = 0.22;
    this.reverb.connect(this.reverbGain); this.reverbGain.connect(this.master);
    this.noiseBuf = this._noiseBuffer(2);
    this.ready = true;
    return true;
  };
  P._impulse = function (sec, decay) {
    const ctx = this.ctx, sr = ctx.sampleRate, len = Math.floor(sr * sec), buf = ctx.createBuffer(2, len, sr);
    for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); let lp = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lp += (w - lp) * 0.35; d[i] = lp * Math.pow(1 - i / len, decay); } }
    return buf;
  };
  P._noiseBuffer = function (sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  };
  P.now = function () { return this.ctx ? this.ctx.currentTime : 0; };
  P.setVolume = function (v) { this.volume = clamp(v, 0, 1); lsSet('b7.volume', String(this.volume)); if (this.master && !this.muted) this.master.gain.setTargetAtTime(this.volume, this.now(), 0.02); };
  P.setMuted = function (m) { this.muted = !!m; lsSet('b7.muted', m ? '1' : '0'); if (this.master) this.master.gain.setTargetAtTime(m ? 0 : this.volume, this.now(), 0.02); };
  P.toggleMute = function () { this.setMuted(!this.muted); return this.muted; };

  /* ------------------------------------------------------- primitives */
  P._g = function (v, dest, send) {
    const g = this.ctx.createGain(); g.gain.value = v; g.connect(dest || this.sfx);
    if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.reverb); }
    return g;
  };
  P._adsr = function (param, t, peak, a, d, s, r, dur) {
    peak = Math.max(0.0002, peak);
    param.setValueAtTime(0.0001, t); param.linearRampToValueAtTime(peak, t + a);
    const sus = Math.max(0.0001, peak * s); param.exponentialRampToValueAtTime(sus, t + a + d);
    const rel = Math.max(t + a + d, t + dur); param.setValueAtTime(sus, rel); param.exponentialRampToValueAtTime(0.0001, rel + r);
    return rel + r;
  };
  P.tone = function (o) {
    const ctx = this.ctx, t = o.t != null ? o.t : ctx.currentTime, osc = ctx.createOscillator();
    osc.type = o.type || 'sine'; osc.frequency.setValueAtTime(Math.max(1, o.freq), t);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t + (o.sweep || o.dur || 0.1));
    if (o.detune) osc.detune.value = o.detune;
    const g = this._g(1, o.dest, o.send);
    const end = this._adsr(g.gain, t, o.gain || 0.2, o.a || 0.004, o.d || 0.05, o.s == null ? 0.6 : o.s, o.r || 0.08, o.dur || 0.1);
    let node = osc;
    if (o.filter) { const f = ctx.createBiquadFilter(); f.type = o.filter.type || 'lowpass'; f.frequency.setValueAtTime(o.filter.freq, t); if (o.filter.freqEnd) f.frequency.exponentialRampToValueAtTime(o.filter.freqEnd, t + (o.filter.sweep || o.dur || 0.1)); f.Q.value = o.filter.Q || 0.7; osc.connect(f); node = f; }
    node.connect(g); osc.start(t); osc.stop(end + 0.05);
    return osc;
  };
  P.noise = function (o) {
    const ctx = this.ctx, t = o.t != null ? o.t : ctx.currentTime, src = ctx.createBufferSource();
    src.buffer = this.noiseBuf; src.loop = true; if (o.rate) src.playbackRate.value = o.rate;
    const f = ctx.createBiquadFilter(); f.type = o.type || 'bandpass'; f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(10, o.freqEnd), t + (o.sweep || o.dur || 0.1));
    f.Q.value = o.Q || 0.8;
    const g = this._g(1, o.dest, o.send);
    const end = this._adsr(g.gain, t, o.gain || 0.2, o.a || 0.002, o.d || 0.03, o.s == null ? 0.5 : o.s, o.r || 0.05, o.dur || 0.05);
    src.connect(f); f.connect(g); src.start(t, Math.random() * 1.5); src.stop(end + 0.05);
    return src;
  };
  /* bright machine bell: fundamental + bright partials, short decay */
  P.bell = function (freq, t, o) {
    o = o || {}; const dur = o.dur || 0.5, gain = o.gain || 0.2;
    [[1, 1], [2.0, 0.45], [3.01, 0.22], [4.7, 0.1]].forEach(([r, a], i) => this.tone({ t: t, freq: freq * r, gain: gain * a, a: 0.001, d: dur * (1 - i * 0.18), s: 0.001, r: 0.05, dur: dur * (1 - i * 0.18), send: 0.35, dest: o.dest }));
  };
  P.thump = function (t, o) { o = o || {}; const f = o.freq || 100; this.tone({ t: t, freq: f, freqEnd: f * 0.5, sweep: o.dur || 0.1, gain: o.gain || 0.5, a: 0.002, d: 0.06, s: 0.3, r: 0.06, dur: o.dur || 0.1, send: 0.15 }); };
  P.clink = function (t, o) {
    o = o || {}; const p = (0.92 + Math.random() * 0.16), g = o.gain || 0.25;
    this.noise({ t: t, type: 'highpass', freq: 3500, gain: g * 0.9, a: 0.001, d: 0.012, s: 0.1, r: 0.02, dur: 0.012 });
    this.tone({ t: t, freq: 3150 * p, gain: g * 0.5, a: 0.001, d: 0.09, s: 0.001, r: 0.03, dur: 0.09, send: 0.3 });
    this.tone({ t: t + 0.003, freq: 4720 * p, gain: g * 0.28, a: 0.001, d: 0.06, s: 0.001, r: 0.03, dur: 0.06, send: 0.3 });
  };

  /* --------------------------------------------------------- machine */
  P.coinIn = function () {
    if (!this.ready) return; const t = this.now();
    this.clink(t, { gain: 0.3 }); this.thump(t + 0.04, { freq: 170, gain: 0.25, dur: 0.06 });
    this.clink(t + 0.07, { gain: 0.14 });
    this.tone({ t: t + 0.12, type: 'triangle', freq: 1320, gain: 0.08, a: 0.002, d: 0.05, s: 0.2, r: 0.04, dur: 0.06 });
  };
  P.betOne = function () {
    if (!this.ready) return; const t = this.now();
    this.tone({ t: t, type: 'triangle', freq: 1046, gain: 0.14, a: 0.002, d: 0.04, s: 0.5, r: 0.04, dur: 0.07 });
    this.noise({ t: t, type: 'highpass', freq: 2500, gain: 0.08, dur: 0.008, d: 0.01, s: 0.1, r: 0.01 });
  };
  P.betMax = function () {
    if (!this.ready) return; const t = this.now();
    [1046, 1318, 1568].forEach((f, i) => this.tone({ t: t + i * 0.06, type: 'triangle', freq: f, gain: 0.13, a: 0.002, d: 0.04, s: 0.5, r: 0.04, dur: 0.06 }));
  };
  P.deny = function () { if (!this.ready) return; this.tone({ t: this.now(), type: 'square', freq: 150, gain: 0.06, a: 0.004, d: 0.1, s: 0.5, r: 0.04, dur: 0.14, filter: { type: 'lowpass', freq: 800 } }); };
  P.click = function () { if (!this.ready) return; const t = this.now(); this.noise({ t: t, type: 'highpass', freq: 2800, gain: 0.14, dur: 0.01, d: 0.012, s: 0.2, r: 0.02 }); };
  P.lever = function () {
    if (!this.ready) return; const t = this.now();
    for (let i = 0; i < 6; i++) { const tt = t + i * i * 0.012 + i * 0.03; this.noise({ t: tt, type: 'bandpass', freq: 1800 + i * 150, Q: 3, gain: 0.18, a: 0.001, d: 0.012, s: 0.1, r: 0.012, dur: 0.012 }); }
    this.thump(t + 0.34, { freq: 110, gain: 0.45, dur: 0.08 });
    this.noise({ t: t + 0.34, type: 'lowpass', freq: 1400, gain: 0.3, a: 0.001, d: 0.04, s: 0.2, r: 0.04, dur: 0.04 });
  };
  P.spinStart = function () {
    if (!this.ready) return; const t = this.now();
    this.thump(t, { freq: 95, gain: 0.4, dur: 0.07 });
    this.noise({ t: t, type: 'bandpass', freq: 1200, Q: 2, gain: 0.25, dur: 0.025, d: 0.03, s: 0.3, r: 0.03 });
    this.motorStart();
  };
  P.motorStart = function () {
    if (!this.ready || this._motor) return; const ctx = this.ctx, t = this.now();
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 58;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; lp.Q.value = 1.5;
    const g = ctx.createGain(); g.gain.value = 0; saw.connect(lp); lp.connect(g); g.connect(this.sfx); saw.start(t);
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 950; bp.Q.value = 1.8;
    const ng = ctx.createGain(); ng.gain.value = 0;
    const trem = ctx.createGain(); trem.gain.value = 1; const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 26;
    const lg = ctx.createGain(); lg.gain.value = 0.45; lfo.connect(lg); lg.connect(trem.gain);
    src.connect(bp); bp.connect(trem); trem.connect(ng); ng.connect(this.sfx); src.start(t); lfo.start(t);
    this._motor = { saw: saw, g: g, src: src, ng: ng, lfo: lfo, bp: bp };
  };
  P.motorSet = function (s) {
    if (!this._motor) return; s = clamp(s, 0, 1); const t = this.now(), m = this._motor;
    m.g.gain.setTargetAtTime(0.07 * s, t, 0.04); m.ng.gain.setTargetAtTime(0.05 * s, t, 0.04);
    m.saw.frequency.setTargetAtTime(40 + 30 * s, t, 0.05); m.lfo.frequency.setTargetAtTime(12 + 20 * s, t, 0.05);
  };
  P.motorStop = function () {
    if (!this._motor) return; const m = this._motor, t = this.now();
    m.g.gain.setTargetAtTime(0, t, 0.06); m.ng.gain.setTargetAtTime(0, t, 0.06);
    m.saw.stop(t + 0.4); m.src.stop(t + 0.4); m.lfo.stop(t + 0.4); this._motor = null;
  };
  P.reelTick = function (i) {
    if (!this.ready) return; const t = this.now();
    if (t - (this._lastTick[i] || 0) < 0.035) return; this._lastTick[i] = t;
    this.noise({ t: t, type: 'bandpass', freq: 2200, Q: 2.5, gain: 0.07, dur: 0.007, d: 0.009, s: 0.1, r: 0.01 });
  };
  /* mechanical clunk + the classic rising stop tone per reel */
  P.reelStop = function (i) {
    if (!this.ready) return; const t = this.now();
    this.thump(t, { freq: 140, gain: 0.5, dur: 0.07 });
    this.noise({ t: t, type: 'lowpass', freq: 1500, gain: 0.4, a: 0.001, d: 0.035, s: 0.2, r: 0.04, dur: 0.035 });
    this.noise({ t: t, type: 'highpass', freq: 2000, gain: 0.2, dur: 0.006, d: 0.008, s: 0.1, r: 0.01 });
    const f = [784, 988, 1175][i] || 1175;
    this.tone({ t: t + 0.015, type: 'sine', freq: f, gain: 0.16, a: 0.002, d: 0.3, s: 0.001, r: 0.06, dur: 0.3, send: 0.3 });
    this.tone({ t: t + 0.015, type: 'sine', freq: f * 2, gain: 0.05, a: 0.002, d: 0.2, s: 0.001, r: 0.05, dur: 0.2 });
  };
  /* credit counting: one bright ding per credit (rate-limited by the game) */
  P.countDing = function (n) {
    if (!this.ready) return; const t = this.now();
    const f = n % 2 ? 1760 : 1568;
    this.tone({ t: t, freq: f, gain: 0.12, a: 0.001, d: 0.07, s: 0.001, r: 0.03, dur: 0.07, send: 0.25 });
    this.tone({ t: t, freq: f * 2.01, gain: 0.04, a: 0.001, d: 0.05, s: 0.001, r: 0.03, dur: 0.05 });
  };
  P.countEnd = function (big) {
    if (!this.ready) return; const t = this.now();
    this.bell(1046, t, { gain: 0.18, dur: 0.8 }); this.bell(1568, t + 0.05, { gain: 0.12, dur: 0.8 });
    if (big) this.bell(2093, t + 0.1, { gain: 0.1, dur: 1.0 });
  };
  P.winBells = function (level) {
    if (!this.ready) return; const t = this.now();
    const seq = level >= 2 ? [1046, 1318, 1568, 2093, 1568, 2093] : [1046, 1318, 1568];
    seq.forEach((f, i) => this.bell(f, t + i * 0.09, { gain: 0.16, dur: 0.5 }));
  };
  /* jackpot: siren + clanging bells for `sec` seconds */
  P.jackpot = function (sec) {
    if (!this.ready) return; const t = this.now(), ctx = this.ctx; sec = sec || 6;
    const osc = ctx.createOscillator(); osc.type = 'sawtooth';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 1;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.2);
    g.gain.setValueAtTime(0.09, t + sec - 0.4); g.gain.linearRampToValueAtTime(0.0001, t + sec);
    for (let k = 0; k * 1.1 < sec; k++) { const tk = t + k * 1.1; osc.frequency.setValueAtTime(520, tk); osc.frequency.exponentialRampToValueAtTime(940, tk + 0.55); osc.frequency.exponentialRampToValueAtTime(520, tk + 1.1); }
    osc.connect(f); f.connect(g); g.connect(this.sfx); osc.start(t); osc.stop(t + sec + 0.1);
    for (let k = 0; k * 0.22 < sec; k++) this.bell(k % 2 ? 2093 : 1568, t + k * 0.22, { gain: 0.1, dur: 0.35 });
    this.thump(t, { freq: 80, gain: 0.5, dur: 0.15 });
  };
  /* hopper payout: motor hum + coin clinks, about 14 coins per second */
  P.hopperStart = function () {
    if (!this.ready || this._hopper) return; const ctx = this.ctx, t = this.now();
    const saw = ctx.createOscillator(); saw.type = 'sawtooth'; saw.frequency.value = 84;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.15);
    saw.connect(lp); lp.connect(g); g.connect(this.sfx); saw.start(t);
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 700; bp.Q.value = 1;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0, t); ng.gain.linearRampToValueAtTime(0.03, t + 0.15);
    src.connect(bp); bp.connect(ng); ng.connect(this.sfx); src.start(t);
    this._hopper = { saw: saw, g: g, src: src, ng: ng, last: 0 };
  };
  P.hopperCoin = function () {
    if (!this.ready) return; const t = this.now();
    this.clink(t + Math.random() * 0.01, { gain: 0.22 });
    if (Math.random() < 0.5) this.clink(t + 0.025, { gain: 0.1 });
  };
  P.hopperStop = function () {
    if (!this._hopper) return; const h = this._hopper, t = this.now();
    h.g.gain.setTargetAtTime(0, t, 0.08); h.ng.gain.setTargetAtTime(0, t, 0.08); h.saw.stop(t + 0.5); h.src.stop(t + 0.5); this._hopper = null;
    this.thump(t + 0.05, { freq: 120, gain: 0.3, dur: 0.08 });
  };
  P.attract = function () {
    if (!this.ready) return; const t = this.now();
    [1046, 1318, 1568, 2093].forEach((f, i) => this.bell(f, t + i * 0.12, { gain: 0.07, dur: 0.5 }));
  };

  S.AudioEngine = AudioEngine;
  S.audio = new AudioEngine();
})(window);
