/* Search bar/blank virtual-stop counts that reproduce the published Blazing 7s
   paybacks (91.96% / 92.52% / 92.70% for 1/2/3 coins) given the known seven
   counts (B7 2,2,23; R7 8,7,6; DB 1 on reel 3; 72 virtual stops per reel).
   usage: node tools/par.js */
'use strict';
const L = require('./par-lib.js');
const TARGET = [0.9196, 0.9252, 0.9270];
const fixed = [
  { B7: 2, R7: 8, DB: 0 },
  { B7: 2, R7: 7, DB: 0 },
  { B7: 23, R7: 6, DB: 1 }
];
const remaining = [62, 63, 42];
const best = [];
function partitions(total, parts, min, max, cb, acc) {
  acc = acc || [];
  if (parts === 1) { if (total >= min && total <= max) cb(acc.concat(total)); return; }
  for (let v = min; v <= Math.min(max, total); v++) partitions(total - v, parts - 1, min, max, cb, acc.concat(v));
}
/* reel 1 & 2: bars 3B/2B/1B then blanks; keep classic proportions (more singles than triples, blanks ~45%) */
const reel12 = [];
[0, 1].forEach(r => {
  const opts = [];
  partitions(remaining[r], 4, 3, 40, p => {
    const [b3, b2, b1, bl] = p;
    if (!(b3 <= b2 && b2 <= b1 && bl >= 24 && bl <= 34 && b3 >= 5)) return;
    opts.push({ B3: b3, B2: b2, B1: b1, BL: bl });
  });
  reel12.push(opts);
});
const reel3 = [];
partitions(remaining[2], 4, 2, 30, p => {
  const [b3, b2, b1, bl] = p;
  if (!(b3 <= b2 && b2 <= b1 && bl >= 14 && bl <= 26 && b3 >= 3)) return;
  reel3.push({ B3: b3, B2: b2, B1: b1, BL: bl });
});
console.log('candidates per reel:', reel12[0].length, reel12[1].length, reel3.length);
let tested = 0;
/* coarse search: sample reel1/reel2 options on a grid to keep runtime sane */
const step = o => o.filter((_, i) => i % 7 === 0);
for (const c1 of step(reel12[0])) for (const c2 of step(reel12[1])) for (const c3 of reel3) {
  const counts = [Object.assign({}, fixed[0], c1), Object.assign({}, fixed[1], c2), Object.assign({}, fixed[2], c3)];
  const r = L.analyze(counts);
  const err = Math.hypot(r.payback[0] - TARGET[0], r.payback[1] - TARGET[1], r.payback[2] - TARGET[2]);
  tested++;
  best.push({ err, counts, payback: r.payback, hit: r.hitFreq });
  if (best.length > 400) { best.sort((a, b) => a.err - b.err); best.length = 10; }
}
best.sort((a, b) => a.err - b.err);
console.log('tested', tested);
best.slice(0, 8).forEach(b => console.log(
  'err', (b.err * 100).toFixed(3), 'pb', b.payback.map(x => (x * 100).toFixed(2)).join('/'), 'hit', (b.hit * 100).toFixed(1) + '%',
  JSON.stringify(b.counts.map(c => [c.B3, c.B2, c.B1, c.BL]))));
