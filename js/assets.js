/* ============================================================================
   BLAZING 7s — asset loading, pre-rendered symbol variants (sharp + motion
   blurred), procedural textures. Missing images fall back to drawn symbols.
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS || (root.SEVENS = {});
  const A = S.assets = { images: {}, missing: {}, symbols: {}, ready: false, progress: 0 };
  const FILES = { logo: 'assets/logo.png', bgCasino: 'assets/bg/casino.jpg', flames: 'assets/bg/flames.jpg' };
  Object.keys(S.CONFIG.symbols).forEach(id => { const s = S.CONFIG.symbols[id]; if (s.file) FILES['sym_' + id] = 'assets/symbols/' + s.file + '.png'; });

  function loadImage(key, src) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => { A.images[key] = img; resolve(img); };
      img.onerror = () => { A.missing[key] = true; resolve(null); };
      img.src = src;
    });
  }
  A.load = function (onProgress) {
    const keys = Object.keys(FILES); let done = 0;
    return Promise.all(keys.map(k => loadImage(k, FILES[k]).then(() => { done++; A.progress = done / keys.length; if (onProgress) onProgress(A.progress); })))
      .then(() => { A.ready = true; return A; });
  };
  A.image = function (key) { return A.images[key] || null; };

  function roundRect(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath(); ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  A.roundRect = roundRect;

  /* Bounding box of the painted pixels of an image (alpha above `min`), in image coordinates.
     Lets a wide BAR fill the width of a wide cell and a 7 fill its height, like the printed
     strip of a real stepper. Falls back to the whole image when the canvas is tainted (a page
     opened straight from disk) or nothing is painted. */
  A.paintedBounds = function (img, min) {
    const full = { x: 0, y: 0, w: img.width, h: img.height };
    try {
      const n = 160, c = document.createElement('canvas'); c.width = c.height = n;
      const cx = c.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, n, n);
      const d = cx.getImageData(0, 0, n, n).data;
      let x0 = n, y0 = n, x1 = -1, y1 = -1;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (d[(y * n + x) * 4 + 3] > (min || 48)) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      if (x1 < 0) return full;
      const sx = img.width / n, sy = img.height / n;
      const bx = Math.max(0, (x0 - 1) * sx), by = Math.max(0, (y0 - 1) * sy);
      return { x: bx, y: by, w: Math.min(img.width, (x1 + 2) * sx) - bx, h: Math.min(img.height, (y1 + 2) * sy) - by };
    } catch (e) { return full; }
  };

  /* symbol variants per id: [sharp, blur1, blur2, blur3] at the given pixel size */
  A.prepareSymbols = function (w, h) {
    A.symW = w; A.symH = h;
    Object.keys(S.CONFIG.symbols).forEach(id => {
      if (id === 'BL') return;
      const base = document.createElement('canvas'); base.width = w; base.height = h;
      const ctx = base.getContext('2d'), img = A.images['sym_' + id];
      if (img) {
        /* the painted part of the artwork fills 96% of the cell in its limiting direction */
        const b = A.paintedBounds(img), m = 0.02, aw = w * (1 - 2 * m), ah = h * (1 - 2 * m);
        const sc = Math.min(aw / b.w, ah / b.h), dw = b.w * sc, dh = b.h * sc;
        ctx.drawImage(img, b.x, b.y, b.w, b.h, (w - dw) / 2, (h - dh) / 2, dw, dh);
      } else drawFallback(ctx, id, w, h);
      const variants = [base];
      [0.08, 0.18, 0.32].forEach(frac => {
        const c = document.createElement('canvas'); c.width = w; c.height = h;
        const cx = c.getContext('2d'), n = 12, span = h * frac;
        cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 1 / n;
        for (let i = 0; i < n; i++) cx.drawImage(base, 0, -span / 2 + span * i / (n - 1));
        variants.push(c);
      });
      A.symbols[id] = variants;
    });
  };
  A.symbol = function (id, level) { const v = A.symbols[id]; return v ? v[Math.max(0, Math.min(3, level | 0))] : null; };
  function drawFallback(ctx, id, w, h) {
    ctx.save(); ctx.translate(w / 2, h / 2);
    if (id === 'B7' || id === 'R7') {
      ctx.fillStyle = id === 'B7' ? '#ff5a1f' : '#d81e1e'; ctx.font = '900 ' + Math.floor(h * 0.9) + 'px Impact, "Arial Black", sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = h * 0.05; ctx.strokeStyle = '#eee'; ctx.strokeText('7', 0, h * 0.04); ctx.fillText('7', 0, h * 0.04);
    } else if (id === 'DJ') {
      ctx.fillStyle = '#f5c518'; ctx.beginPath(); for (let i = 0; i < 24; i++) { const r = i % 2 ? h * 0.3 : h * 0.44, an = i * Math.PI / 12; ctx.lineTo(Math.cos(an) * r, Math.sin(an) * r); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c21807'; ctx.font = '900 ' + Math.floor(h * 0.14) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('DOUBLE', 0, -h * 0.08); ctx.fillText('JACKPOT', 0, h * 0.08);
    } else {
      const n = id === 'B3' ? 3 : id === 'B2' ? 2 : 1, bh = h * 0.2, gap = h * 0.06, totalH = n * bh + (n - 1) * gap;
      for (let i = 0; i < n; i++) { const y = -totalH / 2 + i * (bh + gap); ctx.fillStyle = '#111'; roundRect(ctx, -w * 0.38, y, w * 0.76, bh, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = '900 ' + Math.floor(bh * 0.7) + 'px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BAR', 0, y + bh / 2); }
    }
    ctx.restore();
  }
  A.noise = function () {
    if (A._noise) return A._noise;
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'), id = ctx.createImageData(256, 256), d = id.data;
    for (let i = 0; i < d.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 60; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    ctx.putImageData(id, 0, 0); A._noise = c; return c;
  };
  A.coin = function () {
    if (A._coin) return A._coin;
    const s = 64, c = document.createElement('canvas'); c.width = c.height = s; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(s * 0.38, s * 0.35, s * 0.05, s / 2, s / 2, s / 2);
    g.addColorStop(0, '#fffbe6'); g.addColorStop(0.35, '#e8e8e8'); g.addColorStop(0.8, '#9a9a9a'); g.addColorStop(1, '#4a4a4a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(60,60,60,0.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(s / 2, s / 2, s / 2 - 6, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = 'rgba(70,70,70,0.7)'; ctx.font = '900 26px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('$1', s / 2, s / 2 + 1);
    A._coin = c; return c;
  };
})(window);
