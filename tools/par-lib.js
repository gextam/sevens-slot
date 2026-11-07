/* Exact payback maths for a 3-reel weighted stepper.
   counts[r] = { B7, R7, DB, B3, B2, B1, BL } virtual stop counts per reel. */
'use strict';
const SEVENS = ['B7', 'R7'];
const BARS = ['B3', 'B2', 'B1'];
/* Paytable in evaluation order: [pattern, pays for 1/2/3 coins].
   A7 = any seven, AB = any bar, BL = blank, DB = Double Jackpot (reel 3 only). */
const PAYTABLE = [
  [['B7', 'B7', 'DB'], [0, 2500, 5000]],
  [['B7', 'B7', 'B7'], [0, 500, 1000]],
  [['R7', 'R7', 'DB'], [0, 300, 600]],
  [['R7', 'R7', 'R7'], [0, 150, 300]],
  [['A7', 'A7', 'DB'], [0, 250, 400]],
  [['A7', 'A7', 'A7'], [0, 100, 200]],
  [['B3', 'B3', 'DB'], [120, 120, 120]],
  [['B3', 'B3', 'B3'], [60, 60, 60]],
  [['B2', 'B2', 'DB'], [80, 80, 80]],
  [['B2', 'B2', 'B2'], [40, 40, 40]],
  [['B1', 'B1', 'DB'], [40, 40, 40]],
  [['B1', 'B1', 'B1'], [20, 20, 20]],
  [['AB', 'AB', 'DB'], [20, 20, 20]],
  [['AB', 'AB', 'AB'], [10, 10, 10]],
  [['BL', 'BL', 'DB'], [4, 4, 4]],
  [['BL', 'BL', 'BL'], [2, 2, 2]]
];
function matches(sym, pat) {
  if (pat === 'A7') return SEVENS.indexOf(sym) >= 0;
  if (pat === 'AB') return BARS.indexOf(sym) >= 0;
  return sym === pat;
}
/* returns { index, pays } of the first matching paytable row or null */
function evaluate(s1, s2, s3) {
  for (let i = 0; i < PAYTABLE.length; i++) {
    const p = PAYTABLE[i][0];
    if (matches(s1, p[0]) && matches(s2, p[1]) && matches(s3, p[2])) return { index: i, pays: PAYTABLE[i][1], pattern: p };
  }
  return null;
}
const SYMS = ['B7', 'R7', 'DB', 'B3', 'B2', 'B1', 'BL'];
function analyze(counts) {
  const total = counts.map(c => SYMS.reduce((a, s) => a + (c[s] || 0), 0));
  const cycle = total[0] * total[1] * total[2];
  const rows = PAYTABLE.map(r => ({ pattern: r[0].join(' '), pays: r[1], ways: 0 }));
  let hitWays = 0;
  const coinsOut = [0, 0, 0];
  for (const a of SYMS) for (const b of SYMS) for (const c of SYMS) {
    const w = (counts[0][a] || 0) * (counts[1][b] || 0) * (counts[2][c] || 0);
    if (!w) continue;
    const r = evaluate(a, b, c);
    if (!r) continue;
    rows[r.index].ways += w;
    if (r.pays[2] > 0) hitWays += w;
    for (let k = 0; k < 3; k++) coinsOut[k] += w * r.pays[k];
  }
  const payback = coinsOut.map((v, k) => v / cycle / (k + 1));
  return { total, cycle, rows, hitFreq: hitWays / cycle, coinsOut, payback };
}
module.exports = { PAYTABLE, SYMS, SEVENS, BARS, evaluate, matches, analyze };
