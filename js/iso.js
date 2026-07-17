/* =========================================================================
 * Hellcremental — Rendu isométrique
 * Conversion grille <-> écran et dessin de la scène sur le canvas.
 * ========================================================================= */

const Iso = {
  /* Position écran (avant caméra) du centre d'une tuile (gx, gy) flottants. */
  toScreen(gx, gy) {
    return {
      x: (gx - gy) * (CONFIG.TILE_W / 2),
      y: (gx + gy) * (CONFIG.TILE_H / 2),
    };
  },

  /* Conversion inverse : coordonnées "monde iso" -> case de grille. */
  toGrid(wx, wy) {
    const hw = CONFIG.TILE_W / 2;
    const hh = CONFIG.TILE_H / 2;
    return {
      gx: (wx / hw + wy / hh) / 2,
      gy: (wy / hh - wx / hw) / 2,
    };
  },

  /* Dessine un losange (tuile de sol) centré en (cx, cy). */
  diamond(ctx, cx, cy, fill, stroke) {
    const hw = CONFIG.TILE_W / 2;
    const hh = CONFIG.TILE_H / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  },
};

/* -------------------------------------------------------------------------
 * Caméra : centre et met à l'échelle la grille pour qu'elle tienne à l'écran.
 * ------------------------------------------------------------------------- */
class Camera {
  constructor() { this.ox = 0; this.oy = 0; this.scale = 1; }

  fit(gridSize, viewW, viewH) {
    // Emprise de la grille en coordonnées monde iso.
    const worldW = gridSize * CONFIG.TILE_W;
    const worldH = gridSize * CONFIG.TILE_H + 80; // marge pour la hauteur des objets
    const pad = 40;
    this.scale = Math.min(
      (viewW - pad) / worldW,
      (viewH - pad) / worldH,
      1.15
    );
    this.scale = Math.max(this.scale, 0.35);
    // Centre : le milieu de la grille (en gx=gy=(size-1)/2) doit être au centre.
    const mid = Iso.toScreen((gridSize - 1) / 2, (gridSize - 1) / 2);
    this.ox = viewW / 2 - mid.x * this.scale;
    this.oy = viewH / 2 - mid.y * this.scale - 10 * this.scale;
  }

  worldToScreen(wx, wy) {
    return { x: this.ox + wx * this.scale, y: this.oy + wy * this.scale };
  }

  screenToWorld(sx, sy) {
    return { x: (sx - this.ox) / this.scale, y: (sy - this.oy) / this.scale };
  }
}
