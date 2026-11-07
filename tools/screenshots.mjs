#!/usr/bin/env node
/* Re-runnable documentation screenshots for Blazing 7s: headless Chrome over
   CDP (no dependencies), game loaded muted and driven through its test hooks.
   usage: node tools/screenshots.mjs [--chrome=<path>] */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, wait } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'docs', 'screenshots');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));

const SCENES = [
  { name: 'splash', run: 'true' },
  { name: 'base', run: 'SEVENS.ui.start(); SEVENS.step(0.4); SEVENS.game.insertCoins(100); SEVENS.step(0.3); true' },
  { name: 'bet', run: 'SEVENS.game.betOne(); SEVENS.game.betOne(); SEVENS.game.betOne(); SEVENS.step(0.3); true' },
  { name: 'spin', run: 'SEVENS.DEBUG_FORCE = null; SEVENS.game.spin(); SEVENS.step(0.75); true' },
  { name: 'win', run: 'SEVENS.step(4); SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("bars3"); SEVENS.game.betMax(); SEVENS.step(3.1); true' },
  { name: 'jackpot', run: 'SEVENS.step(6); SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("jackpot"); SEVENS.game.betMax(); SEVENS.step(3.4); true' },
  { name: 'lever', run: 'let g = 0; while (SEVENS.game.state !== "idle" && g++ < 40) SEVENS.step(1); SEVENS.game.pullLever(); SEVENS.step(0.13); true' },
  { name: 'cashout', run: 'let h = 0; while (SEVENS.game.state !== "idle" && h++ < 60) SEVENS.step(0.5); SEVENS.DEBUG_FORCE = null; SEVENS.game.cashOut(); SEVENS.step(0.9); true' },
  { name: 'help', run: 'SEVENS.step(3); SEVENS.ui.toggleHelp(true); true' }
];

async function main() {
  await fs.mkdir(OUT, { recursive: true });
  const b = await launch({ root: ROOT, width: 1600, height: 900, chrome: args.chrome });
  console.log('page    :', b.url);
  try {
    await b.page.eval('new Promise(r => { const t = setInterval(() => { if (window.SEVENS && SEVENS.ui && SEVENS.ui.assetsReady) { clearInterval(t); r(true); } }, 100); setTimeout(() => { clearInterval(t); r(false); }, 30000); })');
    await wait(400);
    for (const scene of SCENES) {
      await b.page.eval(scene.run);
      await b.screenshot(path.join(OUT, scene.name + '.jpg'));
      console.log('  saved docs/screenshots/' + scene.name + '.jpg');
    }
    await fs.copyFile(path.join(OUT, 'bet.jpg'), path.join(OUT, 'hero.jpg'));
    console.log('  saved docs/screenshots/hero.jpg');
    if (b.errors.length) { console.log('page errors:'); b.errors.forEach(e => console.log('  ' + e)); }
  } finally { await b.close(); }
}
main().catch(err => { console.error(err.message || err); process.exit(1); });
