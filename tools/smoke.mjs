#!/usr/bin/env node
/* Headless smoke test: drives the machine through its hooks and asserts the
   credit maths, buy-a-pay rules, jackpot, lever, cash-out and random play, and
   fails on any page error.  usage: node tools/smoke.mjs [--chrome=<path>] */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch, wait } from './cdp.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(process.argv.slice(2).map(a => { const m = a.match(/^--([^=]+)(?:=(.*))?$/); return m ? [m[1], m[2] ?? true] : [a, true]; }));
const results = [];
function check(name, ok, info) { results.push({ name, ok, info }); console.log((ok ? 'PASS ' : 'FAIL ') + name + (info ? '  ' + JSON.stringify(info) : '')); }

async function main() {
  const b = await launch({ root: ROOT, chrome: args.chrome });
  const ev = s => b.page.eval(s);
  try {
    const ready = await ev('new Promise(r => { const t = setInterval(() => { if (window.SEVENS && SEVENS.ui && SEVENS.ui.assetsReady) { clearInterval(t); r(true); } }, 100); setTimeout(() => { clearInterval(t); r(false); }, 30000); })');
    check('assets loaded', ready === true, await ev('({ missing: Object.keys(SEVENS.assets.missing) })'));
    const S0 = await ev('SEVENS.ui.start(); SEVENS.step(0.5); ({ state: SEVENS.game.state, credits: SEVENS.game.credits, muted: SEVENS.audio.muted, gain: SEVENS.audio.master.gain.value })');
    check('starts idle with 200 credits, muted', S0.state === 'idle' && S0.credits === 200 && S0.muted === true && S0.gain === 0, S0);
    const S1 = await ev('SEVENS.game.insertCoins(100); SEVENS.game.betOne(); SEVENS.game.betOne(); SEVENS.game.betOne(); SEVENS.game.betOne(); SEVENS.step(0.2); ({ credits: SEVENS.game.credits, coins: SEVENS.game.coinsPlayed })');
    check('insert 100 then bet one x4 caps at 3 coins', S1.credits === 297 && S1.coins === 3, S1);
    const S2 = await ev('SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("jackpot"); SEVENS.game.spin(); SEVENS.step(1.2); const mid = { state: SEVENS.game.state, reels: SEVENS.game.reels.map(r => r.state) }; var g = 0; while (SEVENS.game.state !== "idle" && g++ < 60) SEVENS.step(0.5); ({ mid, line: SEVENS.game.line, visible: SEVENS.game.reels.map(r => r.visible()[1]), win: SEVENS.game.win, credits: SEVENS.game.credits, paid: SEVENS.game.winnerPaid, jackpots: SEVENS.game.stats.jackpots, state: SEVENS.game.state, msg: SEVENS.game.message })');
    check('reels were spinning mid-way', S2.mid.state === 'spinning', S2.mid);
    check('forced B7 B7 DJ at 3 coins pays 5000 and shows on the payline', S2.win === 5000 && S2.credits === 5297 && S2.paid === 5000 && S2.jackpots === 1 && JSON.stringify(S2.visible) === JSON.stringify(['B7', 'B7', 'DJ']) && S2.state === 'idle', S2);
    const S3 = await ev('SEVENS.game.betOne(); SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("b7"); SEVENS.game.spin(); var g = 0; while (SEVENS.game.state !== "idle" && g++ < 60) SEVENS.step(0.5); ({ coins: SEVENS.game.coinsPlayed, win: SEVENS.game.win, credits: SEVENS.game.credits, line: SEVENS.game.line })');
    check('buy-a-pay: three Blazing 7s with ONE coin pays nothing', S3.coins === 1 && S3.win === 0 && S3.credits === 5296, S3);
    const S4 = await ev('SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("bars3"); SEVENS.game.betMax(); var g = 0; while (SEVENS.game.state !== "idle" && g++ < 60) SEVENS.step(0.5); ({ coins: SEVENS.game.coinsPlayed, win: SEVENS.game.win, credits: SEVENS.game.credits })');
    check('bet max re-bets 3 and three triple bars pay 60', S4.coins === 3 && S4.win === 60 && S4.credits === 5296 - 3 + 60, S4);
    const S5 = await ev('SEVENS.DEBUG_FORCE = () => SEVENS.forceStops("none"); SEVENS.game.pullLever(); SEVENS.step(0.1); const pulling = SEVENS.renderer.lever.angle > 0; SEVENS.step(0.3); const spinning = SEVENS.game.state === "spinning"; var g = 0; while (SEVENS.game.state !== "idle" && g++ < 60) SEVENS.step(0.5); ({ pulling, spinning, credits: SEVENS.game.credits, win: SEVENS.game.win })');
    check('lever pull animates then re-bets the last wager (3) and spins', S5.pulling && S5.spinning && S5.credits === 5353 - 3 && S5.win === 0, S5);
    const S6 = await ev('SEVENS.game.cashOut(); SEVENS.step(0.6); const paying = SEVENS.game.state === "cashout" && SEVENS.game.credits < 5350; var g = 0; while (SEVENS.game.state !== "idle" && g++ < 200) SEVENS.step(1); ({ paying, credits: SEVENS.game.credits, msg: SEVENS.game.message, state: SEVENS.game.state })');
    check('cash out pays the hopper down to zero', S6.paying && S6.credits === 0 && /INSERT COIN/.test(S6.msg), S6);
    const S7 = await ev('SEVENS.DEBUG_FORCE = null; SEVENS.game.insertCoins(100); let wins = 0, spins = 0; for (let i = 0; i < 25 && SEVENS.game.credits >= 3; i++) { SEVENS.game.betMax(); spins++; var g = 0; while (SEVENS.game.state !== "idle" && g++ < 80) SEVENS.step(0.5); if (SEVENS.game.win > 0) wins++; const ok = JSON.stringify(SEVENS.game.line) === JSON.stringify(SEVENS.game.reels.map(r => r.visible()[1])); if (!ok) throw new Error("payline mismatch"); } ({ spins, wins, credits: SEVENS.game.credits, stats: SEVENS.game.stats })');
    check('25 random max-coin spins land exactly where the RNG said', S7.spins === 25, S7);
    await wait(300);
    check('no page errors', b.errors.length === 0, b.errors);
  } finally { await b.close(); }
  const failed = results.filter(r => !r.ok).length;
  console.log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
}
main().catch(err => { console.error(err.message || err); process.exit(1); });
