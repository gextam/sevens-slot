/* ============================================================================
   BLAZING 7s — bootstrap, frame loop, virtual clock and test hooks.
   ?force=jackpot | b7 | r7 | any7 | bars3 | bars | blanks | none   ?mute=1
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS, C = S.CONFIG;

  /* find a physical stop index on reel r whose symbol is `sym` */
  const stopOf = (r, sym) => { const i = C.strips[r].indexOf(sym); return i < 0 ? 0 : i; };
  S.forceStops = function (name) {
    const map = {
      jackpot: ['B7', 'B7', 'DJ'], b7: ['B7', 'B7', 'B7'], r7: ['R7', 'R7', 'R7'], any7: ['B7', 'R7', 'R7'],
      bars3: ['B3', 'B3', 'B3'], bars: ['B1', 'B2', 'B3'], blanks: ['BL', 'BL', 'BL'], none: ['B1', 'BL', 'R7'], dj: ['B2', 'B2', 'DJ']
    };
    const line = map[name]; if (!line) return null;
    return line.map((sym, r) => stopOf(r, sym));
  };
  function setupDebug() {
    const q = new URLSearchParams(root.location.search), f = q.get('force');
    if (f) S.DEBUG_FORCE = () => S.forceStops(f);
  }

  root.addEventListener('load', () => {
    const canvas = document.getElementById('game');
    const game = new S.Game(), renderer = new S.Renderer(canvas, game);
    game.renderer = renderer;
    const ui = new S.UI(game, renderer);
    S.game = game; S.renderer = renderer; S.ui = ui;
    setupDebug();

    S.assets.load(p => ui.setProgress(p)).then(() => { S.assets.prepareSymbols(740, 340); ui.buildHelp(); ui.assetsLoaded(); });

    S.timeOffset = 0;
    const clock = () => performance.now() / 1000 + S.timeOffset;
    let last = clock();
    function tick(now, dt, draw) { game.update(now, dt); S.fx.update(dt); renderer.update(dt); if (draw) { renderer.draw(now, dt); ui.refresh(); } }
    function frame() { const now = clock(), dt = Math.min(0.05, Math.max(0, now - last)); last = now; tick(now, dt, true); requestAnimationFrame(frame); }
    requestAnimationFrame(frame);
    /* deterministic stepping for automated tests */
    S.step = function (seconds) { const h = 1 / 60, n = Math.max(1, Math.round(seconds / h)); for (let i = 0; i < n; i++) { S.timeOffset += h; const now = clock(); last = now; tick(now, h, i === n - 1); } };
    document.addEventListener('visibilitychange', () => { if (!document.hidden && S.audio.ctx) S.audio.ctx.resume(); });
  });
})(window);
