/* =========================================================================
 * Hellcremental — Interface (HUD, boutique, écrans de fin)
 * ========================================================================= */

class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.shopBuilt = false;
    this.view = 'game';
    this.mq = window.matchMedia('(max-width: 860px)');
    this.bind();
  }

  isMobile() { return this.mq.matches; }

  bind() {
    this.$('start-btn').addEventListener('click', () => this.startRun());
    this.$('resume-btn').addEventListener('click', () => this.resumeRun());
    this.$('run-control').addEventListener('click', () => this.beginRun());

    // Onglets mobile : bascule entre le jeu et la boutique.
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.addEventListener('click', () => this.setView(b.dataset.view)));

    this.$('overlay-btn').addEventListener('click', () => {
      this.$('overlay').classList.add('hidden');
      // Sur mobile, on renvoie vers la boutique pour dépenser ses âmes ;
      // sur grand écran, la boutique est déjà visible, on relance directement.
      if (this.isMobile()) { this.setView('shop'); this.refresh(); }
      else this.startRun();
    });

    // --- Menu Options / sauvegarde ---
    this.$('menu-btn').addEventListener('click', () => this.openMenu());
    this.$('options-btn').addEventListener('click', () => this.openMenu());
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
        this.buildShop();
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
    this.$('start-screen').classList.remove('hidden');
    this.refresh();
  }

  /* Bascule entre la vue jeu et la vue boutique (mobile). */
  setView(view) {
    this.view = view;
    document.getElementById('app').setAttribute('data-view', view);
    document.querySelectorAll('.nav-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.view === view));
    // La vue jeu venant d'apparaître, on recalcule la taille du canevas.
    if (view === 'game') window.dispatchEvent(new Event('resize'));
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
      this.buildShop();
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

  /* ---------------------- Boutique ---------------------- */
  buildShop() {
    const box = this.$('shop-list');
    box.innerHTML = '';
    for (const def of UPGRADES) {
      const el = document.createElement('button');
      el.className = 'upgrade';
      el.dataset.id = def.id;
      el.innerHTML = `
        <div class="up-emoji">${def.emoji}</div>
        <div class="up-body">
          <div class="up-head">
            <span class="up-name">${def.name}</span>
            <span class="up-lvl" data-lvl></span>
          </div>
          <div class="up-desc">${def.desc}</div>
          <div class="up-foot">
            <span class="up-effect" data-effect></span>
            <span class="up-cost" data-cost></span>
          </div>
        </div>`;
      el.addEventListener('click', () => {
        if (this.game.buyUpgrade(def.id)) {
          el.classList.add('bought');
          setTimeout(() => el.classList.remove('bought'), 220);
          this.refresh();
        }
      });
      box.appendChild(el);
    }
    this.shopBuilt = true;
  }

  refreshShop() {
    if (!this.shopBuilt) this.buildShop();
    const g = this.game;
    for (const def of UPGRADES) {
      const el = this.$('shop-list').querySelector(`[data-id="${def.id}"]`);
      const n = g.upgradeLevel(def.id);
      const maxed = n >= def.max;
      const cost = g.upgradeCost(def);
      el.querySelector('[data-lvl]').textContent = maxed ? 'MAX' : `Niv. ${n}`;
      el.querySelector('[data-effect]').textContent = n > 0 ? def.effect(n) : def.effect(1) + ' (aperçu)';
      const costEl = el.querySelector('[data-cost]');
      costEl.textContent = maxed ? '—' : `💀 ${this.fmt(cost)}`;
      const affordable = !maxed && g.souls >= cost;
      el.classList.toggle('affordable', affordable);
      el.classList.toggle('locked', maxed || !affordable);
      el.disabled = maxed || !affordable;
    }
  }

  /* ---------------------- HUD ---------------------- */
  refresh() {
    const g = this.game;
    this.$('souls').textContent = this.fmt(g.souls);
    this.$('level').textContent = g.level;
    this.$('best').textContent = g.bestLevel;
    this.$('total-destroyed').textContent = this.fmt(g.totalDestroyed);
    this.refreshShop();

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
        <p class="ov-hint">Dépense tes âmes dans la boutique, puis renais plus puissant.</p>`;
      btn.textContent = mobile ? '🛒 Améliorer mes pouvoirs ▸' : `Envahir le niveau ${r.level + 1} ▸`;
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
      btn.textContent = mobile ? '🛒 Améliorer mes pouvoirs ▸' : 'Renaître ▸';
    }
    ov.classList.remove('hidden');
    this.refresh();
  }
}
