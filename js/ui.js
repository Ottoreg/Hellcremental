/* =========================================================================
 * Hellcremental — Interface (HUD, boutique, écrans de fin)
 * ========================================================================= */

class UI {
  constructor(game) {
    this.game = game;
    this.$ = (id) => document.getElementById(id);
    this.shopBuilt = false;
    this.bind();
  }

  bind() {
    this.$('start-btn').addEventListener('click', () => this.startRun());
    this.$('resume-btn').addEventListener('click', () => this.resumeRun());
    this.$('overlay-btn').addEventListener('click', () => {
      this.$('overlay').classList.add('hidden');
      this.startRun();
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

  startRun() {
    this.$('start-screen').classList.add('hidden');
    this.game.startRun();
    this.refresh();
  }

  resumeRun() {
    this.$('start-screen').classList.add('hidden');
    this.game.resumeRun();
    this.refresh();
  }

  showStartScreen() {
    // Propose « Reprendre » si une partie est sauvegardée.
    this.$('resume-btn').classList.toggle('hidden', !this.game.hasResumableRun());
    this.$('start-btn').textContent = this.game.hasResumableRun()
      ? 'Nouvelle vie (niveau ' + this.game.level + ') ▸'
      : 'Semer le chaos ▸';
    this.$('start-screen').classList.remove('hidden');
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

    if (g.phase === 'playing') {
      const frac = g.stats ? g.timeLeft / g.stats.lifespan : 0;
      this.$('timer-fill').style.width = (frac * 100) + '%';
      this.$('timer-text').textContent = g.timeLeft.toFixed(1) + 's';
      this.$('progress-text').textContent = `${g.runDestroyed} / ${g.totalToDestroy}`;
      const pf = g.totalToDestroy ? g.runDestroyed / g.totalToDestroy : 0;
      this.$('progress-fill').style.width = (pf * 100) + '%';
      this.$('theme-name').textContent = g.pickTheme().name;
    }
  }

  /* ---------------------- Écran de fin de vie ---------------------- */
  showResult(r) {
    const ov = this.$('overlay');
    const title = this.$('overlay-title');
    const body = this.$('overlay-body');
    const btn = this.$('overlay-btn');

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
      btn.textContent = `Envahir le niveau ${r.level + 1} ▸`;
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
      btn.textContent = 'Renaître ▸';
    }
    ov.classList.remove('hidden');
    this.refresh();
  }
}
