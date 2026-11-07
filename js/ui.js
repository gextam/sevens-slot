/* ============================================================================
   BLAZING 7s — button deck, lever hit area, help overlay, splash, keyboard.
   ========================================================================== */
(function (root) {
  'use strict';
  const S = root.SEVENS, C = S.CONFIG, A = S.audio;
  const $ = id => document.getElementById(id);

  function UI(game, renderer) {
    this.game = game; this.renderer = renderer;
    this.el = { coins: $('btn-coins'), cash: $('btn-cash'), bet1: $('btn-bet1'), spin: $('btn-spin'), max: $('btn-max'), lever: $('lever-hit'),
      help: $('btn-help'), sound: $('btn-sound'), vol: $('vol'), splash: $('splash'), splashText: $('splash-text'), splashBar: $('splash-bar'),
      helpPanel: $('help'), helpBody: $('help-body'), helpClose: $('help-close') };
    this.splashVisible = true; this.helpOpen = false; this.assetsReady = false;
    this.bind();
  }
  const P = UI.prototype;
  P.bind = function () {
    const g = this.game, e = this.el;
    const press = (el, fn) => el.addEventListener('click', ev => { ev.preventDefault(); A.init(); fn(); });
    press(e.coins, () => g.insertCoins(C.coinPack));
    press(e.cash, () => g.cashOut());
    press(e.bet1, () => g.betOne());
    press(e.spin, () => { if (g.state === 'idle') g.spin(); else A.deny(); });
    press(e.max, () => g.betMax());
    press(e.lever, () => g.pullLever());
    press(e.help, () => { A.click(); this.toggleHelp(); });
    press(e.helpClose, () => { A.click(); this.toggleHelp(false); });
    press(e.sound, () => { const m = A.toggleMute(); this.updateSound(); if (!m) A.click(); });
    e.vol.addEventListener('input', () => { A.init(); A.setVolume(parseFloat(e.vol.value)); if (A.muted) { A.setMuted(false); this.updateSound(); } });
    e.splash.addEventListener('pointerdown', () => { if (this.assetsReady) this.start(); });
    root.addEventListener('keydown', ev => {
      if (ev.repeat) return;
      if (ev.code === 'Space' || ev.code === 'Enter') { ev.preventDefault(); A.init(); if (this.splashVisible) { if (this.assetsReady) this.start(); } else if (this.helpOpen) this.toggleHelp(false); else if (g.state === 'idle') g.spin(); return; }
      if (this.splashVisible) return;
      A.init();
      switch (ev.code) {
        case 'Digit1': case 'KeyB': g.betOne(); break;
        case 'Digit3': case 'KeyX': g.betMax(); break;
        case 'KeyL': g.pullLever(); break;
        case 'KeyC': g.cashOut(); break;
        case 'KeyI': g.insertCoins(C.coinPack); break;
        case 'KeyH': case 'KeyP': A.click(); this.toggleHelp(); break;
        case 'KeyM': A.toggleMute(); this.updateSound(); break;
        case 'Escape': this.toggleHelp(false); break;
        default: break;
      }
    });
    e.vol.value = A.volume; this.updateSound();
  };
  P.start = function () { A.init(); this.splashVisible = false; this.el.splash.classList.add('hidden'); this.game.begin(); A.coinIn(); };
  P.setProgress = function (p) { this.el.splashBar.style.width = Math.round(p * 100) + '%'; };
  P.assetsLoaded = function () { this.assetsReady = true; this.el.splashText.textContent = 'PRESS TO PLAY'; this.el.splash.classList.add('ready'); };
  P.refresh = function () {
    const g = this.game, e = this.el, idle = g.state === 'idle';
    const canBet = idle && g.credits >= 1 && !(g.coinsPlayed >= C.maxCoins && !g.betLocked);
    e.bet1.disabled = !canBet; e.max.disabled = !(idle && g.credits >= (g.betLocked ? C.maxCoins : C.maxCoins - g.coinsPlayed));
    e.spin.disabled = !g.canSpin(); e.cash.disabled = !(idle && g.credits > 0); e.coins.disabled = !idle;
    e.spin.classList.toggle('lit', g.canSpin());
    e.bet1.classList.toggle('lit', canBet); e.max.classList.toggle('lit', !e.max.disabled); e.cash.classList.toggle('lit', !e.cash.disabled);
    e.lever.classList.toggle('ready', g.canSpin());
  };
  P.updateSound = function () { this.el.sound.textContent = A.muted ? '🔇' : '🔊'; this.el.sound.classList.toggle('muted', A.muted); };
  P.toggleHelp = function (force) { const open = force == null ? !this.helpOpen : force; this.helpOpen = open; this.el.helpPanel.classList.toggle('hidden', !open); };
  P.buildHelp = function () {
    let html = '<table class="pays"><tr><th>Combination</th><th>1 coin</th><th>2 coins</th><th>3 coins</th></tr>';
    C.paytable.forEach(r => { html += '<tr><td>' + r.label + '</td>' + r.pays.map(p => '<td>' + (p ? p : '—') + '</td>').join('') + '</tr>'; });
    html += '</table><ul class="rules">' + C.rules.map(r => '<li>' + r + '</li>').join('') + '</ul>';
    html += '<p class="small">Theoretical payback ' + C.payback.join('% / ') + '% for 1 / 2 / 3 coins (Bally PAR sheet). Unofficial fan recreation for entertainment only &mdash; play money, no real wagering.</p>';
    this.el.helpBody.innerHTML = html;
  };
  S.UI = UI;
})(window);
