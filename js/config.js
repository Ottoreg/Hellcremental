/* =========================================================================
 * Hellcremental — Configuration & données de jeu
 * Toutes les constantes d'équilibrage, les types de cibles et les pouvoirs.
 * ========================================================================= */

const CONFIG = {
  // --- Rendu isométrique ---
  TILE_W: 64,        // largeur d'une tuile losange
  TILE_H: 32,        // hauteur d'une tuile losange (ratio 2:1)

  // --- Boucle de jeu ---
  BASE_LIFESPAN: 28,     // secondes avant exorcisme (niveau 1, sans amélioration)
  BASE_DAMAGE: 6,        // dégâts de base par coup du démon
  BASE_ATTACK_INTERVAL: 0.55, // secondes entre deux coups
  BASE_MOVE_SPEED: 3.2,  // cases par seconde
  BASE_CLICK_DAMAGE: 8,  // dégâts d'un clic infernal

  // --- Génération de niveau ---
  GRID_MIN: 5,
  GRID_MAX: 13,
};

/* -------------------------------------------------------------------------
 * Types de cibles destructibles.
 * hp    : points de vie de base
 * value : âmes récoltées de base à la destruction
 * emoji : représentation visuelle
 * living: être vivant (bonus d'âmes, gémit en mourant)
 * ------------------------------------------------------------------------- */
const TARGET_TYPES = {
  buisson:    { name: 'Buisson',      emoji: '🌿', hp: 8,   value: 1,  living: false },
  fleur:      { name: 'Parterre',     emoji: '🌷', hp: 6,   value: 2,  living: false },
  arbre:      { name: 'Arbre',        emoji: '🌳', hp: 22,  value: 4,  living: false },
  rocher:     { name: 'Rocher',       emoji: '🪨', hp: 45,  value: 6,  living: false },
  mouton:     { name: 'Mouton',       emoji: '🐑', hp: 14,  value: 7,  living: true  },
  vache:      { name: 'Vache',        emoji: '🐄', hp: 20,  value: 9,  living: true  },
  villageois: { name: 'Villageois',   emoji: '🧑‍🌾', hp: 16, value: 12, living: true  },
  maison:     { name: 'Chaumière',    emoji: '🏠', hp: 70,  value: 18, living: false },
  puits:      { name: 'Puits',        emoji: '⛲', hp: 55,  value: 14, living: false },
  eglise:     { name: 'Chapelle',     emoji: '⛪', hp: 120, value: 40, living: false },
  statue:     { name: 'Statue sainte',emoji: '🗿', hp: 160, value: 55, living: false },
  chevalier:  { name: 'Paladin',      emoji: '🛡️', hp: 90,  value: 45, living: true  },

  // Prêtre : prie pour exorciser le démon plus vite (draine sa durée de vie).
  pretre:     { name: 'Prêtre',       emoji: '🧎', hp: 18,  value: 16, living: true  },

  // Boss (tous les 10 niveaux) : bien plus grands et coriaces.
  boss_cathedrale: { name: 'Grande Cathédrale', emoji: '⛪', hp: 220, value: 140, living: false },
  boss_forteresse: { name: 'Forteresse Sainte',  emoji: '🏰', hp: 260, value: 170, living: false },
  boss_seraphin:   { name: 'Séraphin Vengeur',   emoji: '😇', hp: 190, value: 160, living: true  },
  boss_colosse:    { name: 'Colosse Béni',       emoji: '🗽', hp: 300, value: 150, living: false },
};

/* Réglages boss & prêtres. */
const BOSS_POOL = ['boss_cathedrale', 'boss_forteresse', 'boss_seraphin', 'boss_colosse'];
const BOSS_HP_FACTOR = 4;   // multiplicateur de PV supplémentaire du boss
const BOSS_SCALE = 2.1;     // taille visuelle du boss
const PRIEST_DRAIN = 0.3;   // chaque prêtre accélère l'exorcisme de +30%
function isBossLevel(level) { return level % 10 === 0; }

/* -------------------------------------------------------------------------
 * Palettes de niveaux : quels types apparaissent, et à quelle fréquence.
 * On débloque des types plus coriaces au fil de la progression.
 * ------------------------------------------------------------------------- */
const LEVEL_THEMES = [
  { name: 'Prairie paisible',  min: 1,  pool: { buisson: 5, fleur: 4, arbre: 3, mouton: 2 } },
  { name: 'Ferme prospère',    min: 3,  pool: { arbre: 3, mouton: 3, vache: 3, buisson: 2, maison: 1 } },
  { name: 'Hameau pieux',      min: 6,  pool: { maison: 3, villageois: 4, puits: 2, arbre: 2, rocher: 2 } },
  { name: 'Village fortifié',  min: 10, pool: { maison: 3, villageois: 3, rocher: 3, chevalier: 2, eglise: 1 } },
  { name: 'Cité sainte',       min: 15, pool: { eglise: 2, statue: 2, chevalier: 3, maison: 2, villageois: 3 } },
  { name: 'Bastion céleste',   min: 22, pool: { statue: 3, eglise: 3, chevalier: 4, puits: 2 } },
];

/* -------------------------------------------------------------------------
 * Pouvoirs achetables (progression incrémentale, persistants entre les vies).
 * cost(level)   -> coût du prochain niveau
 * apply(stats,n)-> applique n niveaux de l'amélioration aux stats du démon
 * ------------------------------------------------------------------------- */
const UPGRADES = [
  {
    id: 'griffes', name: 'Griffes Infernales', emoji: '🩸',
    desc: 'Chaque coup déchire davantage la chair et la pierre.',
    baseCost: 10, mult: 1.32, max: 999,
    effect: (n) => `+${3 * n} dégâts`,
    apply: (s, n) => { s.damage += 3 * n; },
  },
  {
    id: 'frenesie', name: 'Frénésie Démoniaque', emoji: '⚡',
    desc: 'Frappe de plus en plus vite, jusqu\'au déchaînement.',
    baseCost: 25, mult: 1.45, max: 25,
    effect: (n) => `−${Math.round((1 - Math.pow(0.93, n)) * 100)}% délai d'attaque`,
    apply: (s, n) => { s.attackInterval *= Math.pow(0.93, n); },
  },
  {
    id: 'pattes', name: 'Pattes Véloces', emoji: '🦶',
    desc: 'Se déplace plus vite d\'une victime à l\'autre.',
    baseCost: 18, mult: 1.38, max: 40,
    effect: (n) => `+${(0.4 * n).toFixed(1)} vitesse`,
    apply: (s, n) => { s.moveSpeed += 0.4 * n; },
  },
  {
    // Bonus de survie plafonné à +40 s au total (max 10 niveaux × +4 s).
    id: 'longevite', name: 'Longévité Maudite', emoji: '⏳',
    desc: 'Résiste plus longtemps avant d\'être exorcisé (jusqu\'à +40 s).',
    baseCost: 22, mult: 1.5, max: 10,
    effect: (n) => `+${4 * n}s de survie`,
    apply: (s, n) => { s.lifespan += 4 * n; },
  },
  {
    id: 'souffle', name: 'Souffle de Feu', emoji: '🔥',
    desc: 'Les flammes se propagent aux cibles adjacentes.',
    baseCost: 60, mult: 1.6, max: 20,
    effect: (n) => `${Math.round(n * 25)}% de dégâts de zone`,
    apply: (s, n) => { s.splash += 0.25 * n; },
  },
  {
    id: 'recolte', name: 'Récolte d\'Âmes', emoji: '💀',
    desc: 'Extrait davantage d\'âmes de chaque destruction.',
    baseCost: 45, mult: 1.5, max: 40,
    effect: (n) => `+${Math.round(n * 15)}% d'âmes`,
    apply: (s, n) => { s.soulMult += 0.15 * n; },
  },
  {
    id: 'minions', name: 'Esprits Serviteurs', emoji: '👿',
    desc: 'Invoque des lutins qui détruisent à tes côtés.',
    baseCost: 120, mult: 1.75, max: 8,
    effect: (n) => `+${n} serviteur${n > 1 ? 's' : ''}`,
    apply: (s, n) => { s.minions += n; },
  },
  {
    id: 'cataclysme', name: 'Clic Cataclysmique', emoji: '☄️',
    desc: 'Ton clic frappe plus fort la cible visée.',
    baseCost: 45, mult: 1.35, max: 50,
    effect: (n) => `+${6 * n} dégâts au clic`,
    apply: (s, n) => { s.clickDamage += 6 * n; },
  },
  {
    id: 'demolisseur', name: 'Le Démolisseur', emoji: '👹',
    desc: 'Invoque un colosse démoniaque qui s\'acharne sur les bâtiments et objets, ' +
          'avec des dégâts massifs contre tout ce qui n\'est pas vivant.',
    baseCost: 2500, mult: 1, max: 1,
    effect: () => 'Colosse actif : cible le non-vivant en priorité, dégâts renforcés',
    apply: (s, n) => { s.demolisher += n; },
  },

  // --- Spécialisation : deux voies exclusives (choisir l'une verrouille l'autre) ---
  {
    id: 'voie_magie', name: 'Voie de la Magie', emoji: '🔮',
    desc: 'Embrasse les arcanes démoniaques et débloque des sorts dévastateurs. ' +
          'Choix exclusif : verrouille définitivement la Voie des Légions.',
    baseCost: 400, mult: 1, max: 1,
    effect: () => 'Voie engagée : sorts magiques débloqués',
    apply: (s, n) => { s.voieMagie += n; },
  },
  {
    id: 'foudre', name: 'Foudre Infernale', emoji: '⚡', active: true,
    desc: 'Sort ACTIF : la foudre s\'abat sur plusieurs cases occupées au hasard ' +
          'et leur inflige de lourds dégâts. À déclencher toi-même.',
    baseCost: 250, mult: 1.55, max: 15,
    effect: (n) => `Frappe ${2 + n} cases · recharge ${Math.max(4, 14 - n)}s`,
    apply: (s, n) => { s.foudre = n; },
  },
  {
    id: 'pyromancie', name: 'Pyromancie', emoji: '🔥',
    desc: 'Tes flammes se propagent plus violemment aux cibles adjacentes.',
    baseCost: 300, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 30)}% de dégâts de zone`,
    apply: (s, n) => { s.splash += 0.3 * n; },
  },
  {
    id: 'voie_legion', name: 'Voie des Légions', emoji: '🎖️',
    desc: 'Commande une armée : tes serviteurs deviennent redoutables. ' +
          'Choix exclusif : verrouille définitivement la Voie de la Magie.',
    baseCost: 400, mult: 1, max: 1,
    effect: () => 'Voie engagée : serviteurs renforcés débloqués',
    apply: (s, n) => { s.voieLegion += n; },
  },
  {
    id: 'legion_force', name: 'Serviteurs Aguerris', emoji: '💪',
    desc: 'Chaque serviteur — et le Démolisseur — frappe bien plus fort.',
    baseCost: 350, mult: 1.45, max: 25,
    effect: (n) => `+${Math.round(n * 25)}% de dégâts des serviteurs`,
    apply: (s, n) => { s.minionDmgBonus += 0.25 * n; },
  },
  {
    id: 'voie_clic', name: 'Voie du Clic Démoniaque', emoji: '🖐️',
    desc: 'Canalise ta rage dans ta griffe : tes clics deviennent dévastateurs. ' +
          'Choix exclusif : verrouille définitivement les autres voies.',
    baseCost: 400, mult: 1, max: 1,
    effect: () => 'Voie engagée : clic démoniaque débloqué',
    apply: (s, n) => { s.voieClic += n; },
  },
  {
    id: 'clic_demon', name: 'Poing Démoniaque', emoji: '👊',
    desc: 'Décuple encore les dégâts de ton clic infernal.',
    baseCost: 600, mult: 1.4, max: 40,
    effect: (n) => `+${20 * n} dégâts au clic`,
    apply: (s, n) => { s.clickDamage += 20 * n; },
  },
  {
    id: 'nappe_feu', name: 'Nappe de Feu', emoji: '🌋',
    desc: 'Ton clic embrase le sol : une nappe de flammes brûle les cibles ' +
          'autour du point cliqué pendant quelques secondes.',
    baseCost: 350, mult: 1.5, max: 20,
    effect: (n) => `Brasier ${(3 + n * 0.3).toFixed(1)}s · dégâts de zone au clic`,
    apply: (s, n) => { s.fireWave = n; },
  },
];

/* Attaque active : métadonnées (recharge). */
const ACTIVE_ABILITIES = {
  foudre: { cooldown: (lvl) => Math.max(4, 14 - lvl) },
};

/* -------------------------------------------------------------------------
 * Arbre de compétences : position (en coordonnées « monde ») de chaque pouvoir
 * et lien vers son parent. La vue se parcourt librement au drag.
 * ------------------------------------------------------------------------- */
const TREE_W = 1200;
const TREE_H = 860;
const SKILL_TREE = [
  { id: 'root',        x: 560, y: 430 },                   // le démon (non achetable)
  { id: 'griffes',     x: 560, y: 260, parent: 'root' },
  { id: 'cataclysme',  x: 560, y: 105, parent: 'griffes' },
  { id: 'frenesie',    x: 360, y: 185, parent: 'griffes' },
  { id: 'souffle',     x: 760, y: 185, parent: 'griffes' },
  { id: 'pattes',      x: 355, y: 440, parent: 'root' },
  { id: 'longevite',   x: 245, y: 610, parent: 'pattes' },
  { id: 'recolte',     x: 765, y: 440, parent: 'root' },
  { id: 'minions',     x: 875, y: 610, parent: 'recolte' },
  // Débloqué seulement quand les Esprits Serviteurs sont au maximum (req).
  { id: 'demolisseur', x: 940, y: 770, parent: 'minions', req: 8 },

  // Voie de la Magie (exclusive) — prolonge la branche du feu.
  { id: 'voie_magie',  x: 960, y: 165, parent: 'souffle', req: 1, group: 'voie' },
  { id: 'foudre',      x: 1110, y: 95, parent: 'voie_magie', req: 1 },
  { id: 'pyromancie',  x: 1110, y: 245, parent: 'voie_magie', req: 1 },

  // Voie des Légions (exclusive) — prolonge la branche des serviteurs.
  { id: 'voie_legion', x: 690, y: 720, parent: 'minions', req: 1, group: 'voie' },
  { id: 'legion_force',x: 545, y: 785, parent: 'voie_legion', req: 1 },

  // Voie du Clic Démoniaque (exclusive) — prolonge la branche du clic.
  { id: 'voie_clic',   x: 430, y: 65,  parent: 'cataclysme', req: 1, group: 'voie' },
  { id: 'clic_demon',  x: 280, y: 55,  parent: 'voie_clic', req: 1 },
  { id: 'nappe_feu',   x: 205, y: 170, parent: 'voie_clic', req: 1 },
];
