/* ============================================================================
   BLAZING 7s — game configuration: symbols, pay glass, physical reel strips
   with virtual-reel weights (Bally PAR sheet "Blazing 7s Double JP / Bars,
   2 coin O.B.P. with 3CM", 72 virtual stops per reel, 373,248 combinations,
   payback 91.96% / 92.52% / 92.70% for 1 / 2 / 3 coins) and win evaluation.
   Shared by the browser game (window.SEVENS) and the node tools (module.exports).
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS || (root.SEVENS = {});

  const SYMBOLS = {
    B7: { id: 'B7', name: 'Blazing 7', file: 'b7', seven: true },
    R7: { id: 'R7', name: 'Red 7', file: 'r7', seven: true },
    DJ: { id: 'DJ', name: 'Double Jackpot', file: 'double' },
    B3: { id: 'B3', name: 'Triple Bar', file: 'bar3', bar: true },
    B2: { id: 'B2', name: 'Double Bar', file: 'bar2', bar: true },
    B1: { id: 'B1', name: 'Single Bar', file: 'bar1', bar: true },
    BL: { id: 'BL', name: 'Blank' }
  };

  /* Pay glass, evaluated top to bottom; pays are coins for 1 / 2 / 3 coins played.
     A7 = any seven (Blazing or Red), AB = any bar, DJ only ever lands on reel 3. */
  const PAYTABLE = [
    { pat: ['B7', 'B7', 'DJ'], pays: [0, 2500, 5000], label: 'BLAZING 7 · BLAZING 7 · DOUBLE JACKPOT' },
    { pat: ['B7', 'B7', 'B7'], pays: [0, 500, 1000], label: 'THREE BLAZING 7s' },
    { pat: ['R7', 'R7', 'DJ'], pays: [0, 300, 600], label: 'RED 7 · RED 7 · DOUBLE JACKPOT' },
    { pat: ['R7', 'R7', 'R7'], pays: [0, 150, 300], label: 'THREE RED 7s' },
    { pat: ['A7', 'A7', 'DJ'], pays: [0, 200, 400], label: 'ANY TWO 7s · DOUBLE JACKPOT' },
    { pat: ['A7', 'A7', 'A7'], pays: [0, 100, 200], label: 'ANY THREE 7s' },
    { pat: ['B3', 'B3', 'DJ'], pays: [120, 120, 120], label: 'TRIPLE BAR · TRIPLE BAR · DOUBLE JACKPOT' },
    { pat: ['B3', 'B3', 'B3'], pays: [60, 60, 60], label: 'THREE TRIPLE BARS' },
    { pat: ['B2', 'B2', 'DJ'], pays: [80, 80, 80], label: 'DOUBLE BAR · DOUBLE BAR · DOUBLE JACKPOT' },
    { pat: ['B2', 'B2', 'B2'], pays: [40, 40, 40], label: 'THREE DOUBLE BARS' },
    { pat: ['B1', 'B1', 'DJ'], pays: [40, 40, 40], label: 'SINGLE BAR · SINGLE BAR · DOUBLE JACKPOT' },
    { pat: ['B1', 'B1', 'B1'], pays: [20, 20, 20], label: 'THREE SINGLE BARS' },
    { pat: ['AB', 'AB', 'DJ'], pays: [20, 20, 20], label: 'ANY TWO BARS · DOUBLE JACKPOT' },
    { pat: ['AB', 'AB', 'AB'], pays: [10, 10, 10], label: 'ANY THREE BARS' },
    { pat: ['BL', 'BL', 'DJ'], pays: [4, 4, 4], label: 'BLANK · BLANK · DOUBLE JACKPOT' },
    { pat: ['BL', 'BL', 'BL'], pays: [2, 2, 2], label: 'THREE BLANKS' }
  ];

  function matches(sym, pat) {
    if (pat === 'A7') return sym === 'B7' || sym === 'R7';
    if (pat === 'AB') return sym === 'B3' || sym === 'B2' || sym === 'B1';
    return sym === pat;
  }
  /* -> { row, index, pay } for the payline symbols and coins played, or null */
  function evaluate(line, coins) {
    for (let i = 0; i < PAYTABLE.length; i++) {
      const p = PAYTABLE[i].pat;
      if (matches(line[0], p[0]) && matches(line[1], p[1]) && matches(line[2], p[2])) {
        return { row: PAYTABLE[i], index: i, pay: PAYTABLE[i].pays[Math.max(1, Math.min(3, coins)) - 1] };
      }
    }
    return null;
  }

  /* Physical strips: 22 stops, symbol / blank alternating. Each stop carries
     its virtual-reel weight; per-symbol weights sum to the PAR sheet counts.
     Blanks next to the Blazing 7 carry extra weight (classic near-miss teasing). */
  const STRIPS = [
    [ ['B7', 2], ['BL', 4], ['B1', 6], ['BL', 2], ['B2', 6], ['BL', 2], ['R7', 3], ['BL', 2], ['B3', 3], ['BL', 3], ['B1', 6],
      ['BL', 2], ['R7', 3], ['BL', 2], ['B2', 5], ['BL', 3], ['B1', 5], ['BL', 2], ['R7', 2], ['BL', 2], ['B3', 3], ['BL', 4] ],
    [ ['B7', 2], ['BL', 4], ['B1', 6], ['BL', 3], ['B2', 6], ['BL', 2], ['R7', 3], ['BL', 2], ['B3', 3], ['BL', 3], ['B1', 6],
      ['BL', 2], ['R7', 2], ['BL', 2], ['B2', 5], ['BL', 3], ['B1', 5], ['BL', 2], ['R7', 2], ['BL', 2], ['B3', 3], ['BL', 4] ],
    [ ['DJ', 1], ['BL', 3], ['B7', 8], ['BL', 2], ['B1', 5], ['BL', 2], ['R7', 3], ['BL', 2], ['B2', 3], ['BL', 2], ['B7', 8],
      ['BL', 2], ['B3', 3], ['BL', 2], ['B1', 4], ['BL', 2], ['R7', 3], ['BL', 2], ['B2', 3], ['BL', 2], ['B7', 7], ['BL', 3] ]
  ];
  const strips = STRIPS.map(s => s.map(x => x[0]));
  const weights = STRIPS.map(s => s.map(x => x[1]));
  const totals = weights.map(w => w.reduce((a, b) => a + b, 0));

  /* virtual counts per reel (for the maths tools and the pay glass) */
  function virtualCounts() {
    return STRIPS.map(s => { const c = {}; s.forEach(x => { c[x[0]] = (c[x[0]] || 0) + x[1]; }); return c; });
  }
  /* map a virtual stop number (0..total-1) to a physical stop index */
  function physicalStop(reel, virtual) {
    const w = weights[reel]; let acc = 0;
    for (let i = 0; i < w.length; i++) { acc += w[i]; if (virtual < acc) return i; }
    return w.length - 1;
  }
  /* window rows top..bottom for a stop S: strip[S+1], strip[S], strip[S-1] */
  function windowAt(strip, Sidx) {
    const n = strip.length, m = k => strip[((k % n) + n) % n];
    return [m(Sidx + 1), m(Sidx), m(Sidx - 1)];
  }

  S.CONFIG = {
    title: 'BLAZING 7s',
    reels: 3,
    maxCoins: 3,
    startCredits: 200,
    coinPack: 100,
    symbols: SYMBOLS,
    paytable: PAYTABLE,
    strips: strips,
    weights: weights,
    totals: totals,
    physicalStops: 22,
    payback: [91.96, 92.52, 92.70],
    rules: [
      'One payline. Winning combinations pay on the center line only.',
      '2-coin option buy-a-pay: 7s combinations pay with 2 or more coins; the third coin doubles all 7s pays and raises the top award to 5,000.',
      'Bar and blank combinations pay the same with 1, 2 or 3 coins.',
      'DOUBLE JACKPOT appears on reel 3 only and doubles any two-symbol combination it completes (five times the Blazing 7 jackpot).',
      'ANY 7s includes Blazing 7 and Red 7. ANY BARS includes single, double and triple bars.',
      'Highest winning combination paid. Malfunction voids all pays and plays.'
    ]
  };
  S.evaluate = evaluate;
  S.matches = matches;
  S.virtualCounts = virtualCounts;
  S.physicalStop = physicalStop;
  S.windowAt = windowAt;

  if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
