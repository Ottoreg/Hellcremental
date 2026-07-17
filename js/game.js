/* =========================================================================
 * Hellcremental — Logique de jeu
 * État global, génération des niveaux, démon + serviteurs, boucle & rendu.
 * ========================================================================= */

const SAVE_KEY = 'hellcremental_save_v2';
const SAVE_VERSION = 2;

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cam = new Camera();

    // Progression persistante
    this.seed = makeSeed();    // graine du joueur (niveaux reproductibles)
    this.souls = 0;
    this.level = 1;
    this.upgrades = {};        // id -> niveau acheté
    this.totalDestroyed = 0;
    this.bestLevel = 1;

    // État de la vie en cours
    this.phase = 'idle';       // 'playing' | 'exorcised' | 'cleared' | 'idle'
    this.timeLeft = 0;
    this.grid = [];
    this.gridSize = 5;
    this.targets = [];         // cibles vivantes {gx,gy,type,hp,maxHp,bob}
    this.attackers = [];       // démon + serviteurs
    this.particles = [];
    this.floaters = [];        // textes flottants (+âmes)
    this.runDestroyed = 0;
    this.runSouls = 0;
    this.totalToDestroy = 0;

    this.stats = null;
    this.lastTime = 0;
    this.hover = null;
    this.pendingRun = null;    // partie en cours restaurée depuis la sauvegarde
    this._saveThrottle = 0;

    this.load();
    this.onChange = () => {};  // callback UI
    this.onEnd = () => {};     // callback fin de vie
  }

  /* ---------------------- Sauvegarde ---------------------- */

  /* Construit l'objet de sauvegarde complet (progression + partie en cours). */
  buildSaveObject() {
    const obj = {
      version: SAVE_VERSION,
      seed: this.seed,
      souls: this.souls,
      level: this.level,
      upgrades: this.upgrades,
      totalDestroyed: this.totalDestroyed,
      bestLevel: this.bestLevel,
      run: null,
    };
    // On enregistre la partie en cours pour pouvoir la reprendre à l'identique.
    if (this.phase === 'playing') {
      obj.run = {
        level: this.level,
        timeLeft: this.timeLeft,
        gridSize: this.gridSize,
        runDestroyed: this.runDestroyed,
        runSouls: this.runSouls,
        totalToDestroy: this.totalToDestroy,
        targets: this.targets
          .filter(t => !t.dead)
          .map(t => ({ gx: t.gx, gy: t.gy, typeId: t.typeId, hp: t.hp, maxHp: t.maxHp, value: t.value })),
        scorched: this.collectScorched(),
      };
    } else if (this.pendingRun) {
      // Partie restaurée mais pas encore reprise : on la conserve telle quelle.
      obj.run = this.pendingRun;
    }
    return obj;
  }

  collectScorched() {
    const out = [];
    for (let y = 0; y < this.grid.length; y++)
      for (let x = 0; x < this.grid[y].length; x++)
        if (this.grid[y][x].scorched) out.push([x, y]);
    return out;
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.buildSaveObject()));
    } catch (e) { /* stockage indisponible : on ignore */ }
  }

  /* Sauvegarde limitée en fréquence (appelée en continu pendant le jeu). */
  throttledSave(dt) {
    this._saveThrottle -= dt;
    if (this._saveThrottle <= 0) { this._saveThrottle = 2; this.save(); }
  }

  applySaveData(d) {
    if (!d) return false;
    this.seed = (typeof d.seed === 'number') ? d.seed : makeSeed();
    this.souls = d.souls || 0;
    this.level = d.level || 1;
    this.upgrades = d.upgrades || {};
    this.totalDestroyed = d.totalDestroyed || 0;
    this.bestLevel = d.bestLevel || 1;
    this.pendingRun = (d.run && d.run.targets && d.run.targets.length) ? d.run : null;
    return true;
  }

  load() {
    try {
      const d = JSON.parse(localStorage.getItem(SAVE_KEY));
      this.applySaveData(d);
    } catch (e) { /* pas de sauvegarde valide */ }
  }

  /* Y a-t-il une partie en cours à reprendre ? */
  hasResumableRun() { return !!this.pendingRun; }

  reset() {
    localStorage.removeItem(SAVE_KEY);
    this.seed = makeSeed();
    this.souls = 0; this.level = 1; this.upgrades = {};
    this.totalDestroyed = 0; this.bestLevel = 1;
    this.pendingRun = null;
    this.phase = 'idle';
    this.save();
    this.onChange();
  }

  /* ---------------------- Export / Import (transfert d'appareil) ---------------------- */

  /* Encode la sauvegarde en une chaîne texte transférable. */
  exportSave() {
    const json = JSON.stringify(this.buildSaveObject());
    try {
      // Encodage base64 compatible UTF-8.
      return 'HELL1:' + btoa(unescape(encodeURIComponent(json)));
    } catch (e) {
      return 'HELL0:' + json; // repli sans encodage
    }
  }

  /* Restaure une sauvegarde depuis une chaîne exportée. Renvoie true si valide. */
  importSave(str) {
    if (!str) return false;
    str = str.trim();
    let json;
    try {
      if (str.startsWith('HELL1:')) {
        json = decodeURIComponent(escape(atob(str.slice(6))));
      } else if (str.startsWith('HELL0:')) {
        json = str.slice(6);
      } else if (str.startsWith('{')) {
        json = str; // JSON brut accepté
      } else {
        json = decodeURIComponent(escape(atob(str))); // base64 nu
      }
      const d = JSON.parse(json);
      if (typeof d !== 'object' || d === null) return false;
      this.applySaveData(d);
      this.phase = 'idle';
      this.save();
      this.onChange();
      return true;
    } catch (e) {
      return false;
    }
  }

  /* ---------------------- Pouvoirs ---------------------- */
  upgradeLevel(id) { return this.upgrades[id] || 0; }

  upgradeCost(def) {
    const n = this.upgradeLevel(def.id);
    return Math.floor(def.baseCost * Math.pow(def.mult, n));
  }

  buyUpgrade(id) {
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return false;
    const n = this.upgradeLevel(id);
    if (n >= def.max) return false;
    const cost = this.upgradeCost(def);
    if (this.souls < cost) return false;
    this.souls -= cost;
    this.upgrades[id] = n + 1;
    this.save();
    // Applique à chaud si une vie est en cours.
    if (this.phase === 'playing') this.computeStats(false);
    this.onChange();
    return true;
  }

  /* Calcule les stats du démon à partir des pouvoirs achetés. */
  computeStats(resetLifespan = true) {
    const s = {
      damage: CONFIG.BASE_DAMAGE,
      attackInterval: CONFIG.BASE_ATTACK_INTERVAL,
      moveSpeed: CONFIG.BASE_MOVE_SPEED,
      lifespan: CONFIG.BASE_LIFESPAN,
      clickDamage: CONFIG.BASE_CLICK_DAMAGE,
      splash: 0, soulMult: 1, minions: 0,
    };
    for (const def of UPGRADES) {
      const n = this.upgradeLevel(def.id);
      if (n > 0) def.apply(s, n);
    }
    const prevMax = this.stats ? this.stats.lifespan : s.lifespan;
    this.stats = s;
    if (resetLifespan) this.timeLeft = s.lifespan;
    else if (this.timeLeft > 0) {
      // Ajuste la survie restante si la longévité a augmenté en cours de vie.
      this.timeLeft += Math.max(0, s.lifespan - prevMax);
    }
    return s;
  }

  /* ---------------------- Génération de niveau ---------------------- */
  pickThemeFor(level) {
    let theme = LEVEL_THEMES[0];
    for (const t of LEVEL_THEMES) if (level >= t.min) theme = t;
    return theme;
  }
  pickTheme() { return this.pickThemeFor(this.level); }

  /* Génère de façon DÉTERMINISTE la disposition d'un niveau à partir de la
   * graine du joueur. Le même (graine, niveau) produit toujours le même niveau,
   * ce qui rend la partie reproductible sur n'importe quel appareil.
   * Renvoie { gridSize, targets } (données brutes, sans état de rendu). */
  generateLevel(level) {
    const theme = this.pickThemeFor(level);
    const pool = this.buildWeightedPool(theme.pool);
    const hpMult = 1 + (level - 1) * 0.35;
    const valMult = 1 + (level - 1) * 0.28;
    const density = Math.min(0.72, 0.42 + level * 0.02);

    // On tente plusieurs graines dérivées (déterministes) jusqu'à obtenir assez
    // de cibles — le résultat reste identique sur tous les appareils.
    for (let attempt = 0; attempt < 12; attempt++) {
      const rand = seededRandom(this.seed, level, attempt);
      const size = Math.min(CONFIG.GRID_MAX, CONFIG.GRID_MIN + Math.floor((level - 1) / 2));
      const targets = [];
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (rand() > density) continue;
          if (x <= 1 && y <= 1) continue; // coin libre pour l'apparition du démon
          const typeId = pool[Math.floor(rand() * pool.length)];
          const def = TARGET_TYPES[typeId];
          const hp = Math.ceil(def.hp * hpMult);
          targets.push({ gx: x, gy: y, typeId, hp, maxHp: hp, value: Math.ceil(def.value * valMult) });
        }
      }
      if (targets.length >= 3) return { gridSize: size, targets };
    }
    // Repli extrêmement improbable.
    return { gridSize: CONFIG.GRID_MIN, targets: [] };
  }

  /* Construit la grille + les cibles jouables à partir de données brutes. */
  buildRunState(gridSize, rawTargets, scorched) {
    this.gridSize = gridSize;
    this.grid = [];
    for (let y = 0; y < gridSize; y++) {
      const row = [];
      for (let x = 0; x < gridSize; x++) row.push({ scorched: false, occupied: false });
      this.grid.push(row);
    }
    if (scorched) for (const [x, y] of scorched)
      if (this.grid[y] && this.grid[y][x]) this.grid[y][x].scorched = true;

    this.targets = rawTargets.map(t => ({
      gx: t.gx, gy: t.gy, typeId: t.typeId, def: TARGET_TYPES[t.typeId],
      hp: t.hp, maxHp: t.maxHp, value: t.value,
      bob: Math.random() * Math.PI * 2, shake: 0, dead: false, deathT: 0,
    }));
    for (const t of this.targets)
      if (this.grid[t.gy] && this.grid[t.gy][t.gx]) this.grid[t.gy][t.gx].occupied = true;

    this.particles = [];
    this.floaters = [];
    this.attackers = [];
    this.attackers.push(this.makeAttacker(true));
    for (let i = 0; i < this.stats.minions; i++) this.attackers.push(this.makeAttacker(false));
  }

  /* Démarre une nouvelle vie sur le niveau courant (niveau frais). */
  startRun() {
    this.pendingRun = null;
    this.computeStats(true);
    const gen = this.generateLevel(this.level);
    this.buildRunState(gen.gridSize, gen.targets, null);
    this.totalToDestroy = this.targets.length;
    this.runDestroyed = 0;
    this.runSouls = 0;
    this.phase = 'playing';
    this.refitCamera();
    this.save();
    this.onChange();
  }

  /* Recadre la caméra sur la grille. Le HUD n'étant plus qu'une petite pastille
   * dans un coin, la grille peut occuper tout l'espace disponible. */
  refitCamera() {
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (!w || !h) return;
    this.cam.fit(this.gridSize, w, h, 0);
  }

  /* Reprend une partie sauvegardée (éventuellement depuis un autre appareil). */
  resumeRun() {
    const r = this.pendingRun;
    if (!r) { return this.startRun(); }
    this.pendingRun = null;
    this.level = r.level || this.level;
    this.computeStats(false);
    this.buildRunState(r.gridSize, r.targets, r.scorched);
    this.totalToDestroy = r.totalToDestroy || (this.targets.length + (r.runDestroyed || 0));
    this.runDestroyed = r.runDestroyed || 0;
    this.runSouls = r.runSouls || 0;
    this.timeLeft = (typeof r.timeLeft === 'number' && r.timeLeft > 0) ? r.timeLeft : this.stats.lifespan;
    this.phase = 'playing';
    this.refitCamera();
    this.save();
    this.onChange();
  }

  buildWeightedPool(poolDef) {
    const arr = [];
    for (const [id, w] of Object.entries(poolDef))
      for (let i = 0; i < w; i++) arr.push(id);
    return arr;
  }

  makeAttacker(isDemon) {
    return {
      isDemon,
      gx: isDemon ? 0.4 : Math.random() * 0.8,
      gy: isDemon ? 0.4 : Math.random() * 0.8,
      target: null,
      cooldown: 0,
      bob: Math.random() * Math.PI * 2,
      lunge: 0,
    };
  }

  /* ---------------------- Boucle de mise à jour ---------------------- */
  update(dt) {
    // Particules et textes flottants tournent en permanence.
    this.updateEffects(dt);
    if (this.phase !== 'playing') return;

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) { this.timeLeft = 0; return this.endRun(false); }
    this.throttledSave(dt); // persiste régulièrement la partie en cours

    const s = this.stats;
    for (const a of this.attackers) {
      a.bob += dt * 6;
      if (a.lunge > 0) a.lunge = Math.max(0, a.lunge - dt * 4);

      // (Re)cible si nécessaire.
      if (!a.target || a.target.dead) a.target = this.nearestTarget(a);
      if (!a.target) continue;

      const t = a.target;
      const dx = t.gx - a.gx, dy = t.gy - a.gy;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.75) {
        // Se déplace vers la cible.
        const step = s.moveSpeed * dt;
        const move = Math.min(step, dist);
        a.gx += (dx / dist) * move;
        a.gy += (dy / dist) * move;
      } else {
        // À portée : frappe.
        a.cooldown -= dt;
        if (a.cooldown <= 0) {
          a.cooldown = s.attackInterval;
          a.lunge = 1;
          const dmg = a.isDemon ? s.damage : Math.max(1, s.damage * 0.5);
          this.hitTarget(t, dmg, a);
        }
      }
    }

    // Progression : tout détruit -> niveau nettoyé.
    if (this.runDestroyed >= this.totalToDestroy) this.endRun(true);
  }

  nearestTarget(a) {
    let best = null, bd = Infinity;
    for (const t of this.targets) {
      if (t.dead) continue;
      const d = (t.gx - a.gx) ** 2 + (t.gy - a.gy) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  hitTarget(t, dmg, source) {
    if (t.dead) return;
    t.hp -= dmg;
    t.shake = 0.25;
    this.spawnHitParticles(t);

    // Souffle de feu : dégâts de zone aux cibles adjacentes.
    if (this.stats.splash > 0 && source && source.isDemon) {
      for (const o of this.targets) {
        if (o === t || o.dead) continue;
        if (Math.abs(o.gx - t.gx) <= 1 && Math.abs(o.gy - t.gy) <= 1) {
          o.hp -= dmg * this.stats.splash;
          o.shake = 0.2;
          if (o.hp <= 0) this.destroyTarget(o);
        }
      }
    }
    if (t.hp <= 0) this.destroyTarget(t);
  }

  destroyTarget(t) {
    if (t.dead) return;
    t.dead = true; t.deathT = 0.5;
    const gain = Math.max(1, Math.round(t.value * this.stats.soulMult));
    this.souls += gain;
    this.runSouls += gain;
    this.runDestroyed++;
    this.totalDestroyed++;
    if (this.grid[t.gy] && this.grid[t.gy][t.gx]) {
      this.grid[t.gy][t.gx].scorched = true;
      this.grid[t.gy][t.gx].occupied = false;
    }
    this.spawnDeathBurst(t);
    this.addFloater(t.gx, t.gy, `+${gain}`, t.def.living ? '#ff6b9d' : '#ffcc4d');
    this.save();
    this.onChange();
  }

  /* Clic infernal du joueur sur une case. */
  clickAt(sx, sy) {
    if (this.phase !== 'playing') return;
    const t = this.targetAtScreen(sx, sy);
    if (!t) return;
    // Redirige le démon et inflige des dégâts de clic.
    this.attackers[0].target = t;
    this.hitTarget(t, this.stats.clickDamage, this.attackers[0]);
    this.spawnClickBurst(t);
  }

  targetAtScreen(sx, sy) {
    const w = this.cam.screenToWorld(sx, sy);
    const g = Iso.toGrid(w.x, w.y);
    const cx = Math.round(g.gx), cy = Math.round(g.gy);
    let best = null, bd = 1.2;
    for (const t of this.targets) {
      if (t.dead) continue;
      const d = Math.hypot(t.gx - g.gx, t.gy - g.gy);
      if ((t.gx === cx && t.gy === cy) || d < bd) {
        if (d < bd) { bd = d; best = t; }
      }
    }
    return best;
  }

  updateHover(sx, sy) {
    if (this.phase !== 'playing') { this.hover = null; return; }
    this.hover = this.targetAtScreen(sx, sy);
  }

  /* ---------------------- Fin de vie ---------------------- */
  endRun(cleared) {
    if (this.phase !== 'playing') return;
    const result = {
      cleared,
      destroyed: this.runDestroyed,
      total: this.totalToDestroy,
      souls: this.runSouls,
      level: this.level,
    };
    if (cleared) {
      // Bonus de nettoyage puis passage au niveau suivant.
      const bonus = Math.round(this.runSouls * 0.5 + this.level * 5);
      this.souls += bonus;
      result.bonus = bonus;
      this.level++;
      this.bestLevel = Math.max(this.bestLevel, this.level);
      this.phase = 'cleared';
    } else {
      this.phase = 'exorcised';
    }
    this.save();
    this.onChange();
    this.onEnd(result);
  }

  /* ---------------------- Effets visuels ---------------------- */
  updateEffects(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vx *= 0.94; p.vy += p.g * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i];
      f.life -= dt; f.y -= dt * 26;
      if (f.life <= 0) this.floaters.splice(i, 1);
    }
    for (const t of this.targets) {
      if (t.shake > 0) t.shake = Math.max(0, t.shake - dt);
      if (t.dead && t.deathT > 0) t.deathT = Math.max(0, t.deathT - dt);
      t.bob += dt * 2;
    }
  }

  worldOf(t) { return Iso.toScreen(t.gx, t.gy); }

  spawnHitParticles(t) {
    const w = this.worldOf(t);
    for (let i = 0; i < 4; i++) {
      this.particles.push({
        x: w.x, y: w.y - 14, vx: (Math.random() - 0.5) * 60,
        vy: -Math.random() * 60 - 10, g: 140, life: 0.4,
        color: Math.random() < 0.5 ? '#ff7b00' : '#ffd24d', size: 3,
      });
    }
  }
  spawnDeathBurst(t) {
    const w = this.worldOf(t);
    const col = t.def.living ? ['#ff2d6b', '#c1121f', '#ff6b9d'] : ['#ff7b00', '#ffd24d', '#8a3b00'];
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 90;
      this.particles.push({
        x: w.x, y: w.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 30,
        g: 160, life: 0.5 + Math.random() * 0.4,
        color: col[Math.floor(Math.random() * col.length)], size: 2 + Math.random() * 3,
      });
    }
  }
  spawnClickBurst(t) {
    const w = this.worldOf(t);
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2;
      this.particles.push({
        x: w.x, y: w.y - 14, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
        g: 100, life: 0.35, color: '#a855f7', size: 3,
      });
    }
  }
  addFloater(gx, gy, text, color) {
    const w = Iso.toScreen(gx, gy);
    this.floaters.push({ x: w.x, y: w.y - 26, text, color, life: 1 });
  }

  /* ---------------------- Rendu ---------------------- */
  render() {
    const ctx = this.ctx, cam = this.cam;
    const dpr = this.dpr || 1;

    // Nettoie tout le canevas (en pixels périphériques), puis dessine à
    // l'échelle CSS via la transformation HiDPI (indispensable sur mobile).
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.phase === 'idle') { return; }

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // --- Sol : losanges ---
    for (let y = 0; y < this.gridSize; y++) {
      for (let x = 0; x < this.gridSize; x++) {
        const w = Iso.toScreen(x, y);
        const p = cam.worldToScreen(w.x, w.y);
        const cell = this.grid[y][x];
        const dark = (x + y) % 2 === 0;
        let fill = cell.scorched ? (dark ? '#2a1410' : '#33150f') : (dark ? '#3d5a3a' : '#456a41');
        const hovered = this.hover && this.hover.gx === x && this.hover.gy === y;
        this.diamondScaled(ctx, p.x, p.y, fill, 'rgba(0,0,0,0.25)');
        if (hovered) this.diamondScaled(ctx, p.x, p.y, 'rgba(168,85,247,0.28)', '#a855f7');
      }
    }

    // --- Objets + attaquants triés par profondeur (gx+gy) ---
    const drawList = [];
    for (const t of this.targets) {
      if (t.dead && t.deathT <= 0) continue;
      drawList.push({ depth: t.gx + t.gy, kind: 'target', ref: t });
    }
    for (const a of this.attackers)
      drawList.push({ depth: a.gx + a.gy + 0.01, kind: 'attacker', ref: a });
    drawList.sort((p, q) => p.depth - q.depth);

    for (const item of drawList) {
      if (item.kind === 'target') this.drawTarget(ctx, item.ref);
      else this.drawAttacker(ctx, item.ref);
    }

    // --- Particules ---
    for (const p of this.particles) {
      const s = cam.worldToScreen(p.x, p.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, p.size * cam.scale, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // --- Textes flottants ---
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const s = cam.worldToScreen(f.x, f.y);
      ctx.globalAlpha = Math.max(0, Math.min(1, f.life));
      ctx.font = `bold ${Math.round(16 * cam.scale)}px Georgia, serif`;
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(f.text, s.x, s.y);
      ctx.fillText(f.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  diamondScaled(ctx, cx, cy, fill, stroke) {
    const hw = (CONFIG.TILE_W / 2) * this.cam.scale;
    const hh = (CONFIG.TILE_H / 2) * this.cam.scale;
    ctx.beginPath();
    ctx.moveTo(cx, cy - hh);
    ctx.lineTo(cx + hw, cy);
    ctx.lineTo(cx, cy + hh);
    ctx.lineTo(cx - hw, cy);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
  }

  drawTarget(ctx, t) {
    const w = Iso.toScreen(t.gx, t.gy);
    const p = this.cam.worldToScreen(w.x, w.y);
    const scale = this.cam.scale;
    const size = Math.round(30 * scale);

    if (t.dead) {
      // Effet de destruction : rétrécit et s'estompe.
      const k = t.deathT / 0.5;
      ctx.globalAlpha = k;
      ctx.font = `${Math.round(size * k)}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('💀', p.x, p.y - 10 * scale);
      ctx.globalAlpha = 1;
      return;
    }

    const shakeX = t.shake > 0 ? (Math.random() - 0.5) * 6 * scale : 0;
    const bobY = Math.sin(t.bob) * 2 * scale;

    // Ombre.
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * scale, 14 * scale, 6 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.def.emoji, p.x + shakeX, p.y - 14 * scale + bobY);

    // Barre de vie si endommagé.
    if (t.hp < t.maxHp) {
      const bw = 26 * scale, bh = 4 * scale;
      const bx = p.x - bw / 2, by = p.y - 34 * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      const frac = Math.max(0, t.hp / t.maxHp);
      ctx.fillStyle = frac > 0.5 ? '#7bd47b' : frac > 0.25 ? '#ffcc4d' : '#ff5c5c';
      ctx.fillRect(bx, by, bw * frac, bh);
    }
  }

  drawAttacker(ctx, a) {
    const w = Iso.toScreen(a.gx, a.gy);
    const p = this.cam.worldToScreen(w.x, w.y);
    const scale = this.cam.scale;
    const size = Math.round((a.isDemon ? 34 : 24) * scale);
    const bobY = Math.sin(a.bob) * 2.5 * scale;
    const lungeY = a.lunge * 6 * scale;

    // Ombre.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * scale, (a.isDemon ? 15 : 11) * scale, (a.isDemon ? 7 : 5) * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura du démon.
    if (a.isDemon) {
      const grd = ctx.createRadialGradient(p.x, p.y - 16 * scale, 2, p.x, p.y - 16 * scale, 26 * scale);
      grd.addColorStop(0, 'rgba(255,60,0,0.35)');
      grd.addColorStop(1, 'rgba(255,60,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 16 * scale, 26 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(a.isDemon ? '😈' : '👿', p.x, p.y - 16 * scale + bobY - lungeY);
  }
}
