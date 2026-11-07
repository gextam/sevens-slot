/* ============================================================================
   BLAZING 7s — machine logic: credits, coins played (2-coin buy-a-pay with a
   3rd-coin multiplier), lever and button spins, weighted virtual-reel stops,
   win payout counting with jackpot celebration, hopper cash-out, attract mode.
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS, C = S.CONFIG, A = S.audio, FX = S.fx;
  const rng = S.rng = {
    int: function (n) {
      const c = root.crypto;
      if (c && c.getRandomValues) { const max = Math.floor(0x100000000 / n) * n, a = new Uint32Array(1); do { c.getRandomValues(a); } while (a[0] >= max); return a[0] % n; }
      return Math.floor(Math.random() * n);
    }
  };

  function Game() {
    this.credits = C.startCredits;
    this.coinsPlayed = 0; this.lastBet = 1; this.betLocked = false;
    this.winnerPaid = 0; this.win = 0;
    this.state = 'boot'; this.message = 'INSERT COIN'; this.messageBlink = true;
    this.reels = [];
    for (let i = 0; i < C.reels; i++) {
      const r = new S.Reel(i, C.strips[i], { vmax: 23, accelTime: 0.28, overshoot: 0.12, omega: 34, zeta: 0.6, startIndex: [4, 10, 16][i] });
      r.windupDist = 0.1; r.windupTime = 0.1;
      r.onLand = rr => this.onReelLand(rr);
      r.onStop = rr => this.onReelStop(rr);
      r.onPass = (rr, v) => { if (v > 3) A.reelTick(rr.index); };
      this.reels.push(r);
    }
    this.sched = null; this.present = null; this.payout = null; this.cashout = null;
    this.jackpotUntil = 0; this.chaseUntil = 0; this.attractLamp = 0; this.nextAttract = 14; this.leverSpinAt = 0; this.evalAt = 0;
    this.now = 0; this.renderer = null;
    this.stats = { spins: 0, wagered: 0, won: 0, jackpots: 0 };
  }
  const P = Game.prototype;

  P.begin = function () { this.state = 'idle'; this.setIdleMessage(); this.nextAttract = this.now + 14; };
  P.setMessage = function (m, blink) { this.message = m; this.messageBlink = !!blink; };
  P.setIdleMessage = function () {
    if (this.credits <= 0 && this.coinsPlayed === 0) this.setMessage('INSERT COIN', true);
    else if (this.coinsPlayed > 0 && !this.betLocked) this.setMessage(this.coinsPlayed < 3 ? 'PLAY ' + (3 - this.coinsPlayed) + ' MORE COIN' + (3 - this.coinsPlayed > 1 ? 'S' : '') + ' OR SPIN' : 'MAX COINS · SPIN REELS OR PULL HANDLE', false);
    else this.setMessage('PLAY 1 TO 3 COINS', false);
  };
  P.canSpin = function () { return this.state === 'idle' && ((this.coinsPlayed > 0 && !this.betLocked) || this.credits >= (this.betLocked && this.coinsPlayed > 0 ? this.coinsPlayed : this.lastBet)); };

  P.insertCoins = function (n) {
    if (this.state !== 'idle') { A.deny(); return; }
    this.credits += n; A.coinIn(); this.setIdleMessage();
  };
  P._unlockBet = function () { if (this.betLocked) { this.coinsPlayed = 0; this.betLocked = false; this.present = null; this.winnerPaid = 0; } };
  P.betOne = function () {
    if (this.state !== 'idle') { A.deny(); return; }
    this._unlockBet();
    if (this.coinsPlayed >= C.maxCoins) { A.deny(); return; }
    if (this.credits < 1) { A.deny(); this.setMessage('INSERT COIN', true); return; }
    this.credits -= 1; this.coinsPlayed += 1; A.betOne(); this.setIdleMessage();
  };
  P.betMax = function () {
    if (this.state !== 'idle') { A.deny(); return; }
    this._unlockBet();
    const need = C.maxCoins - this.coinsPlayed;
    if (this.credits < need) { A.deny(); this.setMessage('INSERT COIN', true); return; }
    this.credits -= need; this.coinsPlayed = C.maxCoins; A.betMax();
    this.spin();
  };
  P.pullLever = function () {
    if (this.state !== 'idle' || !this.canSpin()) { A.deny(); return; }
    if (this.renderer) this.renderer.pullLever();
    A.lever(); this.leverSpinAt = this.now + 0.24;
  };
  P.spin = function () {
    if (this.state !== 'idle') return false;
    if (this.betLocked || this.coinsPlayed === 0) {
      const n = this.coinsPlayed > 0 ? this.coinsPlayed : this.lastBet;
      if (this.credits < n) { A.deny(); this.setMessage('INSERT COIN', true); return false; }
      this.credits -= n; this.coinsPlayed = n; this.betLocked = false; this.present = null; this.winnerPaid = 0;
    }
    this.lastBet = this.coinsPlayed;
    this.stats.spins++; this.stats.wagered += this.coinsPlayed;
    this.present = null; this.winnerPaid = 0; this.win = 0;
    this.stops = [0, 1, 2].map(r => S.physicalStop(r, rng.int(C.totals[r])));
    if (S.DEBUG_FORCE) { const f = S.DEBUG_FORCE(); if (f) this.stops = f; }
    this.line = this.stops.map((s, r) => C.strips[r][s]);
    this.result = S.evaluate(this.line, this.coinsPlayed);
    const base = this.now;
    this.sched = { startAt: [], stopAt: [], started: [], requested: [] };
    for (let i = 0; i < 3; i++) { this.sched.startAt[i] = base + i * 0.05; this.sched.stopAt[i] = base + 0.95 + i * 0.45; this.sched.started[i] = false; this.sched.requested[i] = false; }
    this.stoppedCount = 0; this.state = 'spinning';
    this.setMessage('GOOD LUCK', false);
    A.spinStart();
    return true;
  };
  P.cashOut = function () {
    if (this.state !== 'idle' || this.credits <= 0) { A.deny(); return; }
    this.state = 'cashout'; this.setMessage('PAYING OUT · CALL ATTENDANT IF HOPPER EMPTY', false);
    A.hopperStart();
    const n = Math.round(this.credits);
    this.cashout = { total: n, next: this.now + 0.45, interval: n > 400 ? 0.035 : 0.07, step: n > 400 ? 5 : 1 };
  };

  P.update = function (now, dt) {
    this.now = now;
    if (this.leverSpinAt && now >= this.leverSpinAt) { this.leverSpinAt = 0; this.spin(); }
    if (this.state === 'spinning' && this.sched) {
      const s = this.sched;
      for (let i = 0; i < 3; i++) {
        const r = this.reels[i];
        if (!s.started[i] && now >= s.startAt[i]) { r.spin(now); s.started[i] = true; }
        if (s.started[i] && !s.requested[i] && now >= s.stopAt[i]) { r.requestStop(this.stops[i], false); s.requested[i] = true; }
      }
      let sp = 0; this.reels.forEach(r => { sp += r.speed; }); A.motorSet(sp / (3 * this.reels[0].vmax));
    }
    for (let i = 0; i < 3; i++) this.reels[i].update(now, dt);
    if (this.evalAt && now >= this.evalAt) { this.evalAt = 0; this.evaluate(); }
    if (this.payout) {
      const p = this.payout;
      while (p.remaining > 0 && now >= p.next) {
        const d = Math.min(p.step, p.remaining); p.remaining -= d; this.credits += d; this.winnerPaid += d; p.n++;
        A.countDing(p.n); p.next += p.interval;
      }
      if (p.remaining <= 0) {
        this.payout = null; A.countEnd(this.win >= 100);
        this.state = 'idle'; this.betLocked = true; this.setMessage('WINNER PAID ' + S.fmt(this.win), false);
      }
    }
    if (this.cashout) {
      const c = this.cashout;
      while (this.credits > 0 && now >= c.next) {
        const d = Math.min(c.step, this.credits); this.credits -= d; c.next += c.interval;
        A.hopperCoin(); this.spawnCoin();
      }
      if (this.credits <= 0) {
        this.credits = 0; this.cashout = null; A.hopperStop();
        this.state = 'idle'; this.coinsPlayed = 0; this.betLocked = false; this.winnerPaid = 0; this.present = null;
        this.setMessage('INSERT COIN', true);
      }
    }
    if (this.state === 'idle' && now > this.nextAttract) {
      this.nextAttract = now + 15 + Math.random() * 10;
      if (A.ready) A.attract();
      this.chaseUntil = now + 2.5; this.attractLamp = now + 2.5;
    }
  };
  P.spawnCoin = function () {
    const L = S.LAYOUT;
    FX.particles.push({ type: 'coin', x: L.W / 2 + (Math.random() - 0.5) * 140, y: 1012, vx: (Math.random() - 0.5) * 120, vy: 60 + Math.random() * 160, rot: Math.random() * 6.28, rv: (Math.random() - 0.5) * 10, spin: Math.random() * 6.28, sv: 5 + Math.random() * 8, size: 22 + Math.random() * 10, life: 1.6, t: 0, g: 1400 });
  };

  P.onReelLand = function (reel) { A.reelStop(reel.index); };
  P.onReelStop = function () {
    this.stoppedCount++;
    if (this.stoppedCount >= 3) { A.motorStop(); this.evalAt = this.now + 0.15; }
  };
  P.evaluate = function () {
    const res = this.result;
    if (res && res.pay > 0) {
      this.win = res.pay; this.stats.won += res.pay;
      this.present = { row: res.index, count: 3, t0: this.now };
      const jackpot = res.pay >= 1000;
      if (jackpot) { this.stats.jackpots++; this.jackpotUntil = this.now + 6.5; this.chaseUntil = this.now + 12; A.jackpot(6.5); FX.flash = 0.7; FX.shake = 8; }
      else { this.chaseUntil = this.now + 3.5; A.winBells(res.pay >= 100 ? 2 : 1); }
      this.state = 'paying';
      this.payout = { remaining: res.pay, step: res.pay <= 50 ? 1 : res.pay <= 300 ? 2 : res.pay <= 1000 ? 10 : 50, next: this.now + (jackpot ? 1.4 : 0.35), interval: 0.075, n: 0 };
      this.setMessage(jackpot ? 'JACKPOT!  WINNER PAID ' + S.fmt(res.pay) : 'WINNER PAID ' + S.fmt(res.pay), false);
    } else {
      this.state = 'idle'; this.betLocked = true; this.setIdleMessage();
    }
  };

  S.Game = Game;
})(window);
