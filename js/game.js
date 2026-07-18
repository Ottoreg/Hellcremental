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
    this.bolts = [];           // éclairs (sort Foudre)
    this.impacts = [];         // impacts de météore (sort Météore)
    this.fires = [];           // nappes de feu (Voie du Clic)
    this.fireCooldown = 0;     // anti-spam des nappes de feu
    this.abilityCooldowns = {}; // recharge des sorts actifs
    this.priestDrain = 0;      // accélération d'exorcisme due aux prêtres
    this.runDestroyed = 0;
    this.runSouls = 0;
    this.totalToDestroy = 0;

    this.stats = null;
    this.lastTime = 0;
    this.hover = null;
    this.pendingRun = null;    // partie en cours restaurée depuis la sauvegarde
    this.paused = false;       // vrai quand on est sur la vue boutique
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

  /* Parent d'un pacte dans l'arbre (null pour les branches issues du démon). */
  parentOf(id) {
    const node = SKILL_TREE.find(n => n.id === id);
    return node ? node.parent : null;
  }

  /* Un pacte est débloqué si sa branche part du démon, si son parent a atteint
   * le niveau requis, ET si aucune voie rivale exclusive n'a déjà été choisie. */
  isUnlocked(id) {
    const node = SKILL_TREE.find(n => n.id === id);
    if (!node) return true;
    // Voies exclusives : choisir l'une verrouille les autres du même groupe.
    if (node.group) {
      const rival = SKILL_TREE.some(o =>
        o.group === node.group && o.id !== id && this.upgradeLevel(o.id) >= 1);
      if (rival) return false;
    }
    const parent = node.parent;
    if (!parent || parent === 'root') return true;
    return this.upgradeLevel(parent) >= (node.req || 1);
  }

  buyUpgrade(id) {
    const def = UPGRADES.find(u => u.id === id);
    if (!def) return false;
    if (!this.isUnlocked(id)) return false; // parent pas encore invoqué
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
      splash: 0, soulMult: 1, minions: 0, demolisher: 0,
      minionDmgBonus: 0, voieMagie: 0, voieLegion: 0, foudre: 0,
      voieClic: 0, fireWave: 0,
      minionSpeed: 0, demoDmgBonus: 0, demoSpeed: 0,
      vagabond: 0, vagabondDmg: 0, vagabondSpeed: 0, stormling: 0,
      meteore: 0, huntPriests: 0,
    };
    for (const def of UPGRADES) {
      const n = this.upgradeLevel(def.id);
      if (n > 0) def.apply(s, n);
    }
    // Le clic infernal n'est actif qu'une fois le pacte Clic Cataclysmique pris.
    s.clickUnlocked = this.upgradeLevel('cataclysme') > 0;
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
    const boss = isBossLevel(level);
    const nPriests = Math.min(6, Math.floor(level / 4) + (boss ? 2 : 0));

    // On tente plusieurs graines dérivées (déterministes) jusqu'à obtenir assez
    // de cibles — le résultat reste identique sur tous les appareils.
    for (let attempt = 0; attempt < 12; attempt++) {
      const rand = seededRandom(this.seed, level, attempt);
      const size = Math.min(CONFIG.GRID_MAX, CONFIG.GRID_MIN + Math.floor((level - 1) / 2));
      const used = new Set();
      const targets = [];
      const push = (x, y, typeId, hpFactor, valFactor) => {
        const def = TARGET_TYPES[typeId];
        const hp = Math.ceil(def.hp * hpMult * (hpFactor || 1));
        targets.push({ gx: x, gy: y, typeId, hp, maxHp: hp, value: Math.ceil(def.value * valMult * (valFactor || 1)) });
        used.add(x + ',' + y);
      };

      // Boss au centre (tous les 10 niveaux).
      if (boss) {
        const bid = BOSS_POOL[Math.floor(rand() * BOSS_POOL.length)];
        push(Math.floor(size / 2), Math.floor(size / 2), bid, BOSS_HP_FACTOR, 3);
      }

      // Prêtres sur des cases libres.
      let placed = 0, guard = 0;
      while (placed < nPriests && guard++ < size * size * 3) {
        const x = Math.floor(rand() * size), y = Math.floor(rand() * size);
        if ((x <= 1 && y <= 1) || used.has(x + ',' + y)) continue;
        push(x, y, 'pretre', 1.3, 1);
        placed++;
      }

      // Cibles ordinaires sur le reste de la grille.
      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          if (used.has(x + ',' + y)) continue;
          if (rand() > density) continue;
          if (x <= 1 && y <= 1) continue; // coin libre pour l'apparition du démon
          push(x, y, pool[Math.floor(rand() * pool.length)], 1, 1);
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

    this.targets = rawTargets.map(t => {
      const priest = t.typeId === 'pretre';
      const boss = typeof t.typeId === 'string' && t.typeId.startsWith('boss_');
      return {
        gx: t.gx, gy: t.gy, typeId: t.typeId, def: TARGET_TYPES[t.typeId],
        hp: t.hp, maxHp: t.maxHp, value: t.value,
        priest, drain: priest ? PRIEST_DRAIN : 0,
        boss, scale: boss ? BOSS_SCALE : 1,
        bob: Math.random() * Math.PI * 2, shake: 0, dead: false, deathT: 0,
      };
    });
    for (const t of this.targets)
      if (this.grid[t.gy] && this.grid[t.gy][t.gx]) this.grid[t.gy][t.gx].occupied = true;

    this.particles = [];
    this.floaters = [];
    this.bolts = [];
    this.impacts = [];
    this.fires = [];
    this.fireCooldown = 0;
    this.abilityCooldowns = {};
    this.attackers = [];
    this.attackers.push(this.makeAttacker('demon'));
    for (let i = 0; i < this.stats.minions; i++) this.attackers.push(this.makeAttacker('minion'));
    if (this.stats.demolisher > 0) this.attackers.push(this.makeAttacker('demolisher'));
    for (let i = 0; i < this.stats.vagabond; i++) this.attackers.push(this.makeAttacker('vagabond'));
    for (let i = 0; i < this.stats.stormling; i++) this.attackers.push(this.makeAttacker('stormling'));
  }

  /* ---------------------- Sorts actifs ---------------------- */
  abilityCooldownMax(id) {
    const a = ACTIVE_ABILITIES[id];
    return a ? a.cooldown(this.upgradeLevel(id)) : 10;
  }
  abilityReady(id) { return (this.abilityCooldowns[id] || 0) <= 0; }

  /* Déclenche un sort actif (renvoie true si lancé). */
  activateAbility(id) {
    if (this.phase !== 'playing' || this.paused) return false;
    if (this.upgradeLevel(id) <= 0 || !this.abilityReady(id)) return false;
    if (id === 'foudre') this.castFoudre();
    else if (id === 'meteore') this.castMeteore();
    this.abilityCooldowns[id] = this.abilityCooldownMax(id);
    return true;
  }

  /* Météore : s'abat sur une zone 3×3 (9 cases) au hasard, gros dégâts. */
  castMeteore() {
    const s = this.stats;
    const n = Math.max(1, s.meteore);
    const alive = this.targets.filter(t => !t.dead);
    if (!alive.length) return;
    // Centre sur une case occupée au hasard (pour toucher quelque chose).
    const c = alive[Math.floor(Math.random() * alive.length)];
    const dmg = Math.round(s.damage * (8 + n * 2));
    this.spawnMeteor(c.gx, c.gy);
    for (const t of this.targets) {
      if (t.dead) continue;
      if (Math.abs(t.gx - c.gx) <= 1 && Math.abs(t.gy - c.gy) <= 1) { // 3×3 = 9 cases
        t.hp -= dmg; t.shake = 0.3;
        if (t.hp <= 0) this.destroyTarget(t);
      }
    }
  }

  spawnMeteor(gx, gy) {
    this.impacts.push({ gx, gy, life: 0.6, max: 0.6 });
    const w = Iso.toScreen(gx, gy);
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 160;
      this.particles.push({
        x: w.x, y: w.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        g: 170, life: 0.5 + Math.random() * 0.5,
        color: ['#ff7b00', '#ffd24d', '#c1121f', '#8a3b00'][Math.floor(Math.random() * 4)],
        size: 2 + Math.random() * 3,
      });
    }
    this.addFloater(gx, gy, '🌠', '#ffb04d');
  }

  /* Foudre : frappe plusieurs cases occupées au hasard pour de lourds dégâts. */
  castFoudre() {
    const s = this.stats;
    const n = Math.max(1, s.foudre);
    const strikes = 2 + n;
    const dmg = Math.round(s.damage * (4 + n * 1.5));
    const alive = this.targets.filter(t => !t.dead);
    for (let i = 0; i < strikes && alive.length; i++) {
      const idx = Math.floor(Math.random() * alive.length);
      const t = alive.splice(idx, 1)[0];
      this.spawnLightning(t);
      this.hitTarget(t, dmg, null); // dégâts directs (pas de propagation)
    }
  }

  spawnLightning(t, small) {
    this.bolts.push({ gx: t.gx, gy: t.gy, life: small ? 0.28 : 0.35, seed: Math.random() * 1000, small: !!small });
    const w = this.worldOf(t);
    const count = small ? 7 : 14;
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, sp = (small ? 25 : 40) + Math.random() * (small ? 70 : 130);
      this.particles.push({
        x: w.x, y: w.y - 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        g: 150, life: 0.3 + Math.random() * 0.3,
        color: Math.random() < 0.5 ? '#cfefff' : '#ffffff', size: (small ? 1.5 : 2) + Math.random() * 2,
      });
    }
    if (!small) this.addFloater(t.gx, t.gy, '⚡', '#cfefff');
  }

  spawnPlagueParticle(a, radius) {
    const ang = Math.random() * Math.PI * 2, r = Math.random() * radius;
    const w = Iso.toScreen(a.gx + Math.cos(ang) * r, a.gy + Math.sin(ang) * r);
    this.particles.push({
      x: w.x, y: w.y - 8, vx: (Math.random() - 0.5) * 14, vy: -8 - Math.random() * 16,
      g: -8, life: 0.6 + Math.random() * 0.5,
      color: Math.random() < 0.5 ? '#7bd47b' : '#4a9d5a', size: 2 + Math.random() * 2,
    });
  }

  spawnFireParticle(f) {
    const ang = Math.random() * Math.PI * 2, r = Math.random() * f.radius;
    const w = Iso.toScreen(f.gx + Math.cos(ang) * r, f.gy + Math.sin(ang) * r);
    this.particles.push({
      x: w.x, y: w.y - 6, vx: (Math.random() - 0.5) * 22, vy: -28 - Math.random() * 40,
      g: -30, life: 0.5 + Math.random() * 0.4,
      color: Math.random() < 0.5 ? '#ff7b00' : '#ffd24d', size: 2 + Math.random() * 2,
    });
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

  makeAttacker(kind) {
    const isDemon = kind === 'demon';
    const g = this.gridSize || 5;
    const a = {
      kind,
      isDemon,
      isDemolisher: kind === 'demolisher',
      isVagabond: kind === 'vagabond',
      isStormling: kind === 'stormling',
      gx: isDemon ? 0.4 : Math.random() * 0.8,
      gy: isDemon ? 0.4 : Math.random() * 0.8,
      target: null,
      cooldown: 0,
      bob: Math.random() * Math.PI * 2,
      lunge: 0,
    };
    if (a.isVagabond) {
      // Erre n'importe où sur la grille.
      a.gx = Math.random() * g; a.gy = Math.random() * g;
      a.wx = Math.random() * (g - 1); a.wy = Math.random() * (g - 1);
      a.plagueTick = 0;
    }
    if (a.isStormling) {
      // Immobile, posé quelque part sur la grille.
      a.gx = Math.random() * (g - 1); a.gy = Math.random() * (g - 1);
      a.cooldown = Math.random(); // décalage initial
    }
    return a;
  }

  /* ---------------------- Boucle de mise à jour ---------------------- */
  update(dt) {
    // Particules et textes flottants tournent en permanence.
    this.updateEffects(dt);
    if (this.phase !== 'playing') return;
    // Sur la vue boutique, le jeu est gelé : ni chrono, ni démon.
    if (this.paused) return;

    // Les prêtres encore vivants accélèrent l'exorcisme (drainent la survie).
    let drain = 0;
    for (const t of this.targets) if (!t.dead && t.priest) drain += t.drain;
    this.priestDrain = drain;
    this.timeLeft -= dt * (1 + drain);
    if (this.timeLeft <= 0) { this.timeLeft = 0; return this.endRun(false); }
    this.throttledSave(dt); // persiste régulièrement la partie en cours

    // Recharge des sorts actifs.
    for (const k in this.abilityCooldowns)
      if (this.abilityCooldowns[k] > 0) this.abilityCooldowns[k] = Math.max(0, this.abilityCooldowns[k] - dt);

    // Nappes de feu (Voie du Clic) : dégâts de zone continus.
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    for (let i = this.fires.length - 1; i >= 0; i--) {
      const f = this.fires[i];
      f.life -= dt;
      for (const t of this.targets) {
        if (t.dead) continue;
        if (Math.hypot(t.gx - f.gx, t.gy - f.gy) <= f.radius) {
          t.hp -= f.dps * dt;
          if (t.hp <= 0) this.destroyTarget(t);
        }
      }
      f.tick -= dt;
      if (f.tick <= 0) { f.tick = 0.07; this.spawnFireParticle(f); }
      if (f.life <= 0) this.fires.splice(i, 1);
    }

    const s = this.stats;
    for (const a of this.attackers) {
      a.bob += dt * 6;
      if (a.lunge > 0) a.lunge = Math.max(0, a.lunge - dt * 4);

      if (a.isVagabond) { this.updateVagabond(a, dt, s); continue; }
      if (a.isStormling) { this.updateStormling(a, dt, s); continue; }

      // (Re)cible si nécessaire.
      if (!a.target || a.target.dead) a.target = this.nearestTarget(a);
      if (!a.target) continue;

      const t = a.target;
      const dx = t.gx - a.gx, dy = t.gy - a.gy;
      const dist = Math.hypot(dx, dy);
      // Vitesse : démon de base ; serviteurs et colosse ont leurs bonus.
      let spd = s.moveSpeed;
      if (a.isDemolisher) spd = s.moveSpeed * 0.85 * (1 + s.demoSpeed);
      else if (!a.isDemon) spd = s.moveSpeed * (1 + s.minionSpeed);
      if (dist > 0.75) {
        // Se déplace vers la cible.
        const move = Math.min(spd * dt, dist);
        a.gx += (dx / dist) * move;
        a.gy += (dy / dist) * move;
      } else {
        // À portée : frappe.
        a.cooldown -= dt;
        if (a.cooldown <= 0) {
          a.cooldown = s.attackInterval;
          a.lunge = 1;
          this.hitTarget(t, this.attackerDamage(a, t, s), a);
        }
      }
    }

    // Progression : tout détruit -> niveau nettoyé.
    if (this.runDestroyed >= this.totalToDestroy) this.endRun(true);
  }

  /* Vagabond : erre au hasard et répand un nuage de peste (dégâts de zone). */
  updateVagabond(a, dt, s) {
    const spd = (s.moveSpeed * 0.55) * (1 + s.vagabondSpeed);
    const dx = a.wx - a.gx, dy = a.wy - a.gy;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.4) {
      // Nouvelle destination aléatoire.
      a.wx = Math.random() * (this.gridSize - 1);
      a.wy = Math.random() * (this.gridSize - 1);
    } else {
      const move = Math.min(spd * dt, dist);
      a.gx += (dx / dist) * move;
      a.gy += (dy / dist) * move;
    }
    // Nuage de peste : dégâts continus autour du vagabond.
    const radius = 1.3;
    const dps = s.damage * 0.4 * (1 + s.vagabondDmg);
    for (const t of this.targets) {
      if (t.dead) continue;
      if (Math.hypot(t.gx - a.gx, t.gy - a.gy) <= radius) {
        t.hp -= dps * dt;
        if (t.hp <= 0) this.destroyTarget(t);
      }
    }
    a.plagueTick -= dt;
    if (a.plagueTick <= 0) { a.plagueTick = 0.09; this.spawnPlagueParticle(a, radius); }
  }

  /* Foudroyeur : immobile, lance de petits éclairs sur des cibles au hasard. */
  updateStormling(a, dt, s) {
    a.cooldown -= dt;
    if (a.cooldown > 0) return;
    a.cooldown = 2.0;
    const alive = this.targets.filter(t => !t.dead);
    if (!alive.length) return;
    const t = alive[Math.floor(Math.random() * alive.length)];
    a.lunge = 1;
    this.spawnLightning(t, true); // petit éclair
    this.hitTarget(t, s.damage * 1.5, null);
  }

  nearestTarget(a) {
    // Le Démolisseur cible en priorité le non-vivant (bâtiments, objets…).
    if (a.isDemolisher) {
      const t = this.nearestWhere(a, (o) => !o.def.living);
      if (t) return t;
    }
    // Traque Sacrilège : les serviteurs de base chassent les prêtres d'abord.
    if (a.kind === 'minion' && this.stats.huntPriests) {
      const t = this.nearestWhere(a, (o) => o.priest);
      if (t) return t;
    }
    return this.nearestWhere(a, null);
  }

  nearestWhere(a, filter) {
    let best = null, bd = Infinity;
    for (const t of this.targets) {
      if (t.dead) continue;
      if (filter && !filter(t)) continue;
      const d = (t.gx - a.gx) ** 2 + (t.gy - a.gy) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  /* Dégâts d'un attaquant sur une cible donnée. */
  attackerDamage(a, t, s) {
    if (a.isDemon) return s.damage;
    if (a.isDemolisher) {
      let dmg = s.damage * 2;                 // colosse : frappe lourde
      if (!t.def.living) dmg *= 2.5;          // dégâts renforcés contre le non-vivant
      return dmg * (1 + s.minionDmgBonus + s.demoDmgBonus);
    }
    return Math.max(1, s.damage * 0.5 * (1 + s.minionDmgBonus)); // serviteur
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
    if (this.phase !== 'playing' || this.paused) return;
    const s = this.stats;
    if (!s.clickUnlocked) return; // clic non débloqué (pacte Clic Cataclysmique)
    const t = this.targetAtScreen(sx, sy);
    if (t) {
      // Redirige le démon et inflige des dégâts de clic.
      this.attackers[0].target = t;
      this.hitTarget(t, s.clickDamage, this.attackers[0]);
      this.spawnClickBurst(t);
    }
    // Voie du Clic : une nappe de feu s'embrase à l'endroit du clic.
    if (s.fireWave > 0 && this.fireCooldown <= 0) {
      const w = this.cam.screenToWorld(sx, sy);
      const g = Iso.toGrid(w.x, w.y);
      const gx = Math.max(0, Math.min(this.gridSize - 1, Math.round(g.gx)));
      const gy = Math.max(0, Math.min(this.gridSize - 1, Math.round(g.gy)));
      this.spawnFire(gx, gy);
      this.fireCooldown = Math.max(0.6, 1.5 - s.fireWave * 0.05);
    }
  }

  spawnFire(gx, gy) {
    const n = this.stats.fireWave;
    this.fires.push({
      gx, gy,
      radius: 1.1 + n * 0.03,
      dps: this.stats.clickDamage * (0.5 + 0.15 * n),
      life: 3 + n * 0.3,
      tick: 0,
    });
    this.addFloater(gx, gy, '🔥', '#ff8a2a');
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
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      this.impacts[i].life -= dt;
      if (this.impacts[i].life <= 0) this.impacts.splice(i, 1);
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

    // --- Nappes de feu (au sol, sous les objets) ---
    for (const f of this.fires) {
      const w = Iso.toScreen(f.gx, f.gy);
      const p = cam.worldToScreen(w.x, w.y);
      const R = f.radius * CONFIG.TILE_W * 0.62 * cam.scale;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 110 + f.gx * 2);
      const a = Math.min(1, f.life) * (0.35 + pulse * 0.18);
      const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
      grd.addColorStop(0, `rgba(255,150,20,${a})`);
      grd.addColorStop(0.55, `rgba(220,60,10,${a * 0.55})`);
      grd.addColorStop(1, 'rgba(120,20,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, R * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- Nuages de peste (autour des vagabonds, au sol) ---
    for (const a of this.attackers) {
      if (!a.isVagabond) continue;
      const w = Iso.toScreen(a.gx, a.gy);
      const p = cam.worldToScreen(w.x, w.y);
      const R = 1.3 * CONFIG.TILE_W * 0.72 * cam.scale;
      const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 130 + a.gx * 3);
      const al = 0.3 + pulse * 0.14;
      const grd = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, R);
      grd.addColorStop(0, `rgba(120,200,120,${al})`);
      grd.addColorStop(0.6, `rgba(70,140,80,${al * 0.5})`);
      grd.addColorStop(1, 'rgba(30,70,40,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, R, R * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
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

    // --- Éclairs (sort Foudre) ---
    for (const bolt of this.bolts) {
      const w = Iso.toScreen(bolt.gx, bolt.gy);
      const base = cam.worldToScreen(w.x, w.y);
      const groundY = base.y - 14 * cam.scale;
      const topY = groundY - (bolt.small ? 78 : 130) * cam.scale;
      ctx.globalAlpha = Math.max(0, Math.min(1, bolt.life * 3.2));
      ctx.strokeStyle = '#e6f6ff';
      ctx.lineWidth = (bolt.small ? 2 : 3) * cam.scale;
      ctx.shadowColor = '#7fd0ff';
      ctx.shadowBlur = 14 * cam.scale;
      ctx.beginPath();
      ctx.moveTo(base.x, topY);
      const segs = 6;
      for (let i = 1; i <= segs; i++) {
        const yy = topY + (groundY - topY) * (i / segs);
        const jitter = Math.sin(bolt.seed + i * 2.3) * 16 * cam.scale * (1 - i / segs);
        ctx.lineTo(base.x + jitter, yy);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;

    // --- Impacts de météore (traînée + onde de choc) ---
    for (const im of this.impacts) {
      const w = Iso.toScreen(im.gx, im.gy);
      const base = cam.worldToScreen(w.x, w.y);
      const groundY = base.y - 14 * cam.scale;
      const k = 1 - im.life / im.max; // 0 -> 1
      // Traînée du météore qui tombe (début de l'impact).
      if (im.life > im.max * 0.55) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ffd24d';
        ctx.lineWidth = 6 * cam.scale;
        ctx.shadowColor = '#ff7b00'; ctx.shadowBlur = 20 * cam.scale;
        ctx.beginPath();
        ctx.moveTo(base.x + 150 * cam.scale, groundY - 260 * cam.scale);
        ctx.lineTo(base.x, groundY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      // Onde de choc qui se propage.
      const R = k * 2.4 * CONFIG.TILE_W * cam.scale;
      ctx.globalAlpha = Math.max(0, im.life / im.max);
      ctx.strokeStyle = '#ffb04d';
      ctx.lineWidth = 4 * cam.scale;
      ctx.beginPath();
      ctx.ellipse(base.x, groundY, R, R * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

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
    const ts = t.scale || 1;                 // facteur de taille (boss = plus grand)
    const size = Math.round(30 * ts * scale);
    const lift = (14 + (ts - 1) * 16) * scale; // les gros objets flottent plus haut

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
    const cy = p.y - lift + bobY;

    // Ombre (plus large pour les gros).
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * scale, 14 * ts * scale, 6 * ts * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Aura dorée du boss / halo blanc du prêtre.
    if (t.boss || t.priest) {
      const rad = (t.boss ? 40 : 18) * scale;
      const col = t.boss ? '255,200,60' : '210,230,255';
      const g = ctx.createRadialGradient(p.x, cy, rad * 0.2, p.x, cy, rad);
      g.addColorStop(0, `rgba(${col},${t.boss ? 0.4 : 0.5})`);
      g.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, cy, rad, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = `${size}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(t.def.emoji, p.x + shakeX, cy);

    // Barre de vie (toujours visible pour le boss).
    if (t.hp < t.maxHp || t.boss) {
      const bw = (t.boss ? 46 : 26) * scale, bh = (t.boss ? 6 : 4) * scale;
      const bx = p.x - bw / 2, by = cy - (size * 0.62) - 6 * scale;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(bx, by, bw, bh);
      const frac = Math.max(0, t.hp / t.maxHp);
      ctx.fillStyle = frac > 0.5 ? '#7bd47b' : frac > 0.25 ? '#ffcc4d' : '#ff5c5c';
      ctx.fillRect(bx, by, bw * frac, bh);
      if (t.boss) {
        ctx.strokeStyle = '#ffc83c'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
        // Nom du boss.
        ctx.font = `bold ${Math.round(11 * scale)}px Georgia, serif`;
        ctx.fillStyle = '#ffe08a';
        ctx.fillText(t.def.name, p.x, by - 8 * scale);
      }
    }
  }

  drawAttacker(ctx, a) {
    const w = Iso.toScreen(a.gx, a.gy);
    const p = this.cam.worldToScreen(w.x, w.y);
    const scale = this.cam.scale;

    // Apparence par type : jeton coloré (disque + anneau) + emoji bien visible.
    const cfg = a.isDemon
      ? { emoji: '😈', r: 21, esize: 30, ring: '#ff8a2a', fill: '#7a1810', glow: '255,90,20' }
      : a.isDemolisher
      ? { emoji: '👹', r: 28, esize: 40, ring: '#c07bff', fill: '#3d1257', glow: '160,70,230' }
      : a.isVagabond
      ? { emoji: '🧟', r: 18, esize: 26, ring: '#6fd08a', fill: '#1e3a24', glow: '110,200,120' }
      : a.isStormling
      ? { emoji: '🧙', r: 17, esize: 25, ring: '#7fd0ff', fill: '#16304a', glow: '120,200,255' }
      : { emoji: '👿', r: 15, esize: 22, ring: '#a86bff', fill: '#2c1442', glow: '150,90,255' };

    const bobY = Math.sin(a.bob) * 2.5 * scale;
    const lungeY = a.lunge * 6 * scale;
    const cx = p.x;
    const cy = p.y - 16 * scale + bobY - lungeY;
    const R = cfg.r * scale;

    // Ombre portée au sol.
    ctx.fillStyle = 'rgba(0,0,0,0.34)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2 * scale, cfg.r * 0.8 * scale, cfg.r * 0.4 * scale, 0, 0, Math.PI * 2);
    ctx.fill();

    // Halo lumineux.
    const glow = ctx.createRadialGradient(cx, cy, R * 0.4, cx, cy, R * 2);
    glow.addColorStop(0, `rgba(${cfg.glow},0.5)`);
    glow.addColorStop(1, `rgba(${cfg.glow},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(cx, cy, R * 2, 0, Math.PI * 2); ctx.fill();

    // Jeton : disque plein dégradé + anneau vif.
    const disc = ctx.createRadialGradient(cx, cy - R * 0.35, R * 0.2, cx, cy, R);
    disc.addColorStop(0, cfg.fill);
    disc.addColorStop(1, '#140709');
    ctx.fillStyle = disc;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = Math.max(1.5, 2.4 * scale);
    ctx.strokeStyle = cfg.ring;
    ctx.stroke();

    // Emoji du personnage, centré sur le jeton.
    ctx.font = `${Math.round(cfg.esize * scale)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(cfg.emoji, cx, cy);
  }
}
