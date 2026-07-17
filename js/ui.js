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
    // Arbre de compétences : décalage de panoramique (drag).
    this.treeOffset = { x: 0, y: 0 };
    this._treeCentered = false;
    this._treeDragged = false;
    // Présentation paginée.
    this.introPage = 0;
    this.introCount = 0;
    this.bind();
  }

  isMobile() { return this.mq.matches; }

  bind() {
    this.$('start-btn').addEventListener('click', () => this.startRun());
    this.$('resume-btn').addEventListener('click', () => this.resumeRun());
    this.$('run-control').addEventListener('click', () => this.beginRun());

    // Onglets mobile : bascule entre le jeu et la boutique.
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.addEventListener('click', () => { this.setView(b.dataset.view); this.refresh(); }));

    this.bindIntro();
    this.bindTreePan();

    this.$('overlay-btn').addEventListener('click', () => {
      this.$('overlay').classList.add('hidden');
      // Sur mobile, on renvoie vers la boutique pour dépenser ses âmes ;
      // sur grand écran, la boutique est déjà visible, on relance directement.
      if (this.isMobile()) { this.setView('shop'); this.refresh(); }
      else this.startRun();
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

  /* Lance la bonne action selon l'état (reprise ou nouvelle vie). */
  beginRun() {
    if (this.game.hasResumableRun()) this.resumeRun();
    else this.startRun();
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
    this.$('start-screen').classList.remove('hidden');
    this.refresh();
  }

  /* Bascule entre la vue jeu et la vue boutique (mobile). */
  setView(view) {
    this.view = view;
    document.getElementById('app').setAttribute('data-view', view);
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === view));
    // Le jeu ne tourne QUE sur la vue « jeu » : sur la boutique il est en pause.
    this.game.paused = (view === 'shop');
    if (view === 'game') {
      // La vue jeu venant d'apparaître, on recalcule la taille du canevas.
      window.dispatchEvent(new Event('resize'));
    } else {
      // La vue Pouvoirs venant d'apparaître : on centre l'arbre au besoin.
      requestAnimationFrame(() => this.centerTreeIfNeeded());
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
        el.title = def.name + ' — ' + def.desc;
        el.innerHTML = `
          <div class="tn-emoji">${def.emoji}</div>
          <div class="tn-name">${def.name}</div>
          <div class="tn-lvl" data-lvl></div>
          <div class="tn-cost" data-cost></div>`;
        el.addEventListener('click', () => {
          if (this._treeDragged) return; // c'était un glissement, pas un achat
          if (this.game.buyUpgrade(node.id)) {
            el.classList.add('bought');
            setTimeout(() => el.classList.remove('bought'), 200);
            this.refresh();
          }
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
      el.querySelector('[data-lvl]').textContent = maxed ? 'MAX' : `Niv. ${n}`;
      el.querySelector('[data-cost]').textContent = maxed ? '✓ MAX' : `💀 ${this.fmt(cost)}`;
      const affordable = !maxed && g.souls >= cost;
      el.classList.toggle('affordable', affordable);
      el.classList.toggle('maxed', maxed);
      el.classList.toggle('locked', !maxed && !affordable);
      const line = this.$('tree-links').querySelector(`line[data-id="${def.id}"]`);
      if (line) line.classList.toggle('lit', n > 0);
    }
    this.centerTreeIfNeeded();
  }

  /* --- Panoramique (drag) de l'arbre --- */
  bindTreePan() {
    const el = this.$('skilltree');
    let down = false, sx = 0, sy = 0, ox = 0, oy = 0;
    const pt = (e) => (e.touches ? e.touches[0] : e);
    el.addEventListener('pointerdown', (e) => {
      down = true; this._treeDragged = false;
      const p = pt(e); sx = p.clientX; sy = p.clientY;
      ox = this.treeOffset.x; oy = this.treeOffset.y;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const p = pt(e);
      const dx = p.clientX - sx, dy = p.clientY - sy;
      if (!this._treeDragged && Math.hypot(dx, dy) > 6) {
        this._treeDragged = true;
        this.$('tree-hint').classList.add('gone');
      }
      if (this._treeDragged) {
        this.treeOffset.x = ox + dx;
        this.treeOffset.y = oy + dy;
        this.applyTreeTransform();
      }
    });
    window.addEventListener('pointerup', () => {
      down = false;
      // On lève le drapeau après le clic éventuel (qui suit le pointerup).
      setTimeout(() => { this._treeDragged = false; }, 0);
    });
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
    this.treeOffset.x = this.clampAxis(this.treeOffset.x, vpW, TREE_W);
    this.treeOffset.y = this.clampAxis(this.treeOffset.y, vpH, TREE_H);
    this.$('tree-world').style.transform =
      `translate(${this.treeOffset.x}px, ${this.treeOffset.y}px)`;
  }

  centerTree() {
    const el = this.$('skilltree');
    const vpW = el.clientWidth, vpH = el.clientHeight;
    if (!vpW || !vpH) return false;
    const root = SKILL_TREE.find((n) => n.id === 'root');
    this.treeOffset = { x: vpW / 2 - root.x, y: vpH / 2 - root.y };
    this.applyTreeTransform();
    return true;
  }

  centerTreeIfNeeded() {
    if (this._treeCentered) return;
    if (this.centerTree()) this._treeCentered = true;
  }

  /* ---------------------- HUD ---------------------- */
  refresh() {
    const g = this.game;
    this.$('souls').textContent = this.fmt(g.souls);
    this.$('level').textContent = g.level;
    this.$('best').textContent = g.bestLevel;
    this.$('total-destroyed').textContent = this.fmt(g.totalDestroyed);
    this.refreshTree();

    const playing = g.phase === 'playing';
    if (playing) {
      const frac = g.stats ? g.timeLeft / g.stats.lifespan : 0;
      this.$('timer-text').textContent = g.timeLeft.toFixed(1) + 's';
      this.$('progress-text').textContent = `${g.runDestroyed} / ${g.totalToDestroy}`;
      // Le compte à rebours s'affole dans les 5 dernières secondes.
      this.$('hud').classList.toggle('low', g.timeLeft <= 5);
      // Fine barre de survie visible aussi sur l'onglet boutique (mobile).
      this.$('nav-timer-fill').style.width = (frac * 100) + '%';
    } else {
      this.$('nav-timer-fill').style.width = '100%';
    }

    // Bouton de lancement/reprise en tête de boutique (masqué pendant le jeu).
    const rc = this.$('run-control');
    rc.classList.toggle('hidden', playing);
    if (!playing) {
      if (g.hasResumableRun()) {
        rc.textContent = '▸ Reprendre la partie';
        rc.classList.add('resume');
      } else {
        rc.classList.remove('resume');
        rc.textContent = (g.level === 1 && g.totalDestroyed === 0)
          ? '😈 Semer le chaos ▸'
          : `😈 Envahir le niveau ${g.level} ▸`;
      }
    }

    // Pastille sur l'onglet boutique : nombre de pouvoirs abordables.
    const badge = this.$('nav-shop-badge');
    let affordable = 0;
    for (const def of UPGRADES) {
      const n = g.upgradeLevel(def.id);
      if (n < def.max && g.souls >= g.upgradeCost(def)) affordable++;
    }
    if (affordable > 0) { badge.textContent = affordable; badge.classList.remove('hidden'); }
    else badge.classList.add('hidden');
  }

  /* ---------------------- Écran de fin de vie ---------------------- */
  showResult(r) {
    const ov = this.$('overlay');
    const title = this.$('overlay-title');
    const body = this.$('overlay-body');
    const btn = this.$('overlay-btn');

    // L'overlay vit dans la vue jeu : on s'assure qu'elle est affichée.
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
        <p class="ov-hint">Dépense tes âmes dans l'arbre des pactes, puis renais plus puissant.</p>`;
      btn.textContent = mobile ? '😈 Améliorer mes pouvoirs ▸' : `Envahir le niveau ${r.level + 1} ▸`;
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
      btn.textContent = mobile ? '😈 Améliorer mes pouvoirs ▸' : 'Renaître ▸';
    }
    ov.classList.remove('hidden');
    this.refresh();
  }
}
