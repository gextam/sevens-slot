/* PAR-sheet style report for the Blazing 7s strips: exact paybacks from the
   virtual-reel weights, ways per combination, hit frequency, plus a Monte-Carlo
   cross-check that spins the physical strips through the same mapping the game
   uses.  usage: node tools/rtp-sim.js [spins] */
'use strict';
const S = require('../js/config.js');
const C = S.CONFIG;
const counts = S.virtualCounts();
const SYMS = ['B7', 'R7', 'DJ', 'B3', 'B2', 'B1', 'BL'];
const totals = counts.map(c => SYMS.reduce((a, s) => a + (c[s] || 0), 0));
const cycle = totals[0] * totals[1] * totals[2];

const rows = C.paytable.map(r => ({ label: r.pat.join(' '), pays: r.pays, ways: 0 }));
const coinsOut = [0, 0, 0]; let hitWays = 0;
for (const a of SYMS) for (const b of SYMS) for (const c of SYMS) {
  const w = (counts[0][a] || 0) * (counts[1][b] || 0) * (counts[2][c] || 0);
  if (!w) continue;
  const r = S.evaluate([a, b, c], 3);
  if (!r) continue;
  rows[r.index].ways += w; hitWays += w;
  for (let k = 0; k < 3; k++) coinsOut[k] += w * r.row.pays[k];
}
console.log('BLAZING 7s DOUBLE JACKPOT / BARS — 2 coin option buy-a-pay, 3rd coin multiplier');
console.log('virtual stops per reel:', totals.join(' / '), '  total combinations:', cycle);
console.log('symbol counts:'); SYMS.forEach(s => console.log('  ' + s.padEnd(3), counts.map(c => String(c[s] || 0).padStart(3)).join(' ')));
console.log('\ncombination            1 coin  2 coins  3 coins     ways   hit 1 in');
rows.forEach(r => console.log('  ' + r.label.padEnd(20), String(r.pays[0]).padStart(6), String(r.pays[1]).padStart(8), String(r.pays[2]).padStart(8), String(r.ways).padStart(8), String(Math.round(cycle / r.ways)).padStart(10)));
console.log('\nhit frequency: %s%%  (1 in %s)', (hitWays / cycle * 100).toFixed(2), (cycle / hitWays).toFixed(2));
coinsOut.forEach((v, k) => console.log('payback %d coin%s: %s%%   (PAR sheet %s%%)', k + 1, k ? 's' : ' ', (v / cycle / (k + 1) * 100).toFixed(2), C.payback[k].toFixed(2)));

/* physical strip sanity + Monte Carlo through the game mapping */
C.strips.forEach((s, r) => { if (s.length !== C.physicalStops) console.log('WARNING reel', r, 'has', s.length, 'stops'); });
const N = parseInt(process.argv[2] || '2000000', 10);
let won = 0, hits = 0;
for (let i = 0; i < N; i++) {
  const line = [0, 1, 2].map(r => C.strips[r][S.physicalStop(r, Math.floor(Math.random() * C.totals[r]))]);
  const res = S.evaluate(line, 3);
  if (res) { hits++; won += res.pay; }
}
console.log('\nMonte Carlo %d max-coin spins through the physical strips: payback %s%%, hit %s%%', N, (won / (N * 3) * 100).toFixed(2), (hits / N * 100).toFixed(2));
