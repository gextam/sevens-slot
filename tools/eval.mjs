#!/usr/bin/env node
/* Evaluate JavaScript inside the headless game page (after start) and print the
   JSON result — handy for debugging. usage: node tools/eval.mjs "<expression>" [--shot=file.jpg] */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, wait } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const shot = (args.find(a => a.startsWith('--shot=')) || '').slice(7);
const expr = args.filter(a => !a.startsWith('--'))[0] || 'SEVENS.game.state';
const b = await launch({ root: ROOT });
try {
  await b.page.eval('new Promise(r => { const t = setInterval(() => { if (window.SEVENS && SEVENS.ui && SEVENS.ui.assetsReady) { clearInterval(t); r(true); } }, 100); setTimeout(() => { clearInterval(t); r(false); }, 30000); })');
  await b.page.eval('SEVENS.ui.start(); SEVENS.step(0.3); true');
  console.log(JSON.stringify(await b.page.eval(expr), null, 2));
  if (shot) { await b.screenshot(shot); console.log('saved', shot); }
  await wait(200);
  if (b.errors.length) console.log('errors:', b.errors);
} finally { await b.close(); }
