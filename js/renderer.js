/* ============================================================================
   BLAZING 7s — canvas renderer: casino backdrop, upright cabinet with chrome
   trim and candle, top glass with logo and chase lamps, three stepper reels
   behind glass with payline markers, LED meters, VFD message line, belly-glass
   pay table with lit coin column, pull lever, win and jackpot presentation.
   Virtual scene 1920 x 1080 scaled to the window.
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS, A = S.assets, FX = S.fx, C = S.CONFIG;
  const W = 1920, H = 1080;
  /* The reels dominate the cabinet like a real stepper: 370 x 170 cells in a 1146 x 510 window
     (about three times the glass area of the first layout), a slim marquee above, the message
     line and meters on one row below, and a four-column pay glass. */
  const CAB = { x: 300, w: 1320, top: 64 };
  const TOP = { x: 356, y: 80, w: 1208, h: 128 };
  const REEL = { x: 387, y: 240, w: 370, h: 170, rows: 3, cols: 3, gap: 18 };
  REEL.winW = REEL.cols * REEL.w + (REEL.cols - 1) * REEL.gap; REEL.winH = REEL.rows * REEL.h; REEL.cy = REEL.y + REEL.winH / 2;
  const GLASS = { x: 356, y: 224, w: 1208, h: 542 };
  const VFD = { x: 376, y: 782, w: 520, h: 44 };
  const METERS = { y: 792, h: 36 };
  const BELLY = { x: 356, y: 844, w: 1208, h: 148 };
  const LEVER = { pivotX: 1672, pivotY: 520, len: 240, knob: 27 };
  const R_CELLS = 3.2;
  const rr = A.roundRect;
  const FONT_UI = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif';
  const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  S.fmt = fmt; S.LAYOUT = { W: W, H: H, REEL: REEL, LEVER: LEVER, BELLY: BELLY, TOP: TOP, CAB: CAB };
  function proj(u) { const a = Math.max(-1.45, Math.min(1.45, u / R_CELLS)); return R_CELLS * Math.sin(a) * REEL.h; }
  function cover(ctx, img) { const r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r; ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); }

  function Renderer(canvas, game) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false }); this.game = game;
    this.scale = 1; this.dpr = 1; this.time = 0;
    this.lever = { angle: 0, pulling: 0 };          // angle 0 = up, 1 = fully pulled
    this.payGlass = null; this.payGlassKey = '';
    this.resize();
    root.addEventListener('resize', () => this.resize());
  }
  const P = Renderer.prototype;
  P.resize = function () {
    const vw = root.innerWidth, vh = root.innerHeight, s = Math.min(vw / W, vh / H);
    this.scale = s; this.dpr = Math.min(2, root.devicePixelRatio || 1);
    const stage = document.getElementById('stage');
    if (stage) stage.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
    this.canvas.width = Math.round(W * s * this.dpr); this.canvas.height = Math.round(H * s * this.dpr);
    this.canvas.style.width = W + 'px'; this.canvas.style.height = H + 'px';
  };
  P.update = function (dt) {
    const l = this.lever;
    if (l.pulling > 0) { l.pulling -= dt; l.angle = Math.min(1, l.angle + dt * 6); }
    else l.angle = Math.max(0, l.angle - dt * 4.5);
  };
  P.pullLever = function () { this.lever.pulling = 0.22; };
  P.cellRect = function (reel, row) {
    const x = REEL.x + reel * (REEL.w + REEL.gap), y0 = REEL.cy + proj(row - 1.5), y1 = REEL.cy + proj(row - 0.5);
    return { x: x, y: y0, w: REEL.w, h: y1 - y0, cx: x + REEL.w / 2, cy: (y0 + y1) / 2 };
  };

  P.draw = function (now, dt) {
    const ctx = this.ctx, Sc = this.scale * this.dpr; this.time = now;
    ctx.setTransform(Sc, 0, 0, Sc, 0, 0);
    ctx.save();
    if (FX.shake > 0.3) ctx.translate((Math.random() - 0.5) * FX.shake, (Math.random() - 0.5) * FX.shake);
    this.drawBackground(ctx);
    this.drawCabinet(ctx, now);
    this.drawTopGlass(ctx, now);
    this.drawReelFrame(ctx);
    this.drawReels(ctx, now);
    this.drawReelGlass(ctx, now);
    this.drawVfd(ctx, now);
    this.drawMeters(ctx, now);
    this.drawBelly(ctx, now);
    this.drawLever(ctx);
    FX.drawParticles(ctx);
    FX.drawBolts(ctx);
    this.drawOverlay(ctx, now);
    FX.drawFlash(ctx, W, H);
    ctx.restore();
  };

  /* ------------------------------------------------------------ scene */
  P.drawBackground = function (ctx) {
    const img = A.image('bgCasino');
    ctx.fillStyle = '#120a08'; ctx.fillRect(-20, -20, W + 40, H + 40);
    if (img) cover(ctx, img);
    else { const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#3a1612'); g.addColorStop(1, '#0d0505'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
    let g = ctx.createRadialGradient(W / 2, H * 0.5, 300, W / 2, H * 0.5, 1150);
    g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0.78)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    /* floor glow from the machine */
    g = ctx.createRadialGradient(W / 2, H, 50, W / 2, H, 900); g.addColorStop(0, 'rgba(255,120,40,0.18)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  P.chrome = function (ctx, x, y, w, h, r, vertical) {
    const g = vertical ? ctx.createLinearGradient(x, 0, x + w, 0) : ctx.createLinearGradient(0, y, 0, y + h);
    [[0, '#5a5a5e'], [0.12, '#f4f4f6'], [0.3, '#9a9aa0'], [0.5, '#e8e8ec'], [0.7, '#6d6d72'], [0.88, '#dcdce0'], [1, '#3a3a3e']].forEach(s => g.addColorStop(s[0], s[1]));
    ctx.fillStyle = g; rr(ctx, x, y, w, h, r); ctx.fill();
  };
  P.drawCabinet = function (ctx, now) {
    const g0 = this.game;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20; ctx.fillStyle = '#17171b'; rr(ctx, CAB.x, CAB.top, CAB.w, H - CAB.top + 40, 22); ctx.fill(); ctx.restore();
    let g = ctx.createLinearGradient(CAB.x, 0, CAB.x + CAB.w, 0);
    g.addColorStop(0, '#0d0d10'); g.addColorStop(0.08, '#2a2a30'); g.addColorStop(0.5, '#1b1b20'); g.addColorStop(0.92, '#2a2a30'); g.addColorStop(1, '#0d0d10');
    ctx.fillStyle = g; rr(ctx, CAB.x, CAB.top, CAB.w, H - CAB.top + 40, 22); ctx.fill();
    /* brushed texture */
    ctx.save(); rr(ctx, CAB.x, CAB.top, CAB.w, H - CAB.top + 40, 22); ctx.clip(); ctx.globalAlpha = 0.07; const n = A.noise(); for (let yy = CAB.top; yy < H; yy += 256) for (let xx = CAB.x; xx < CAB.x + CAB.w; xx += 256) ctx.drawImage(n, xx, yy); ctx.restore();
    /* chrome side rails */
    this.chrome(ctx, CAB.x + 12, CAB.top + 12, 14, H - CAB.top, 6, true);
    this.chrome(ctx, CAB.x + CAB.w - 26, CAB.top + 12, 14, H - CAB.top, 6, true);
    /* red accent light strips */
    const pulse = 0.55 + 0.45 * Math.sin(now * 2.2), jack = g0.jackpotUntil > now;
    ctx.save(); ctx.shadowColor = 'rgba(255,40,20,0.9)'; ctx.shadowBlur = 24 * pulse; ctx.fillStyle = jack && Math.floor(now * 8) % 2 ? '#fff2a0' : 'rgba(255,60,30,' + (0.55 + 0.4 * pulse) + ')';
    ctx.fillRect(CAB.x + 34, CAB.top + 30, 5, H - CAB.top - 60); ctx.fillRect(CAB.x + CAB.w - 39, CAB.top + 30, 5, H - CAB.top - 60); ctx.restore();
    /* candle (tower light) */
    const cx = W / 2, cy = CAB.top - 4;
    this.chrome(ctx, cx - 26, cy - 8, 52, 12, 4, false);
    const on1 = jack ? Math.floor(now * 6) % 2 === 0 : false, on2 = jack ? Math.floor(now * 6 + 1) % 2 === 0 : (g0.attractLamp > now);
    [[cy - 30, 22, '#ff3a2a', on1], [cy - 56, 22, '#ffb028', on2]].forEach(([y, h, col, on]) => {
      ctx.save(); if (on) { ctx.shadowColor = col; ctx.shadowBlur = 36; }
      const cg = ctx.createLinearGradient(cx - 20, 0, cx + 20, 0); cg.addColorStop(0, on ? col : '#5a1a14'); cg.addColorStop(0.45, on ? '#fff6e0' : '#9a3a30'); cg.addColorStop(1, on ? col : '#4a1410');
      ctx.fillStyle = cg; ctx.globalAlpha = on ? 1 : 0.75; rr(ctx, cx - 20, y, 40, h, 6); ctx.fill(); ctx.restore();
    });
    this.chrome(ctx, cx - 22, cy - 60, 44, 5, 2, false); this.chrome(ctx, cx - 22, cy - 33, 44, 5, 2, false);
  };
  P.drawTopGlass = function (ctx, now) {
    const g0 = this.game, flames = A.image('flames'), logo = A.image('logo');
    this.chrome(ctx, TOP.x - 14, TOP.y - 14, TOP.w + 28, TOP.h + 28, 18, false);
    ctx.save(); rr(ctx, TOP.x, TOP.y, TOP.w, TOP.h, 10); ctx.clip();
    ctx.fillStyle = '#060305'; ctx.fillRect(TOP.x, TOP.y, TOP.w, TOP.h);
    if (flames) { ctx.globalAlpha = 0.55; const r = Math.max(TOP.w / flames.width, TOP.h / flames.height); const fw = flames.width * r, fh = flames.height * r; const drift = Math.sin(now * 0.3) * 20; ctx.drawImage(flames, TOP.x + (TOP.w - fw) / 2 + drift, TOP.y + (TOP.h - fh) / 2 + 20, fw, fh); ctx.globalAlpha = 1; }
    let g = ctx.createLinearGradient(0, TOP.y, 0, TOP.y + TOP.h); g.addColorStop(0, 'rgba(0,0,0,0.1)'); g.addColorStop(0.6, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0.85)'); ctx.fillStyle = g; ctx.fillRect(TOP.x, TOP.y, TOP.w, TOP.h);
    /* logo on the left half of the marquee, the top-award plaque on the right */
    const logoCx = TOP.x + TOP.w * 0.3;
    if (logo) { const bw = 560, bh = TOP.h - 40, r = Math.min(bw / logo.width, bh / logo.height), lw = logo.width * r, lh = logo.height * r; ctx.save(); ctx.shadowColor = 'rgba(255,120,30,0.6)'; ctx.shadowBlur = 30; ctx.drawImage(logo, logoCx - lw / 2, TOP.y + TOP.h / 2 - lh / 2, lw, lh); ctx.restore(); }
    else { ctx.fillStyle = '#ff3b1f'; ctx.font = '900 84px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BLAZING 7s', logoCx, TOP.y + TOP.h / 2); }
    /* top award plaque */
    const plaqueX = TOP.x + TOP.w * 0.57, plaqueW = 470;
    this.chrome(ctx, plaqueX, TOP.y + TOP.h / 2 - 17, plaqueW, 34, 8, false);
    ctx.fillStyle = '#1a0a06'; ctx.font = '700 18px ' + FONT_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('3 COINS PLAYS THE 5,000 COIN DOUBLE JACKPOT', plaqueX + plaqueW / 2, TOP.y + TOP.h / 2 + 1);
    /* chase lamps along the top and bottom edges of the glass */
    const lamps = 34, jack = g0.jackpotUntil > now, win = g0.chaseUntil > now;
    for (let i = 0; i < lamps; i++) {
      const u = i / lamps, lx = TOP.x + 16 + u * (TOP.w - 32), on = jack ? (Math.floor(now * 10) + i) % 3 === 0 : win ? (Math.floor(now * 7) + i) % 4 === 0 : (Math.floor(now * 1.5) + i) % 11 === 0;
      [TOP.y + 10, TOP.y + TOP.h - 10].forEach(ly => { ctx.save(); if (on) { ctx.shadowColor = '#ffd36a'; ctx.shadowBlur = 14; } ctx.fillStyle = on ? '#fff0b0' : 'rgba(120,80,30,0.6)'; ctx.beginPath(); ctx.arc(lx, ly, 4, 0, 6.283); ctx.fill(); ctx.restore(); });
    }
    /* glass reflection */
    g = ctx.createLinearGradient(TOP.x, TOP.y, TOP.x + TOP.w * 0.5, TOP.y + TOP.h); g.addColorStop(0, 'rgba(255,255,255,0.14)'); g.addColorStop(0.35, 'rgba(255,255,255,0.02)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(TOP.x, TOP.y, TOP.w, TOP.h);
    ctx.restore();
  };

  /* ------------------------------------------------------------ reels */
  P.drawReels = function (ctx, now) {
    const g0 = this.game, noise = A.noise();
    for (let i = 0; i < REEL.cols; i++) {
      const reel = g0.reels[i], rx = REEL.x + i * (REEL.w + REEL.gap);
      ctx.save(); ctx.beginPath(); ctx.rect(rx, REEL.y, REEL.w, REEL.winH); ctx.clip();
      /* printed strip: warm white paper on a drum */
      let grad = ctx.createLinearGradient(0, REEL.y, 0, REEL.y + REEL.winH);
      grad.addColorStop(0, '#b9b4a6'); grad.addColorStop(0.5, '#f7f3ea'); grad.addColorStop(1, '#b9b4a6');
      ctx.fillStyle = grad; ctx.fillRect(rx, REEL.y, REEL.w, REEL.winH);
      const grainA = 0.07 * (1 - Math.min(1, reel.speed / 10));
      if (grainA > 0.005) { ctx.globalAlpha = grainA; const off = ((reel.pos * REEL.h) % 256 + 256) % 256; for (let yy = REEL.y - 256 + off; yy < REEL.y + REEL.winH; yy += 256) ctx.drawImage(noise, rx, yy, 256, 256); ctx.globalAlpha = 1; }
      /* stop separators (faint printed guide lines) */
      ctx.strokeStyle = 'rgba(0,0,0,0.06)'; ctx.lineWidth = 1;
      const kc = Math.round(reel.pos);
      for (let k = kc - 2; k <= kc + 2; k++) { const yline = REEL.cy + proj(reel.pos - k - 0.5); ctx.beginPath(); ctx.moveTo(rx, yline); ctx.lineTo(rx + REEL.w, yline); ctx.stroke(); }
      const level = reel.speed < 5 ? 0 : reel.speed < 13 ? 1 : reel.speed < 21 ? 2 : 3;
      for (let k = kc - 2; k <= kc + 2; k++) this.drawSymbol(ctx, reel, k, rx, level);
      if (level >= 2) { ctx.fillStyle = 'rgba(255,255,255,' + (0.08 * (level - 1)) + ')'; ctx.fillRect(rx, REEL.y, REEL.w, REEL.winH); }
      /* drum shading */
      grad = ctx.createLinearGradient(0, REEL.y, 0, REEL.y + REEL.winH);
      grad.addColorStop(0, 'rgba(0,0,0,0.5)'); grad.addColorStop(0.2, 'rgba(0,0,0,0)'); grad.addColorStop(0.42, 'rgba(255,255,255,0.0)'); grad.addColorStop(0.5, 'rgba(255,255,255,0.08)'); grad.addColorStop(0.58, 'rgba(255,255,255,0)'); grad.addColorStop(0.8, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grad; ctx.fillRect(rx, REEL.y, REEL.w, REEL.winH);
      grad = ctx.createLinearGradient(rx, 0, rx + REEL.w, 0); grad.addColorStop(0, 'rgba(0,0,0,0.35)'); grad.addColorStop(0.08, 'rgba(0,0,0,0)'); grad.addColorStop(0.92, 'rgba(0,0,0,0)'); grad.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = grad; ctx.fillRect(rx, REEL.y, REEL.w, REEL.winH);
      /* win flash on the payline symbol */
      const pr = g0.present;
      if (pr && reel.state === 'stopped' && i < pr.count) { const on = Math.floor((now - pr.t0) * 5) % 2 === 0; if (on) { ctx.fillStyle = 'rgba(255,230,120,0.28)'; const c = this.cellRect(i, 1); ctx.fillRect(c.x, c.y, c.w, c.h); } }
      ctx.restore();
    }
  };
  P.drawSymbol = function (ctx, reel, k, rx, level) {
    const id = reel.symbolAt(k); if (id === 'BL') return;
    const img = A.symbol(id, level); if (!img) return;
    const u = reel.pos - k; if (Math.abs(u) > 2.1) return;
    const n = level > 0 ? 4 : 10, pad = 10, dw = REEL.w - 2 * pad, dx = rx + pad;
    for (let j = 0; j < n; j++) {
      const u0 = u - 0.5 + j / n, u1 = u0 + 1 / n, y0 = REEL.cy + proj(u0), y1 = REEL.cy + proj(u1);
      if (y1 <= REEL.y - 1 || y0 >= REEL.y + REEL.winH + 1) continue;
      ctx.drawImage(img, 0, j * img.height / n, img.width, img.height / n, dx, y0, dw, (y1 - y0) + 0.7);
    }
  };
  /* chrome frame + black interior, drawn BEFORE the reels */
  P.drawReelFrame = function (ctx) {
    this.chrome(ctx, GLASS.x - 14, GLASS.y - 14, GLASS.w + 28, GLASS.h + 28, 18, false);
    ctx.fillStyle = '#0a0a0c'; rr(ctx, GLASS.x, GLASS.y, GLASS.w, GLASS.h, 10); ctx.fill();
  };
  /* dividers, payline, labels and glass reflections, drawn AFTER the reels */
  P.drawReelGlass = function (ctx, now) {
    ctx.save(); rr(ctx, GLASS.x, GLASS.y, GLASS.w, GLASS.h, 10); ctx.clip();
    for (let i = 1; i < REEL.cols; i++) { const dx = REEL.x + i * (REEL.w + REEL.gap) - REEL.gap; const g = ctx.createLinearGradient(dx, 0, dx + REEL.gap, 0); g.addColorStop(0, '#020203'); g.addColorStop(0.5, '#2a2a30'); g.addColorStop(1, '#020203'); ctx.fillStyle = g; ctx.fillRect(dx, REEL.y, REEL.gap, REEL.winH); }
    /* payline */
    const py = REEL.cy, pr = this.game.present, hot = pr && Math.floor((now - pr.t0) * 5) % 2 === 0;
    ctx.strokeStyle = hot ? 'rgba(255,230,120,0.9)' : 'rgba(230,40,30,0.55)'; ctx.lineWidth = hot ? 3 : 2; ctx.beginPath(); ctx.moveTo(REEL.x, py); ctx.lineTo(REEL.x + REEL.winW, py); ctx.stroke();
    [[REEL.x - 8, -1], [REEL.x + REEL.winW + 8, 1]].forEach(([x, dir]) => {
      ctx.save(); ctx.shadowColor = '#ff2a1a'; ctx.shadowBlur = 10; ctx.fillStyle = hot ? '#ffe27a' : '#e8281c';
      ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x - dir * 26, py - 13); ctx.lineTo(x - dir * 26, py + 13); ctx.closePath(); ctx.fill(); ctx.restore();
    });
    /* glass reflections */
    let g = ctx.createLinearGradient(GLASS.x, GLASS.y, GLASS.x + GLASS.w * 0.5, GLASS.y + GLASS.h); g.addColorStop(0, 'rgba(255,255,255,0.13)'); g.addColorStop(0.3, 'rgba(255,255,255,0.03)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(GLASS.x, GLASS.y, GLASS.w, GLASS.h);
    g = ctx.createLinearGradient(0, REEL.y, 0, REEL.y + 30); g.addColorStop(0, 'rgba(0,0,0,0.6)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(REEL.x, REEL.y, REEL.winW, 30);
    g = ctx.createLinearGradient(0, REEL.y + REEL.winH - 30, 0, REEL.y + REEL.winH); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)'); ctx.fillStyle = g; ctx.fillRect(REEL.x, REEL.y + REEL.winH - 30, REEL.winW, 30);
    ctx.restore();
  };

  /* --------------------------------------------------- displays */
  P.drawVfd = function (ctx, now) {
    const g0 = this.game;
    ctx.fillStyle = '#05070a'; rr(ctx, VFD.x, VFD.y, VFD.w, VFD.h, 5); ctx.fill();
    ctx.save(); ctx.shadowColor = 'rgba(90,230,255,0.9)'; ctx.shadowBlur = 10; ctx.fillStyle = '#9ff1ff';
    ctx.font = '700 20px "Lucida Console", Consolas, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const msg = g0.message || '';
    const blink = g0.messageBlink && Math.floor(now * 1.6) % 2 === 1;
    if (!blink) ctx.fillText(msg, VFD.x + VFD.w / 2, VFD.y + VFD.h / 2 + 1);
    ctx.restore();
  };
  const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };
  P.sevenSeg = function (ctx, text, right, y, h, color) {
    const dw = h * 0.52, sp = h * 0.7, th = h * 0.12;
    let x = right - dw;
    const segRect = (sx, sy, sw, sh) => { rr(ctx, sx, sy, sw, sh, th / 2); ctx.fill(); };
    const digit = (ch, dx) => {
      const on = SEG[ch] || '';
      const draw = (seg, lit) => {
        ctx.fillStyle = lit ? color : 'rgba(255,40,20,0.09)';
        if (lit) { ctx.shadowColor = color; ctx.shadowBlur = 10; } else ctx.shadowBlur = 0;
        switch (seg) {
          case 'a': segRect(dx + th * 0.6, y, dw - th * 1.2, th); break;
          case 'b': segRect(dx + dw - th, y + th * 0.6, th, h / 2 - th * 0.9); break;
          case 'c': segRect(dx + dw - th, y + h / 2 + th * 0.3, th, h / 2 - th * 0.9); break;
          case 'd': segRect(dx + th * 0.6, y + h - th, dw - th * 1.2, th); break;
          case 'e': segRect(dx, y + h / 2 + th * 0.3, th, h / 2 - th * 0.9); break;
          case 'f': segRect(dx, y + th * 0.6, th, h / 2 - th * 0.9); break;
          default: segRect(dx + th * 0.6, y + h / 2 - th / 2, dw - th * 1.2, th);
        }
      };
      'abcdefg'.split('').forEach(sg => draw(sg, on.indexOf(sg) >= 0));
    };
    ctx.save();
    for (let i = text.length - 1; i >= 0; i--) { digit(text[i], x); x -= sp; }
    ctx.restore();
  };
  P.drawMeters = function (ctx, now) {
    const g0 = this.game, y = METERS.y, h = METERS.h;
    const items = [['COINS PLAYED', String(g0.coinsPlayed), 2, 940], ['CREDITS', String(Math.max(0, Math.round(g0.credits))), 6, 1066], ['WINNER PAID', String(Math.round(g0.winnerPaid)), 5, 1336]];
    items.forEach(([label, value, digits, x]) => {
      const w = digits * 36 + 24;
      ctx.fillStyle = '#c8c8cc'; ctx.font = '700 14px ' + FONT_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, x + w / 2, y - 13);
      this.chrome(ctx, x - 6, y - 6, w + 12, h + 12, 8, false);
      ctx.fillStyle = '#120404'; rr(ctx, x, y, w, h, 5); ctx.fill();
      const padded = value.padStart(digits, '0').slice(-digits);
      /* leading zeros dim: draw ghosts for the padding, lit for the value */
      this.sevenSeg(ctx, padded.replace(/^0+(?=\d)/, m => ' '.repeat(m.length)), x + w - 12, y + 9, h - 18, '#ff2e1e');
    });
  };

  /* ------------------------------------------------------ belly glass */
  P.buildPayGlass = function (coins) {
    const c = document.createElement('canvas'); c.width = BELLY.w; c.height = BELLY.h;
    const ctx = c.getContext('2d'), flames = A.image('flames');
    ctx.fillStyle = '#07050a'; ctx.fillRect(0, 0, BELLY.w, BELLY.h);
    if (flames) { ctx.globalAlpha = 0.28; const r = Math.max(BELLY.w / flames.width, BELLY.h / flames.height); ctx.drawImage(flames, (BELLY.w - flames.width * r) / 2, BELLY.h - flames.height * r + 40, flames.width * r, flames.height * r); ctx.globalAlpha = 1; }
    const g = ctx.createLinearGradient(0, 0, 0, BELLY.h); g.addColorStop(0, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0.7)'); ctx.fillStyle = g; ctx.fillRect(0, 0, BELLY.w, BELLY.h);
    /* four columns of four combinations, so the glass stays a wide strip under the big reels */
    const colW = BELLY.w / 4, rowH = 24, top = 36, iconS = 20, iconGap = 40;
    const header = (x0) => { ctx.font = '700 12px ' + FONT_UI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; [1, 2, 3].forEach((cn, i) => { const lit = cn === coins; ctx.fillStyle = lit ? '#ffe27a' : '#8a8a90'; ctx.fillText(cn + (cn > 1 ? ' COINS' : ' COIN'), x0 + colW - 178 + i * 62, 16); }); };
    for (let c = 0; c < 4; c++) header(c * colW);
    const drawIcon = (sym, x, y) => {
      ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
      if (sym === 'A7') { ctx.fillStyle = '#ff4a30'; ctx.font = '900 11px ' + FONT_UI; ctx.fillText('ANY 7', x + iconS / 2, y + iconS / 2 + 1); return; }
      if (sym === 'AB') { ctx.fillStyle = '#e6e6e6'; ctx.font = '900 9px ' + FONT_UI; ctx.fillText('ANY BAR', x + iconS / 2, y + iconS / 2 + 1); return; }
      if (sym === 'BL') { ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]); ctx.strokeRect(x + 2, y + 2, iconS - 4, iconS - 4); ctx.setLineDash([]); return; }
      const img = A.symbol(sym, 0); if (img) ctx.drawImage(img, x - 8, y - 4, iconS + 16, iconS + 8);
    };
    C.paytable.forEach((row, i) => {
      const col = Math.floor(i / 4), ri = i % 4, x0 = col * colW + 18, y = top + ri * rowH;
      if (ri % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,0.035)'; ctx.fillRect(col * colW + 6, y - 2, colW - 12, rowH); }
      const first = row.pat[0];
      if (first === 'A7' || first === 'AB' || first === 'BL') {
        const dj = row.pat[2] === 'DJ';
        const label = first === 'A7' ? (dj ? 'ANY TWO 7s' : 'ANY THREE 7s') : first === 'AB' ? (dj ? 'ANY TWO BARS' : 'ANY THREE BARS') : (dj ? 'TWO BLANKS' : 'THREE BLANKS');
        ctx.fillStyle = first === 'A7' ? '#ff4a30' : '#e6e6e6'; ctx.font = '900 10px ' + FONT_UI; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(label, x0, y + iconS / 2 + 1);
        if (dj) drawIcon('DJ', x0 + 2 * iconGap + 22, y);
      } else row.pat.forEach((sym, k) => drawIcon(sym, x0 + k * iconGap, y));
      ctx.textBaseline = 'middle'; ctx.textAlign = 'right';
      row.pays.forEach((p, k) => {
        const lit = k + 1 === coins; ctx.fillStyle = p === 0 ? 'rgba(255,255,255,0.18)' : lit ? '#ffe27a' : '#b9b9c2'; ctx.font = (lit ? '900 ' : '700 ') + '15px ' + FONT_UI;
        if (lit && p > 0) { ctx.shadowColor = 'rgba(255,200,80,0.8)'; ctx.shadowBlur = 8; } else ctx.shadowBlur = 0;
        ctx.fillText(p === 0 ? '—' : fmt(p), col * colW + colW - 178 + k * 62 + 22, y + iconS / 2 + 1);
      });
      ctx.shadowBlur = 0;
    });
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '600 10px ' + FONT_UI; ctx.textAlign = 'center';
    ctx.fillText('2 COIN OPTION BUY-A-PAY · 3RD COIN MULTIPLIES 7s · DOUBLE JACKPOT ON REEL 3 ONLY · ANY 7s INCLUDES BLAZING & RED · ANY BARS INCLUDES SINGLE, DOUBLE, TRIPLE', BELLY.w / 2, BELLY.h - 8);
    return c;
  };
  P.drawBelly = function (ctx, now) {
    const g0 = this.game, key = (g0.coinsPlayed || 0) + ':' + (A.ready ? 1 : 0);
    if (this.payGlassKey !== key) { this.payGlass = this.buildPayGlass(g0.coinsPlayed || 0); this.payGlassKey = key; }
    this.chrome(ctx, BELLY.x - 14, BELLY.y - 14, BELLY.w + 28, BELLY.h + 28, 18, false);
    ctx.save(); rr(ctx, BELLY.x, BELLY.y, BELLY.w, BELLY.h, 10); ctx.clip();
    ctx.drawImage(this.payGlass, BELLY.x, BELLY.y);
    const pr = g0.present;
    if (pr && pr.row != null) {
      const i = pr.row, col = Math.floor(i / 4), ri = i % 4, colW = BELLY.w / 4, y = BELLY.y + 36 + ri * 24 - 2;
      const on = Math.floor((now - pr.t0) * 5) % 2 === 0;
      ctx.fillStyle = on ? 'rgba(255,220,100,0.32)' : 'rgba(255,220,100,0.12)'; ctx.fillRect(BELLY.x + col * colW + 6, y, colW - 12, 24);
      ctx.strokeStyle = 'rgba(255,230,140,0.9)'; ctx.lineWidth = 1.5; ctx.strokeRect(BELLY.x + col * colW + 6, y, colW - 12, 24);
    }
    const g = ctx.createLinearGradient(BELLY.x, BELLY.y, BELLY.x + BELLY.w * 0.5, BELLY.y + BELLY.h); g.addColorStop(0, 'rgba(255,255,255,0.1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.02)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(BELLY.x, BELLY.y, BELLY.w, BELLY.h);
    ctx.restore();
  };

  /* ------------------------------------------------------------ lever */
  P.drawLever = function (ctx) {
    const l = this.lever, px = LEVER.pivotX, py = LEVER.pivotY;
    /* bracket on the cabinet side */
    this.chrome(ctx, px - 46, py - 60, 60, 120, 14, false);
    ctx.fillStyle = '#17171b'; rr(ctx, px - 36, py - 48, 40, 96, 10); ctx.fill();
    const ang = -Math.PI / 2 + l.angle * 1.9;           // up -> pulled down/forward
    const ex = px + Math.cos(ang) * LEVER.len, ey = py + Math.sin(ang) * LEVER.len;
    ctx.save(); ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 12; ctx.shadowOffsetX = 6; ctx.shadowOffsetY = 8;
    const g = ctx.createLinearGradient(px - 12, 0, px + 12, 0); g.addColorStop(0, '#6a6a70'); g.addColorStop(0.35, '#f2f2f5'); g.addColorStop(0.7, '#9a9aa0'); g.addColorStop(1, '#4a4a50');
    ctx.strokeStyle = g; ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(ex - 4, ey); ctx.stroke();
    ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    const kg = ctx.createRadialGradient(ex - 9, ey - 10, 3, ex, ey, LEVER.knob); kg.addColorStop(0, '#ff9a8a'); kg.addColorStop(0.3, '#e0241a'); kg.addColorStop(1, '#5a0a06');
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(ex, ey, LEVER.knob, 0, 6.283); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.ellipse(ex - 8, ey - 11, 8, 5, -0.6, 0, 6.283); ctx.fill();
    /* pivot cap */
    const pg = ctx.createRadialGradient(px - 4, py - 4, 2, px, py, 16); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#b0b0b6'); pg.addColorStop(1, '#3a3a40');
    ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 15, 0, 6.283); ctx.fill();
    ctx.restore();
  };

  /* --------------------------------------------------------- overlay */
  P.drawOverlay = function (ctx, now) {
    const g0 = this.game;
    if (g0.jackpotUntil > now) {
      const t = g0.jackpotUntil - now, a = Math.min(1, t / 0.5);
      ctx.save(); ctx.globalAlpha = a;
      ctx.font = '900 118px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const sc = 1 + 0.04 * Math.sin(now * 9); ctx.translate(W / 2, REEL.cy); ctx.scale(sc, sc);
      ctx.shadowColor = 'rgba(255,170,40,0.95)'; ctx.shadowBlur = 50; ctx.lineWidth = 10; ctx.strokeStyle = '#3a0a04'; ctx.strokeText('JACKPOT', 0, 0);
      const g = ctx.createLinearGradient(0, -55, 0, 55); g.addColorStop(0, '#fff6c8'); g.addColorStop(0.45, '#ffd54a'); g.addColorStop(0.55, '#e8281c'); g.addColorStop(1, '#8a1208');
      ctx.shadowBlur = 0; ctx.fillStyle = g; ctx.fillText('JACKPOT', 0, 0);
      ctx.restore();
    }
  };

  S.Renderer = Renderer;
})(window);
