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
};

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
    id: 'longevite', name: 'Longévité Maudite', emoji: '⏳',
    desc: 'Résiste plus longtemps avant d\'être exorcisé.',
    baseCost: 22, mult: 1.4, max: 60,
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
    baseCost: 15, mult: 1.35, max: 50,
    effect: (n) => `+${6 * n} dégâts au clic`,
    apply: (s, n) => { s.clickDamage += 6 * n; },
  },
];

/* -------------------------------------------------------------------------
 * Arbre de compétences : position (en coordonnées « monde ») de chaque pouvoir
 * et lien vers son parent. La vue se parcourt librement au drag.
 * ------------------------------------------------------------------------- */
const TREE_W = 1000;
const TREE_H = 780;
const SKILL_TREE = [
  { id: 'root',       x: 500, y: 420 },                    // le démon (non achetable)
  { id: 'griffes',    x: 500, y: 250, parent: 'root' },
  { id: 'cataclysme', x: 500, y: 95,  parent: 'griffes' },
  { id: 'frenesie',   x: 300, y: 175, parent: 'griffes' },
  { id: 'souffle',    x: 700, y: 175, parent: 'griffes' },
  { id: 'pattes',     x: 295, y: 430, parent: 'root' },
  { id: 'longevite',  x: 185, y: 600, parent: 'pattes' },
  { id: 'recolte',    x: 705, y: 430, parent: 'root' },
  { id: 'minions',    x: 815, y: 600, parent: 'recolte' },
];
