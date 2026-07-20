/* =========================================================================
 * Hellcremental — Interface (HUD, boutique, écrans de fin)
 * ========================================================================= */

class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.treeBuilt = false;
    this.view = 'game';
    // « Mobile » = petit écran en largeur (portrait) OU en hauteur (paysage).
    this.mq = window.matchMedia('(max-width: 860px), (max-height: 600px)');
    // Arbre de compétences : panoramique (drag) + zoom.
    this.treeOffset = { x: 0, y: 0 };
    this.treeScale = 1;
    this._treeCentered = false;
    this._treeDragged = false;
    this._nodeId = null; // pacte affiché dans la fiche
    // Présentation paginée.
    this.introPage = 0;
    this.introCount = 0;
    // Autel des démons primordiaux.
    this.altarBuilt = false;
    this.demonIndex = 0;
    this.bind();
  }

  // Le jeu est désormais en « deux pages » sur tous les formats (PC compris) :
  // on considère toujours l'agencement à vue unique + barre d'onglets.
  isMobile() { return true; }

  bind() {
    this.$('start-btn').addEventListener('click', () => this.startRun());
    this.$('resume-btn').addEventListener('click', () => this.resumeRun());

    // Onglets mobile : bascule entre le jeu et la boutique.
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.addEventListener('click', () => { this.setView(b.dataset.view); this.refresh(); }));

    this.bindIntro();
    this.bindTreePan();
    this.bindNodeModal();

    // Vue de fin (côté Chaos) : relancer / niveau suivant.
    this.$('overlay-btn').addEventListener('click', () => {
      this.$('overlay').classList.add('hidden');
      this.startRun();
    });
    // Aller améliorer ses pouvoirs (mobile) sans fermer la vue de fin :
    // elle réapparaît en revenant sur Chaos.
    this.$('overlay-improve').addEventListener('click', () => {
      this.setView('shop'); this.refresh();
    });

    // --- Bouton de test temporaire : +âmes ---
    this.$('cheat-btn').addEventListener('click', () => {
      this.game.souls += 1e9;
      this.game.save();
      this.refresh();
    });

    // --- Menu Options / sauvegarde ---
    this.$('menu-btn').addEventListener('click', () => this.openMenu());
    this.$('menu-close').addEventListener('click', () => this.closeMenu());
    this.$('menu').addEventListener('click', (e) => { if (e.target.id === 'menu') this.closeMenu(); });

    this.$('export-gen').addEventListener('click', () => {
      this.$('export-code').value = this.game.exportSave();
    });
    this.$('export-copy').addEventListener('click', () => this.copyExport());
    this.$('import-apply').addEventListener('click', () => this.doImport());

    this.$('reset-btn').addEventListener('click', () => {
      if (confirm('Recommencer depuis le début ? Toute la progression sera perdue.')) {
        this.game.reset();
        this.closeMenu();
        this.$('overlay').classList.add('hidden');
        this.buildTree();
        this.refresh();
        this.showStartScreen();
      }
    });

    // --- Installation PWA (Android/Chrome/Edge) ---
    this._deferredInstall = null;
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this._deferredInstall = e;
      this.$('install-btn').classList.remove('hidden');
    });
    this.$('install-btn').addEventListener('click', async () => {
      if (!this._deferredInstall) return;
      this._deferredInstall.prompt();
      await this._deferredInstall.userChoice;
      this._deferredInstall = null;
      this.$('install-btn').classList.add('hidden');
    });
    window.addEventListener('appinstalled', () => this.$('install-btn').classList.add('hidden'));
  }

  /* Tente de verrouiller l'orientation en paysage (installé en PWA / plein
   * écran). Échoue silencieusement dans un onglet classique — l'écran
   * « Tourne ton téléphone » prend alors le relais. */
  tryLockLandscape() {
    try {
      const o = screen.orientation;
      if (o && o.lock) o.lock('landscape').catch(() => {});
    } catch (e) { /* non supporté : ignoré */ }
  }

  startRun() {
    this.$('start-screen').classList.add('hidden');
    this.tryLockLandscape();
    this.setView('game');
    this.game.startRun();
    this.refresh();
  }

  resumeRun() {
    this.$('start-screen').classList.add('hidden');
    this.tryLockLandscape();
    this.setView('game');
    this.game.resumeRun();
    this.refresh();
  }

  showStartScreen() {
    // Propose « Reprendre » si une partie est sauvegardée.
    this.$('resume-btn').classList.toggle('hidden', !this.game.hasResumableRun());
    this.$('start-btn').textContent = this.game.hasResumableRun()
      ? 'Nouvelle vie (niveau ' + this.game.level + ') ▸'
      : 'Semer le chaos ▸';
    this.setView('game');
    this.introPage = 0;
    this.renderIntro();
    this.renderVirtueTracker();
    this.$('start-screen').classList.remove('hidden');
    this.refresh();
  }

  /* Suivi méta : Vertus vaincues (boss de dizaine) + éveil du Prestige. */
  renderVirtueTracker() {
    const el = this.$('virtue-tracker');
    if (!el) return;
    const g = this.game;
    const done = g.virtuesDefeatedCount();
    if (done === 0) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const pips = VIRTUES.map((v) =>
      `<span class="vt-pip ${g.virtuesDefeated[v.id] ? 'on' : ''}" title="${v.name}">${g.virtuesDefeated[v.id] ? v.emoji : '·'}</span>`
    ).join('');
    const prestige = g.prestigeUnlocked()
      ? `<div class="vt-prestige">✨ Prestige éveillé <small>(à venir)</small></div>` : '';
    el.innerHTML = `<div class="vt-title">⚜️ Vertus vaincues — ${done}/${VIRTUES.length}</div>` +
      `<div class="vt-pips">${pips}</div>${prestige}`;
  }

  /* Bascule entre la vue jeu et la vue boutique (mobile). */
  setView(view) {
    this.view = view;
    document.getElementById('app').setAttribute('data-view', view);
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === view));
    // Le jeu ne tourne QUE sur la vue « jeu » : sur la boutique ET l'autel il
    // est en pause (l'autel se consulte hors d'un niveau).
    this.game.paused = (view === 'shop' || view === 'altar');
    if (view === 'game') {
      // La vue jeu venant d'apparaître, on recalcule la taille du canevas.
      window.dispatchEvent(new Event('resize'));
    } else if (view === 'shop') {
      // La vue Pouvoirs venant d'apparaître : on centre l'arbre au besoin.
      requestAnimationFrame(() => this.centerTreeIfNeeded());
    } else if (view === 'altar') {
      this.buildAltar();
      this.refreshAltar();
    }
  }

  /* ---------------------- Présentation paginée ---------------------- */
  bindIntro() {
    const pages = document.querySelectorAll('.intro-page');
    this.introCount = pages.length;
    const dots = this.$('intro-dots');
    dots.innerHTML = '';
    for (let i = 0; i < this.introCount; i++) dots.appendChild(document.createElement('span'));
    this.$('intro-prev').addEventListener('click', () => this.gotoIntro(this.introPage - 1));
    this.$('intro-next').addEventListener('click', () => this.gotoIntro(this.introPage + 1));

    // Glissement latéral (swipe) pour changer de page.
    const area = this.$('start-screen');
    let sx = 0, down = false;
    area.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; });
    area.addEventListener('pointerup', (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 45) this.gotoIntro(this.introPage + (dx < 0 ? 1 : -1));
    });
    this.renderIntro();
  }
  gotoIntro(i) {
    this.introPage = Math.max(0, Math.min(this.introCount - 1, i));
    this.renderIntro();
  }
  renderIntro() {
    document.querySelectorAll('.intro-page').forEach((p, i) =>
      p.classList.toggle('active', i === this.introPage));
    const dots = this.$('intro-dots').querySelectorAll('span');
    dots.forEach((s, i) => s.classList.toggle('on', i === this.introPage));
    this.$('intro-prev').disabled = this.introPage === 0;
    this.$('intro-next').disabled = this.introPage === this.introCount - 1;
  }

  /* ---------------------- Menu ---------------------- */
  openMenu() {
    this.$('import-msg').textContent = '';
    this.$('export-code').value = '';
    this.$('menu').classList.remove('hidden');
  }
  closeMenu() { this.$('menu').classList.add('hidden'); }

  async copyExport() {
    const ta = this.$('export-code');
    if (!ta.value) ta.value = this.game.exportSave();
    try {
      await navigator.clipboard.writeText(ta.value);
      this.flashBtn('export-copy', 'Copié ✓');
    } catch (e) {
      ta.select();
      document.execCommand && document.execCommand('copy');
      this.flashBtn('export-copy', 'Copié ✓');
    }
  }

  doImport() {
    const code = this.$('import-code').value;
    const msg = this.$('import-msg');
    if (!code.trim()) { msg.textContent = 'Colle d\'abord un code.'; msg.className = 'menu-msg err'; return; }
    if (this.game.importSave(code)) {
      msg.textContent = 'Sauvegarde importée ! Niveau ' + this.game.level + ', ' + this.fmt(this.game.souls) + ' âmes.';
      msg.className = 'menu-msg ok';
      this.buildTree();
      this.refresh();
      setTimeout(() => { this.closeMenu(); this.showStartScreen(); }, 900);
    } else {
      msg.textContent = 'Code invalide ou illisible.';
      msg.className = 'menu-msg err';
    }
  }

  flashBtn(id, text) {
    const b = this.$(id);
    const old = b.textContent;
    b.textContent = text;
    setTimeout(() => { b.textContent = old; }, 1200);
  }

  fmt(n) {
    n = Math.floor(n);
    if (n < 1000) return String(n);
    if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 2 : 1).replace(/\.0+$/, '') + 'k';
    return (n / 1e6).toFixed(2).replace(/\.0+$/, '') + 'M';
  }

  /* ---------------------- Arbre de compétences ---------------------- */
  buildTree() {
    const world = this.$('tree-world');
    world.querySelectorAll('.tree-node').forEach((n) => n.remove());
    const svg = this.$('tree-links');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const NS = 'http://www.w3.org/2000/svg';
    const byId = {};
    SKILL_TREE.forEach((n) => { byId[n.id] = n; });

    // Traits reliant chaque pacte à son parent.
    for (const node of SKILL_TREE) {
      if (!node.parent) continue;
      const p = byId[node.parent];
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', p.x); line.setAttribute('y1', p.y);
      line.setAttribute('x2', node.x); line.setAttribute('y2', node.y);
      line.dataset.id = node.id;
      svg.appendChild(line);
    }

    // Nœuds.
    for (const node of SKILL_TREE) {
      const isRoot = node.id === 'root';
      const el = document.createElement(isRoot ? 'div' : 'button');
      el.className = 'tree-node' + (isRoot ? ' root' : '');
      el.style.left = node.x + 'px';
      el.style.top = node.y + 'px';
      el.dataset.id = node.id;
      if (isRoot) {
        el.innerHTML = `<div class="tn-emoji">😈</div>`;
      } else {
        const def = UPGRADES.find((u) => u.id === node.id);
        el.title = def.name;
        el.innerHTML = `
          <div class="tn-emoji">${def.emoji}</div>
          <div class="tn-name">${def.name}</div>
          <div class="tn-lvl" data-lvl></div>
          <div class="tn-cost" data-cost></div>`;
        el.addEventListener('click', () => {
          if (this._treeDragged) return; // c'était un glissement, pas un clic
          this.openNode(node.id); // ouvre la fiche du pacte
        });
      }
      world.appendChild(el);
    }
    this.treeBuilt = true;
  }

  refreshTree() {
    if (!this.treeBuilt) this.buildTree();
    const g = this.game;
    for (const def of UPGRADES) {
      const el = this.$('tree-world').querySelector(`.tree-node[data-id="${def.id}"]`);
      if (!el) continue;
      const n = g.upgradeLevel(def.id);
      const maxed = n >= def.max;
      const cost = g.upgradeCost(def);
      const unlocked = g.isUnlocked(def.id);
      el.querySelector('[data-lvl]').textContent = maxed ? 'MAX' : `Niv. ${n}`;
      el.querySelector('[data-cost]').textContent =
        !unlocked ? '🔒 Verrouillé' : maxed ? '✓ MAX' : `💀 ${this.fmt(cost)}`;
      const affordable = unlocked && !maxed && g.souls >= cost;
      el.classList.toggle('affordable', affordable);
      el.classList.toggle('maxed', maxed && unlocked);
      el.classList.toggle('locked', !unlocked);
      const line = this.$('tree-links').querySelector(`line[data-id="${def.id}"]`);
      if (line) line.classList.toggle('lit', n > 0);
    }
    this.centerTreeIfNeeded();
  }

  /* --- Panoramique (drag) + zoom (pince / molette / boutons) --- */
  bindTreePan() {
    const el = this.$('skilltree');
    const pointers = new Map();
    let pan = null;     // { sx, sy, ox, oy }
    let pinch = null;   // { dist, cx, cy, scale, ox, oy }
    const hideHint = () => this.$('tree-hint').classList.add('gone');

    el.addEventListener('pointerdown', (e) => {
      // NB : on ne capture PAS le pointeur ici — sinon l'event « click » est
      // redirigé vers #skilltree et n'atteint jamais le bouton du pacte (la
      // fiche ne s'ouvrait pas sur PC). On capture seulement au vrai glissement.
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this._treeDragged = false;
      if (pointers.size === 1) {
        pan = { sx: e.clientX, sy: e.clientY, ox: this.treeOffset.x, oy: this.treeOffset.y };
        pinch = null;
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = {
          dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2,
          scale: this.treeScale, ox: this.treeOffset.x, oy: this.treeOffset.y,
        };
        pan = null; this._treeDragged = true; hideHint();
      }
    });

    const onMove = (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const rect = el.getBoundingClientRect();
      if (pinch && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const ns = this.clampScale(pinch.scale * (dist / pinch.dist));
        const k = ns / pinch.scale;
        const fx = pinch.cx - rect.left, fy = pinch.cy - rect.top;
        this.treeScale = ns;
        this.treeOffset.x = fx - (fx - pinch.ox) * k;
        this.treeOffset.y = fy - (fy - pinch.oy) * k;
        this.applyTreeTransform();
      } else if (pan) {
        const dx = e.clientX - pan.sx, dy = e.clientY - pan.sy;
        if (!this._treeDragged && Math.hypot(dx, dy) > 6) {
          this._treeDragged = true; hideHint();
          // Le glissement commence : on capture le pointeur pour un pan fluide.
          if (el.setPointerCapture) { try { el.setPointerCapture(e.pointerId); } catch (x) {} }
        }
        if (this._treeDragged) {
          this.treeOffset.x = pan.ox + dx;
          this.treeOffset.y = pan.oy + dy;
          this.applyTreeTransform();
        }
      }
    };
    const onUp = (e) => {
      pointers.delete(e.pointerId);
      if (pointers.size === 1) {
        const [p] = [...pointers.values()];
        pan = { sx: p.x, sy: p.y, ox: this.treeOffset.x, oy: this.treeOffset.y };
        pinch = null;
      } else if (pointers.size === 0) {
        pan = null; pinch = null;
        setTimeout(() => { this._treeDragged = false; }, 0);
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    // Molette : zoom sur grand écran.
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      this.zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    // Boutons de zoom (on empêche le pan de démarrer dessus).
    const zoom = this.$('tree-zoom');
    zoom.addEventListener('pointerdown', (e) => e.stopPropagation());
    zoom.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        const vpW = el.clientWidth, vpH = el.clientHeight;
        if (b.dataset.z === 'in') this.zoomAt(1.25, vpW / 2, vpH / 2);
        else if (b.dataset.z === 'out') this.zoomAt(1 / 1.25, vpW / 2, vpH / 2);
        else this.fitTree();
      });
    });
  }

  clampScale(s) { return Math.max(0.4, Math.min(1.2, s)); }

  zoomAt(factor, fx, fy) {
    const old = this.treeScale;
    const ns = this.clampScale(old * factor);
    if (ns === old) return;
    const k = ns / old;
    this.treeScale = ns;
    this.treeOffset.x = fx - (fx - this.treeOffset.x) * k;
    this.treeOffset.y = fy - (fy - this.treeOffset.y) * k;
    this.$('tree-hint').classList.add('gone');
    this.applyTreeTransform();
  }

  clampAxis(off, vp, world) {
    const pad = 70;
    if (world + 2 * pad <= vp) return (vp - world) / 2; // monde plus petit : centré
    return Math.min(pad, Math.max(vp - world - pad, off));
  }

  applyTreeTransform() {
    const el = this.$('skilltree');
    const vpW = el.clientWidth, vpH = el.clientHeight;
    if (!vpW || !vpH) return;
    const s = this.treeScale;
    this.treeOffset.x = this.clampAxis(this.treeOffset.x, vpW, TREE_W * s);
    this.treeOffset.y = this.clampAxis(this.treeOffset.y, vpH, TREE_H * s);
    this.$('tree-world').style.transform =
      `translate(${this.treeOffset.x}px, ${this.treeOffset.y}px) scale(${s})`;
  }

  centerTree() {
    const el = this.$('skilltree');
    const vpW = el.clientWidth, vpH = el.clientHeight;
    if (!vpW || !vpH) return false;
    const root = SKILL_TREE.find((n) => n.id === 'root');
    const s = this.treeScale;
    this.treeOffset = { x: vpW / 2 - root.x * s, y: vpH / 2 - root.y * s };
    this.applyTreeTransform();
    return true;
  }

  /* Vue d'ensemble : dézoome pour voir tout l'arbre. */
  fitTree() {
    const el = this.$('skilltree');
    const vpW = el.clientWidth, vpH = el.clientHeight;
    if (!vpW || !vpH) return;
    this.treeScale = this.clampScale(Math.min(vpW / (TREE_W + 120), vpH / (TREE_H + 120)));
    this.treeOffset = { x: (vpW - TREE_W * this.treeScale) / 2, y: (vpH - TREE_H * this.treeScale) / 2 };
    this.applyTreeTransform();
    this.$('tree-hint').classList.add('gone');
  }

  centerTreeIfNeeded() {
    if (this._treeCentered) return;
    if (this.centerTree()) this._treeCentered = true;
  }

  /* ---------------------- Fiche d'un pacte (avant achat) ---------------------- */
  bindNodeModal() {
    this.$('node-close').addEventListener('click', () => this.closeNode());
    this.$('node-modal').addEventListener('click', (e) => {
      if (e.target.id === 'node-modal') this.closeNode();
    });
    this.$('node-buy').addEventListener('click', () => {
      if (this._nodeId && this.game.buyUpgrade(this._nodeId)) {
        this.renderNode();
        this.refresh();
        const el = this.$('tree-world').querySelector(`.tree-node[data-id="${this._nodeId}"]`);
        if (el) { el.classList.add('bought'); setTimeout(() => el.classList.remove('bought'), 200); }
      }
    });
  }

  openNode(id) {
    this._nodeId = id;
    this.renderNode();
    this.$('node-modal').classList.remove('hidden');
  }
  closeNode() { this._nodeId = null; this.$('node-modal').classList.add('hidden'); }

  renderNode() {
    const def = UPGRADES.find((u) => u.id === this._nodeId);
    if (!def) return;
    const g = this.game;
    const n = g.upgradeLevel(def.id);
    const maxed = n >= def.max;
    const cost = g.upgradeCost(def);
    const unlocked = g.isUnlocked(def.id);
    this.$('node-emoji').textContent = def.emoji;
    this.$('node-name').textContent = def.name;
    this.$('node-lvl').textContent = !unlocked ? '🔒 Verrouillé'
      : maxed ? 'Niveau MAX' : `Niveau ${n} / ${def.max}`;
    this.$('node-desc').textContent = def.desc;

    const eff = this.$('node-effect');
    const buy = this.$('node-buy');
    if (!unlocked) {
      // Nom du pacte parent à invoquer d'abord.
      const parentDef = UPGRADES.find((u) => u.id === g.parentOf(def.id));
      const pname = parentDef ? parentDef.name : 'le pacte précédent';
      eff.innerHTML = `<span class="nxt">🔒 Invoque d'abord « ${pname} » pour débloquer ce pacte.</span>`;
      buy.disabled = true;
      buy.textContent = `🔒 Nécessite « ${pname} »`;
      return;
    }

    const cur = n > 0 ? `Actuel : ${def.effect(n)}` : 'Pas encore invoqué';
    eff.innerHTML = `<span>${cur}</span>` +
      (maxed ? '' : `<span class="nxt">Prochain niveau : ${def.effect(n + 1)}</span>`);
    if (maxed) { buy.disabled = true; buy.textContent = '✓ Niveau maximum'; }
    else if (g.souls >= cost) { buy.disabled = false; buy.textContent = `Invoquer · 💀 ${this.fmt(cost)}`; }
    else { buy.disabled = true; buy.textContent = `💀 ${this.fmt(cost)} — pas assez d'âmes`; }
  }

  /* ---------------------- HUD ---------------------- */
  refresh() {
    const g = this.game;
    this.$('souls').textContent = this.fmt(g.souls);
    this.$('level').textContent = g.level;
    this.$('best').textContent = g.bestLevel;
    this.$('total-destroyed').textContent = this.fmt(g.totalDestroyed);
    this.refreshTree();

    this.refreshAbilities();

    // Niveau boss (tous les 10 niveaux) : on le met en évidence.
    this.$('level').classList.toggle('boss', isBossLevel(g.level));

    const playing = g.phase === 'playing';
    if (playing) {
      const frac = g.stats ? g.timeLeft / g.stats.lifespan : 0;
      this.$('timer-text').textContent = g.timeLeft.toFixed(1) + 's';
      // Progression fondée sur ce qui reste debout (régresse si des vivants renaissent).
      const alive = g.aliveTargetCount();
      const done = Math.max(0, g.totalToDestroy - alive);
      this.$('progress-text').textContent = `${done} / ${g.totalToDestroy}`;
      // Nom du biome + indicateur de renaissance.
      const biome = g.currentBiome ? g.currentBiome() : null;
      this.$('biome-text').textContent = biome ? biome.name : '';
      this.$('hud-respawn').classList.toggle('hidden', !g.respawnActive);
      // Le compte à rebours s'affole dans les 5 dernières secondes.
      this.$('hud').classList.toggle('low', g.timeLeft <= 5);
      // Fine barre de survie visible aussi sur l'onglet boutique (mobile).
      this.$('nav-timer-fill').style.width = (frac * 100) + '%';
      // Indicateur de drainage par les prêtres.
      const drain = g.priestDrain || 0;
      this.$('hud-drain').classList.toggle('hidden', drain <= 0);
      if (drain > 0) this.$('drain-text').textContent = 'exorcisme ×' + (1 + drain).toFixed(1);
    } else {
      this.$('nav-timer-fill').style.width = '100%';
      this.$('hud-drain').classList.add('hidden');
      this.$('hud-respawn').classList.add('hidden');
    }

    // Fiche de pacte ouverte : on la garde à jour (coût/abordable).
    if (this._nodeId && !this.$('node-modal').classList.contains('hidden')) this.renderNode();

    // Pastille sur l'onglet boutique : nombre de pouvoirs abordables.
    const badge = this.$('nav-shop-badge');
    let affordable = 0;
    for (const def of UPGRADES) {
      const n = g.upgradeLevel(def.id);
      if (g.isUnlocked(def.id) && n < def.max && g.souls >= g.upgradeCost(def)) affordable++;
    }
    if (affordable > 0) { badge.textContent = affordable; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');

    // Carte de l'autel (si déjà construite) + pastille de l'onglet Autel.
    this.refreshAltar();
    const abadge = this.$('nav-altar-badge');
    const unsealed = PRIMORDIAL_DEMONS.filter((dm) => !g.demonUnlocked(dm.id)).length;
    if (unsealed > 0 && g.souls >= g.offeringCost()) {
      abadge.textContent = unsealed; abadge.classList.remove('hidden');
    } else abadge.classList.add('hidden');
  }

  /* ---------------------- Sorts actifs (boutons en jeu) ---------------------- */
  refreshAbilities() {
    const box = this.$('abilities');
    const g = this.game;
    // Sorts possédés, uniquement pendant une partie active.
    const owned = (g.phase === 'playing')
      ? UPGRADES.filter((u) => u.active && g.upgradeLevel(u.id) > 0) : [];
    const ids = owned.map((u) => u.id).join(',');
    if (box.dataset.ids !== ids) {
      box.dataset.ids = ids;
      box.innerHTML = '';
      for (const def of owned) {
        const b = document.createElement('button');
        b.className = 'ability-btn';
        b.dataset.id = def.id;
        b.title = def.name;
        b.innerHTML = `<span class="ab-emoji">${def.emoji}</span><span class="ab-cd"></span>`;
        b.addEventListener('click', () => {
          if (g.activateAbility(def.id)) {
            b.classList.add('cast');
            setTimeout(() => b.classList.remove('cast'), 200);
            this.refreshAbilities();
          }
        });
        box.appendChild(b);
      }
    }
    // Recharge / disponibilité.
    for (const def of owned) {
      const b = box.querySelector(`[data-id="${def.id}"]`);
      if (!b) continue;
      const meta = ACTIVE_ABILITIES[def.id];
      const used = meta && meta.once && g.abilityUsed[def.id];
      const cd = g.abilityCooldowns[def.id] || 0;
      const ready = !used && cd <= 0;
      b.classList.toggle('ready', ready);
      b.classList.toggle('used', !!used);
      b.querySelector('.ab-cd').textContent = used ? '✓' : (ready ? '' : Math.ceil(cd));
    }
  }

  /* ---------------------- Autel des démons primordiaux ---------------------- */
  buildAltar() {
    if (this.altarBuilt) return;
    this.altarBuilt = true;
    this.demonIndex = 0;
    const dots = this.$('demon-dots');
    dots.innerHTML = '';
    PRIMORDIAL_DEMONS.forEach((d, i) => {
      const s = document.createElement('span');
      s.dataset.i = i; s.title = d.sin;
      s.style.background = d.color;
      s.addEventListener('click', () => { this.demonIndex = i; this.renderDemon(); });
      dots.appendChild(s);
    });
    this.$('demon-prev').addEventListener('click', () => this.stepDemon(-1));
    this.$('demon-next').addEventListener('click', () => this.stepDemon(1));
    // Glissement latéral (swipe) pour changer de démon.
    const car = this.$('demon-carousel');
    let sx = 0, down = false;
    car.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; });
    car.addEventListener('pointerup', (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 45) this.stepDemon(dx < 0 ? 1 : -1);
    });
    this.renderDemon();
  }

  stepDemon(dir) {
    const n = PRIMORDIAL_DEMONS.length;
    this.demonIndex = (this.demonIndex + dir + n) % n;
    this.renderDemon();
  }

  renderDemon() {
    const d = PRIMORDIAL_DEMONS[this.demonIndex];
    const stage = this.$('demon-stage');
    stage.innerHTML = `
      <div class="demon-card" style="--demon-color:${d.color}">
        <div class="demon-sin">${d.sin}</div>
        <div class="demon-art" id="demon-art">${d.emoji}</div>
        <div class="demon-name">${d.name}</div>
        <div class="demon-pact">🔥 ${d.pact}</div>
        <div class="demon-desc">${d.desc}</div>
        <div class="demon-progress"><span id="demon-bar"></span></div>
        <div class="demon-progress-lbl" id="demon-prog"></div>
        <button class="demon-offer" id="demon-offer-btn"></button>
      </div>`;
    this.$('demon-offer-btn').addEventListener('click', () => this.offerToDemon(d.id));
    this.$('demon-dots').querySelectorAll('span').forEach((s, i) =>
      s.classList.toggle('on', i === this.demonIndex));
    this.refreshAltar();
  }

  offerToDemon(id) {
    if (this.game.offerSouls(id)) {
      this.altarBurst();   // âmes qui filent vers la bouche du démon
      this.refresh();
    }
  }

  /* Met à jour la carte du démon courant + les pastilles. */
  refreshAltar() {
    if (!this.altarBuilt) return;
    const g = this.game;
    const d = PRIMORDIAL_DEMONS[this.demonIndex];
    const count = g.offeringCount(d.id);
    const sealed = g.demonUnlocked(d.id);
    const bar = this.$('demon-bar'), prog = this.$('demon-prog'), btn = this.$('demon-offer-btn');
    if (bar) bar.style.width = Math.round((count / OFFERINGS_PER_DEMON) * 100) + '%';
    if (prog) prog.textContent = `${count} / ${OFFERINGS_PER_DEMON} offrandes`;
    if (btn) {
      if (sealed) {
        btn.innerHTML = '✓ Pacte scellé';
        btn.classList.add('sealed'); btn.disabled = true;
      } else {
        const cost = g.offeringCost();
        btn.classList.remove('sealed');
        btn.innerHTML = `🩸 Offrir une âme<small>💀 ${this.fmt(cost)}</small>`;
        btn.disabled = g.souls < cost;
      }
    }
    this.$('demon-dots').querySelectorAll('span').forEach((s, i) =>
      s.classList.toggle('sealed', g.demonUnlocked(PRIMORDIAL_DEMONS[i].id)));
  }

  /* Animation : particules d'âme convergeant vers la bouche du démon choisi. */
  altarBurst() {
    const cv = this.$('altar-fx');
    if (!cv) return;
    const wrap = cv.getBoundingClientRect();
    if (wrap.width < 4) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(wrap.width * dpr);
    cv.height = Math.round(wrap.height * dpr);
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Point « bouche » : centre-bas de l'emoji du démon.
    let mx = wrap.width / 2, my = wrap.height * 0.42;
    const art = this.$('demon-art');
    if (art) {
      const a = art.getBoundingClientRect();
      mx = a.left - wrap.left + a.width / 2;
      my = a.top - wrap.top + a.height * 0.62;
      art.classList.remove('gulp'); void art.offsetWidth; art.classList.add('gulp');
    }
    const parts = [];
    const N = 26;
    const spread = Math.max(wrap.width, wrap.height);
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = 120 + Math.random() * spread * 0.42;
      parts.push({
        sx: mx + Math.cos(ang) * rad, sy: my + Math.sin(ang) * rad + 30,
        delay: Math.random() * 0.28, dur: 0.55 + Math.random() * 0.4,
        wob: (Math.random() * 2 - 1) * 34, size: 3 + Math.random() * 3,
        color: Math.random() < 0.5 ? '#d9b3ff' : '#ffffff',
      });
    }
    const start = performance.now();
    const loop = (now) => {
      const el = (now - start) / 1000;
      ctx.clearRect(0, 0, wrap.width, wrap.height);
      let alive = 0;
      for (const p of parts) {
        const lt = (el - p.delay) / p.dur;
        if (lt < 0) { alive++; continue; }
        if (lt >= 1) continue;
        alive++;
        const e = lt * lt * (3 - 2 * lt); // smoothstep
        const x = p.sx + (mx - p.sx) * e + Math.sin(lt * Math.PI) * p.wob;
        const y = p.sy + (my - p.sy) * e;
        ctx.globalAlpha = lt < 0.85 ? 1 : Math.max(0, (1 - lt) / 0.15);
        ctx.fillStyle = p.color;
        ctx.shadowColor = '#c9a0ff'; ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(x, y, p.size * (1.25 - 0.5 * e), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.shadowBlur = 0;
      if (alive > 0) requestAnimationFrame(loop);
      else ctx.clearRect(0, 0, wrap.width, wrap.height);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------------- Vue de fin de niveau (côté Chaos) ---------------------- */
  showResult(r) {
    const ov = this.$('overlay');
    const title = this.$('overlay-title');
    const body = this.$('overlay-body');
    const btn = this.$('overlay-btn');

    // La vue de fin vit côté Chaos : on s'assure d'y être.
    this.setView('game');
    const mobile = this.isMobile();

    if (r.cleared) {
      title.textContent = '🔥 Niveau anéanti ! 🔥';
      title.className = 'cleared';
      body.innerHTML = `
        <p class="ov-lead">Rien n'a survécu à ton passage. Tu progresses vers un territoire plus coriace.</p>
        <div class="ov-stats">
          <div><span>${r.destroyed}/${r.total}</span><label>détruit</label></div>
          <div><span>💀 ${this.fmt(r.souls)}</span><label>âmes récoltées</label></div>
          <div><span>+${this.fmt(r.bonus)}</span><label>bonus de nettoyage</label></div>
          <div><span>Niv. ${r.level + 1}</span><label>prochain niveau</label></div>
        </div>
        <p class="ov-hint">Améliore tes pactes, puis pars à l'assaut du niveau suivant.</p>`;
      btn.textContent = `😈 Niveau ${r.level + 1} ▸`;
    } else {
      title.textContent = '✝️ Exorcisé ! ✝️';
      title.className = 'exorcised';
      const pct = Math.round((r.destroyed / r.total) * 100);
      body.innerHTML = `
        <p class="ov-lead">Les prières t'ont renvoyé aux Enfers... mais on comptabilise tes ravages.</p>
        <div class="ov-stats">
          <div><span>${r.destroyed}/${r.total}</span><label>détruit (${pct}%)</label></div>
          <div><span>💀 ${this.fmt(r.souls)}</span><label>âmes récoltées</label></div>
          <div><span>Niv. ${r.level}</span><label>à reconquérir</label></div>
        </div>
        <p class="ov-hint">Renforce-toi avec les âmes récoltées, puis retente ta damnation.</p>`;
      btn.textContent = `😈 Relancer le niveau ${r.level} ▸`;
    }
    // Vertu vaincue ce niveau (boss de dizaine) + éveil éventuel du Prestige.
    const g = this.game;
    if (g.justDefeatedVirtue) {
      const v = VIRTUES.find((x) => x.id === g.justDefeatedVirtue);
      const count = g.virtuesDefeatedCount();
      const note = document.createElement('div');
      note.className = 'ov-virtue';
      note.innerHTML = `⚜️ Vertu vaincue : <b>${v.emoji} ${v.name}</b>` +
        ` <span>— ${count}/${VIRTUES.length} Vertus tombées</span>`;
      body.appendChild(note);
      if (g.justUnlockedPrestige) {
        const pr = document.createElement('div');
        pr.className = 'ov-prestige';
        pr.innerHTML = `✨ Les 7 Vertus sont anéanties !<br>` +
          `<b>Le Prestige s'éveille.</b> Bientôt, tu pourras incarner un démon ` +
          `primordial pour affronter les Archanges.`;
        body.appendChild(pr);
      }
    }
    // Bouton secondaire « Améliorer » : utile sur mobile (l'arbre est un autre onglet).
    this.$('overlay-improve').classList.toggle('hidden', !mobile);
    ov.classList.remove('hidden');
    this.refresh();
  }
}
