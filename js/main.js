/* =========================================================================
 * Hellcremental — Point d'entrée : initialisation, redimensionnement,
 * gestion des entrées et boucle d'animation.
 * ========================================================================= */

(function () {
  const canvas = document.getElementById('game');
  const game = new Game(canvas);
  const ui = new UI(game);
  window.__g = game; // accès console pour le débogage

  // Recâble les callbacks du jeu vers l'UI.
  game.onChange = () => ui.refresh();
  game.onEnd = (r) => ui.showResult(r);

  /* ---- Redimensionnement (gestion HiDPI) ---- */
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    game.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (game.phase !== 'idle') game.cam.fit(game.gridSize, w, h);
  }
  window.addEventListener('resize', resize);

  /* ---- Entrées souris/tactile ---- */
  function evtPos(e) {
    const rect = canvas.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }
  canvas.addEventListener('mousedown', (e) => {
    const p = evtPos(e);
    game.clickAt(p.x, p.y);
  });
  canvas.addEventListener('mousemove', (e) => {
    const p = evtPos(e);
    game.updateHover(p.x, p.y);
  });
  canvas.addEventListener('mouseleave', () => { game.hover = null; });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const p = evtPos(e);
    game.clickAt(p.x, p.y);
  }, { passive: false });

  /* ---- Boucle d'animation ---- */
  function frame(now) {
    const dt = Math.min(0.05, (now - (game.lastTime || now)) / 1000);
    game.lastTime = now;
    game.update(dt);
    game.render();
    if (game.phase === 'playing') ui.refresh();
    requestAnimationFrame(frame);
  }

  // Démarrage.
  resize();
  ui.buildShop();
  ui.refresh();
  requestAnimationFrame(frame);
})();
