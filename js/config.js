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
  GRID_MAX: 16,
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
  chevalier:  { name: 'Paladin',      emoji: '💂', hp: 90,  value: 45, living: true  },

  // --- Cibles urbaines (biomes Ville → Métropole) ---
  citadin:    { name: 'Citadin',      emoji: '🚶', hp: 16,  value: 15, living: true  },
  employe:    { name: 'Employé',      emoji: '🧑‍💼', hp: 20, value: 20, living: true  },
  policier:   { name: 'Policier',     emoji: '👮', hp: 110, value: 55, living: true  },
  voiture:    { name: 'Voiture',      emoji: '🚗', hp: 45,  value: 14, living: false },
  bus:        { name: 'Bus',          emoji: '🚌', hp: 80,  value: 24, living: false },
  boutique:   { name: 'Boutique',     emoji: '🏪', hp: 95,  value: 28, living: false },
  immeuble:   { name: 'Immeuble',     emoji: '🏢', hp: 150, value: 36, living: false },
  usine:      { name: 'Usine',        emoji: '🏭', hp: 210, value: 50, living: false },
  hopital:    { name: 'Hôpital',      emoji: '🏥', hp: 250, value: 64, living: false },
  hotel:      { name: 'Hôtel',        emoji: '🏨', hp: 200, value: 52, living: false },
  banque:     { name: 'Banque',       emoji: '🏦', hp: 240, value: 72, living: false },
  gratteciel: { name: 'Gratte-ciel',  emoji: '🏬', hp: 340, value: 92, living: false },
  tour:       { name: 'Tour',         emoji: '🗼', hp: 300, value: 88, living: false },

  // Prêtre : prie pour exorciser le démon plus vite (draine sa durée de vie).
  // priestLike : unité hostile qui accélère l'exorcisme (drain). Sert de base
  // générique aux « exorcistes » de chaque monde (prêtre, ange…).
  pretre:     { name: 'Prêtre',       emoji: '🧎', hp: 18,  value: 16, living: true, priestLike: true },

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
 * Les 7 Vertus — boss de chaque dizaine (niveaux 10, 20, … 70). Chacune
 * s'oppose à un péché capital (donc à un démon primordial). Une fois les
 * 7 Vertus vaincues, le système de Prestige s'éveille (développé plus tard :
 * incarner un démon primordial pour affronter les Archanges méga-boss).
 * ------------------------------------------------------------------------- */
const VIRTUES = [
  // NB : emojis à un seul codepoint (pas de sélecteur VS16) pour un rendu
  // centré fiable sur tous les navigateurs (les séquences VS16 comme 🕊️/⚖️
  // se décalaient hors de l'aura sur certains PC).
  { id: 'humilite',      name: 'Humilité',      sin: 'orgueil',     emoji: '🙏', hp: 240, value: 200 },
  { id: 'charite',       name: 'Charité',       sin: 'avarice',     emoji: '🤲', hp: 260, value: 230 },
  { id: 'chastete',      name: 'Chasteté',      sin: 'luxure',      emoji: '💠', hp: 280, value: 260 },
  { id: 'bienveillance', name: 'Bienveillance', sin: 'envie',       emoji: '🤝', hp: 300, value: 290 },
  { id: 'temperance',    name: 'Tempérance',    sin: 'gourmandise', emoji: '🍃', hp: 320, value: 320 },
  { id: 'patience',      name: 'Patience',      sin: 'colere',      emoji: '🧘', hp: 340, value: 350 },
  { id: 'diligence',     name: 'Diligence',     sin: 'paresse',     emoji: '🐝', hp: 360, value: 380 },
];
// Injecte chaque Vertu comme type de cible « boss vivant ».
for (const v of VIRTUES) {
  TARGET_TYPES['virtue_' + v.id] = { name: v.name, emoji: v.emoji, hp: v.hp, value: v.value, living: true, virtue: v.id };
}
/* Renvoie la Vertu servant de boss pour ce niveau (10→1re … 70→7e), sinon null. */
function virtueForLevel(level) {
  if (level % 10 !== 0) return null;
  const tier = level / 10;
  return (tier >= 1 && tier <= VIRTUES.length) ? VIRTUES[tier - 1] : null;
}

/* -------- Mode « Fin du Monde » (épreuve d'endurance post-niveau 70) --------
 * Une fois le niveau 70 vaincu (les 7 Vertus tombées), le joueur peut, au lieu
 * de prestiger tout de suite, lancer cette épreuve : un seul long niveau formé
 * de 7 grilles enchaînées, chacune gardée par une Vertu qui revient à son tour.
 * Nettoyer une grille fait apparaître la suivante. Vaincre les 7 → +5 points. */
const WORLDEND_STAGES = VIRTUES.length;   // 7 grilles, une par Vertu
const WORLDEND_BASE_LEVEL = 70;           // difficulté de base des grilles
const WORLDEND_STEP = 3;                  // +3 « niveaux » de difficulté par grille
const WORLDEND_REWARD = 3;                // points de prestige à la victoire
const WORLDEND_TIME = 60;                 // survie plafonnée à 60 s pour toute l'épreuve

/* -------------------------------------------------------------------------
 * Biomes : les 70 premiers niveaux traversent 7 zones (10 niveaux chacune),
 * de la campagne à la métropole, chacune avec ses cibles et sa couleur de sol.
 * Au-delà du niveau 70, un biome est tiré au hasard (déterministe par graine).
 * ------------------------------------------------------------------------- */
const BIOMES = [
  { id: 'campagne',    name: 'Campagne',      ground: ['#3d5a3a', '#456a41'],
    pool: { buisson: 5, fleur: 4, arbre: 4, mouton: 3, vache: 2, rocher: 1 } },
  { id: 'hameau',      name: 'Petit Hameau',  ground: ['#4a5a38', '#556740'],
    pool: { maison: 2, villageois: 3, mouton: 2, arbre: 3, puits: 2, buisson: 2, vache: 1 } },
  { id: 'village',     name: 'Village',       ground: ['#57543a', '#635f42'],
    pool: { maison: 3, villageois: 3, puits: 2, eglise: 1, arbre: 2, chevalier: 1, rocher: 1 } },
  { id: 'petiteville', name: 'Petite Ville',  ground: ['#4f4a44', '#5a544d'],
    pool: { maison: 3, boutique: 2, citadin: 3, voiture: 2, eglise: 1, villageois: 2, statue: 1 } },
  { id: 'ville',       name: 'Ville',         ground: ['#494a50', '#53545b'],
    pool: { immeuble: 3, boutique: 2, citadin: 3, voiture: 2, policier: 1, hotel: 1, bus: 1, employe: 1 } },
  { id: 'grandeville', name: 'Grande Ville',  ground: ['#44464d', '#4d4f57'],
    pool: { immeuble: 3, hopital: 1, banque: 1, citadin: 3, policier: 2, voiture: 2, usine: 1, bus: 1, employe: 2 } },
  { id: 'metropole',   name: 'Métropole',     ground: ['#3d3f47', '#474a53'],
    pool: { gratteciel: 3, immeuble: 2, tour: 1, banque: 1, citadin: 3, policier: 2, voiture: 2, bus: 1, employe: 2, hopital: 1 } },
];

/* Biome d'un niveau : 1→7 en zones fixes (10 niveaux), aléatoire ensuite. */
function biomeForLevel(level, seed) {
  if (level <= 70) return BIOMES[Math.min(BIOMES.length - 1, Math.ceil(level / 10) - 1)];
  const r = seededRandom(seed || 0, level, 4242)();
  return BIOMES[Math.floor(r * BIOMES.length)];
}

/* Respawn : à partir du niveau 31, les entités vivantes non achevées
 * réapparaissent lentement — il faut tout tuer assez vite pour finir. */
const RESPAWN_MIN_LEVEL = 31;
const RESPAWN_DELAY = 8; // secondes avant réapparition d'une entité vivante

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
    desc: 'Se déplace plus vite d\'une victime à l\'autre. Limité à 9 crans : la ' +
          'vitesse de base plafonne autour de 5 — au-delà, seuls les prestiges et ' +
          'pactes primordiaux accélèrent encore.',
    baseCost: 250, mult: 2.5, max: 9,
    effect: (n) => `+${(0.2 * n).toFixed(1)} vitesse`,
    apply: (s, n) => { s.moveSpeed += 0.2 * n; },
  },
  // Longévité : trois pactes uniques de +5 s, chacun 20× plus cher que le précédent.
  {
    id: 'longevite1', name: 'Longévité Maudite', emoji: '⏳',
    desc: 'Résiste 5 secondes de plus avant d\'être exorcisé.',
    baseCost: 90, mult: 1, max: 1,
    effect: () => '+5s de survie',
    apply: (s, n) => { s.lifespan += 5 * n; },
  },
  {
    id: 'longevite2', name: 'Endurance Damnée', emoji: '⌛',
    desc: 'Encore 5 secondes de sursis avant l\'exorcisme.',
    baseCost: 3500, mult: 1, max: 1,
    effect: () => '+5s de survie',
    apply: (s, n) => { s.lifespan += 5 * n; },
  },
  {
    id: 'longevite3', name: 'Âme Increvable', emoji: '🕰️',
    desc: 'Un dernier répit de 5 secondes face aux prières.',
    baseCost: 90000, mult: 1, max: 1,
    effect: () => '+5s de survie',
    apply: (s, n) => { s.lifespan += 5 * n; },
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
    desc: 'Débloque le clic infernal : touche une cible pour la frapper toi-même. ' +
          'Chaque niveau augmente les dégâts du clic.',
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

  // --- Spécialisation : trois voies exclusives (choisir l'une verrouille les autres) ---
  {
    id: 'pacte_libre', name: 'Serment du Chaos Absolu', emoji: '♾️',
    desc: 'Brise la loi des voies. Une fois ce serment scellé, la règle du choix ' +
          'unique ne s\'applique plus : tu peux emprunter TOUTES les voies ' +
          '(Magie, Légions et Clic) au lieu d\'une seule. MALUS : ta puissance ' +
          'démoniaque devient si voyante que les exorcistes ciblent tes pouvoirs ' +
          'bien plus vite — le temps avant exorcisme est DIVISÉ PAR 2.',
    baseCost: 1000000, mult: 1, max: 1,
    effect: () => 'Toutes les voies accessibles · MALUS : longévité ÷2',
    apply: (s, n) => { s.voiesLibres = n; },
  },
  {
    id: 'voie_magie', name: 'Voie de la Magie', emoji: '🔮',
    desc: 'Embrasse les arcanes démoniaques et débloque des sorts dévastateurs. ' +
          'Choix exclusif : verrouille les autres voies — sauf si tu as scellé ' +
          'le Serment du Chaos Absolu.',
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
    id: 'foudre_dmg', name: 'Foudre Dévastatrice', emoji: '🌩️',
    desc: 'Surcharge ta Foudre Infernale : chaque frappe inflige bien plus de dégâts.',
    baseCost: 800, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 20)}% de dégâts de la Foudre`,
    apply: (s, n) => { s.foudreDmg += 0.2 * n; },
  },
  {
    id: 'pyromancie', name: 'Pyromancie', emoji: '🔥',
    desc: 'Tes flammes se propagent plus violemment aux cibles adjacentes.',
    baseCost: 300, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 30)}% de dégâts de zone`,
    apply: (s, n) => { s.splash += 0.3 * n; },
  },
  {
    id: 'meteore', name: 'Météore Infernal', emoji: '🌠', active: true,
    desc: 'Sort ACTIF : un météore s\'abat sur une zone de 9 cases (3×3) au ' +
          'hasard et pulvérise tout ce qui s\'y trouve. À déclencher toi-même.',
    baseCost: 1200, mult: 1.6, max: 15,
    effect: (n) => `Zone 3×3 · ${8 + n * 2}× dégâts · recharge ${Math.max(8, 20 - n)}s`,
    apply: (s, n) => { s.meteore = n; },
  },
  {
    id: 'meteore_zone', name: 'Cœur du Météore', emoji: '🌌',
    desc: 'Agrandit la zone d\'impact du Météore de 1, 2 puis 3 cases.',
    baseCost: 3000, mult: 4, max: 3,
    effect: (n) => `Zone d'impact +${n} case${n > 1 ? 's' : ''}`,
    apply: (s, n) => { s.meteoreZone = n; },
  },
  {
    id: 'flammes_noires', name: 'Flammes Noires', emoji: '🖤', active: true,
    desc: 'Sort ACTIF (une seule fois par niveau) : dépose un feu noir qui ne ' +
          's\'éteint jamais, inflige des dégâts de zone et se propage peu à peu ' +
          'sur toute la grille comme un incendie.',
    baseCost: 25000, mult: 1.6, max: 10,
    effect: (n) => `Incendie noir · ${Math.round((1 + n * 0.4) * 10) / 10}× dégâts · 1×/niveau`,
    apply: (s, n) => { s.blackfire = n; },
  },
  {
    id: 'voie_legion', name: 'Voie des Légions', emoji: '🎖️',
    desc: 'Commande une armée : tes serviteurs deviennent redoutables. ' +
          'Choix exclusif : verrouille les autres voies — sauf si tu as scellé ' +
          'le Serment du Chaos Absolu.',
    baseCost: 400, mult: 1, max: 1,
    effect: () => 'Voie engagée : serviteurs renforcés débloqués',
    apply: (s, n) => { s.voieLegion += n; },
  },
  {
    id: 'legion_force', name: 'Serviteurs Aguerris', emoji: '💪',
    desc: 'Chaque serviteur — et le Démolisseur — frappe plus fort (dégâts fixes).',
    baseCost: 350, mult: 1.45, max: 25,
    effect: (n) => `+${3 * n} dégâts des serviteurs`,
    apply: (s, n) => { s.minionDmgFlat += 3 * n; },
  },
  {
    id: 'chasse_pretres', name: 'Traque Sacrilège', emoji: '🎯',
    desc: 'Tes esprits serviteurs prennent pour cible en PRIORITÉ les prêtres, ' +
          'pour couper court à l\'exorcisme. Pacte rare et coûteux.',
    baseCost: 250000, mult: 1, max: 1,
    effect: () => 'Les serviteurs ciblent les prêtres en priorité',
    apply: (s, n) => { s.huntPriests = n; },
  },

  // --- Améliorations des serviteurs de base ---
  {
    id: 'minion_dmg', name: 'Serviteurs Brutaux', emoji: '⚔️',
    desc: 'Tes esprits serviteurs frappent plus fort (dégâts fixes).',
    baseCost: 500, mult: 1.45, max: 20,
    effect: (n) => `+${3 * n} dégâts des serviteurs`,
    apply: (s, n) => { s.minionDmgFlat += 3 * n; },
  },
  {
    id: 'minion_speed', name: 'Serviteurs Agiles', emoji: '💨',
    desc: 'Tes esprits serviteurs se déplacent plus vite.',
    baseCost: 500, mult: 1.45, max: 20,
    effect: (n) => `+${Math.round(n * 7.5)}% de vitesse des serviteurs`,
    apply: (s, n) => { s.minionSpeed += 0.075 * n; },
  },

  // --- Améliorations du Colosse (Démolisseur) ---
  {
    id: 'demo_dmg', name: 'Colosse Enragé', emoji: '🔨',
    desc: 'Le Démolisseur cogne encore plus fort (dégâts fixes).',
    baseCost: 1500, mult: 1.5, max: 20,
    effect: (n) => `+${8 * n} dégâts du Colosse`,
    apply: (s, n) => { s.demoDmgFlat += 8 * n; },
  },
  {
    id: 'demo_speed', name: 'Colosse Furieux', emoji: '🏃',
    desc: 'Le Démolisseur se déplace plus vite.',
    baseCost: 1500, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 7.5)}% de vitesse du Colosse`,
    apply: (s, n) => { s.demoSpeed += 0.075 * n; },
  },

  // --- Vagabonds (après le Colosse) : errent et répandent la peste ---
  {
    id: 'vagabond', name: 'Serviteur Vagabond', emoji: '🧟',
    desc: 'Invoque un vagabond qui erre au-dessus du niveau et répand un nuage ' +
          'de peste, infligeant des dégâts de zone continus (jusqu\'à 3 vagabonds).',
    baseCost: 4000, mult: 6, max: 3,
    effect: (n) => `${n} vagabond${n > 1 ? 's' : ''} · nuage de peste`,
    apply: (s, n) => { s.vagabond = n; },
  },
  {
    id: 'vagabond_dmg', name: 'Peste Virulente', emoji: '🦠',
    desc: 'Le nuage de peste des vagabonds ronge plus fort (dégâts fixes).',
    baseCost: 3000, mult: 1.5, max: 20,
    effect: (n) => `+${4 * n} dégâts de peste`,
    apply: (s, n) => { s.vagabondDmgFlat += 4 * n; },
  },
  {
    id: 'vagabond_speed', name: 'Errance Fébrile', emoji: '👣',
    desc: 'Les vagabonds errent plus vite et couvrent plus de terrain.',
    baseCost: 3000, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 7.5)}% de vitesse d'errance`,
    apply: (s, n) => { s.vagabondSpeed += 0.075 * n; },
  },

  // --- Foudroyeur (après les vagabonds) : immobile, petits éclairs ---
  {
    id: 'foudroyeur', name: 'Servant Foudroyeur', emoji: '🧙',
    desc: 'Invoque un servant immobile qui lance sans cesse de petits éclairs ' +
          'sur des cibles au hasard (jusqu\'à 2 foudroyeurs).',
    baseCost: 8000, mult: 8, max: 2,
    effect: (n) => `${n} foudroyeur${n > 1 ? 's' : ''} · petits éclairs`,
    apply: (s, n) => { s.stormling = n; },
  },
  {
    id: 'foudroyeur_dmg', name: 'Décharge Amplifiée', emoji: '⚡',
    desc: 'Les éclairs des foudroyeurs frappent plus fort (dégâts fixes).',
    baseCost: 6000, mult: 1.5, max: 20,
    effect: (n) => `+${6 * n} dégâts des éclairs`,
    apply: (s, n) => { s.stormlingDmgFlat += 6 * n; },
  },
  {
    id: 'foudroyeur_rate', name: 'Cadence Foudroyante', emoji: '⏱️',
    desc: 'Les foudroyeurs lancent leurs éclairs plus souvent.',
    baseCost: 6000, mult: 1.5, max: 15,
    effect: (n) => `−${Math.round((1 - Math.pow(0.92, n)) * 100)}% de temps entre éclairs`,
    apply: (s, n) => { s.stormlingRate += n; },
  },

  // --- Traits principaux (un par serviteur) ---
  {
    id: 'demo_trait', name: 'Choc Sismique', emoji: '🌐',
    desc: 'Le premier coup du Démolisseur sur un bâtiment déclenche une onde ' +
          'de choc qui pulvérise les cases alentour.',
    baseCost: 20000, mult: 1, max: 1,
    effect: () => 'Onde de choc au premier coup sur un bâtiment',
    apply: (s, n) => { s.demoTrait = n; },
  },
  {
    id: 'vagabond_trait', name: 'Peste Rampante', emoji: '☣️',
    desc: 'Le nuage de peste s\'étend davantage et laisse derrière les vagabonds ' +
          'des flaques de peste qui rongent encore un moment.',
    baseCost: 20000, mult: 1, max: 1,
    effect: () => 'Peste plus large + flaques persistantes',
    apply: (s, n) => { s.vagabondTrait = n; },
  },
  {
    id: 'foudroyeur_trait', name: 'Arc Éternel', emoji: '🔗',
    desc: 'Un arc électrique permanent relie les foudroyeurs et brûle les cases ' +
          'traversées ; chaque niveau ajoute un éclair lancé simultanément.',
    baseCost: 30000, mult: 3, max: 3,
    effect: (n) => `Arc permanent · +${n} éclair${n > 1 ? 's' : ''} par salve`,
    apply: (s, n) => { s.foudroyeurTrait = n; },
  },
  {
    id: 'voie_clic', name: 'Voie du Clic Démoniaque', emoji: '🖐️',
    desc: 'Canalise ta rage dans ta griffe : tes clics deviennent dévastateurs. ' +
          'Choix exclusif : verrouille les autres voies — sauf si tu as scellé ' +
          'le Serment du Chaos Absolu.',
    baseCost: 400, mult: 1, max: 1,
    effect: () => 'Voie engagée : clic démoniaque débloqué',
    apply: (s, n) => { s.voieClic += n; },
  },
  {
    id: 'clic_demon', name: 'Poing Démoniaque', emoji: '👊',
    desc: 'Décuple encore les dégâts de ton clic infernal.',
    baseCost: 600, mult: 1.4, max: 40,
    effect: (n) => `+${12 * n} dégâts au clic`,
    apply: (s, n) => { s.clickDamage += 12 * n; },
  },
  {
    id: 'nappe_feu', name: 'Nappe de Feu', emoji: '🌋',
    desc: 'Ton clic embrase le sol : une nappe de flammes brûle les cibles ' +
          'autour du point cliqué pendant quelques secondes.',
    baseCost: 350, mult: 1.5, max: 20,
    effect: (n) => `Brasier ${(3 + n * 0.3).toFixed(1)}s · dégâts de zone au clic`,
    apply: (s, n) => { s.fireWave = n; },
  },
  {
    id: 'finisher', name: 'Damnation Finale', emoji: '👹', active: true,
    desc: 'Sort ACTIF (une seule fois par niveau) : bannis TOUS tes serviteurs ' +
          'pour le reste du niveau et, en échange, ta griffe entre en furie ' +
          'pendant 10 s — dégâts de clic décuplés et frappe en zone. Les ' +
          'entités vivantes tuées pendant la furie meurent DÉFINITIVEMENT ' +
          '(elles ne réapparaissent plus). Un vrai finisher pour tout raser.',
    baseCost: 40000, mult: 1.7, max: 8,
    effect: (n) => `Furie 10 s · clic ×${6 + n * 2} · zone ${1 + Math.min(2, Math.floor(n / 2))} case(s) · morts définitives · 1×/niveau`,
    apply: (s, n) => { s.finisher = n; },
  },
  // Pacte spécial de Belial (démon du Mensonge). Se débloque en incarnant Belial.
  {
    id: 'mensonges', name: 'Mensonges', emoji: '🎭', special: 'belial',
    desc: 'Le souffle de Belial récompense tes tromperies : chaque mensonge ' +
          'tenu rapporte davantage de points de prestige. Un investissement ' +
          'colossal, à financer sur plusieurs damnations.',
    baseCost: 5000000, mult: 14, max: 2, // 5 M puis 70 M (niveau 2 calé pour ~3 prestiges)
    effect: (n) => `Mensonge tenu : +${1 + n} pt${1 + n > 1 ? 's' : ''} de prestige`,
    apply: (s, n) => { s.lieBonus = n; },
  },

  // ================= Pactes HYPER-SPÉCIALISÉS (Astaroth) =================
  // Réservés à l'incarnation Astaroth (reqHyper) et à la voie choisie (reqVoie).
  // --- Voie des Légions ---
  {
    id: 'legion_infinie', name: 'Légion Sans Fin', emoji: '♾️',
    desc: 'Repousse les limites de ta horde : davantage d\'esprits, de vagabonds et de foudroyeurs.',
    baseCost: 300000, mult: 2, max: 3,
    effect: (n) => `+${2 * n} esprits · +${n} vagabond${n > 1 ? 's' : ''} · +${n} foudroyeur${n > 1 ? 's' : ''}`,
    apply: (s, n) => { s.minions += 2 * n; s.vagabond += n; s.stormling += n; },
  },
  {
    id: 'synergie_meute', name: 'Synergie de Meute', emoji: '🐺',
    desc: 'Chaque serviteur vivant renforce les dégâts de toute la meute.',
    baseCost: 250000, mult: 1.6, max: 4,
    effect: (n) => `+${5 * n}% de dégâts serviteurs par serviteur vivant`,
    apply: (s, n) => { s.packSynergy += 0.05 * n; },
  },
  {
    id: 'triumvirat', name: 'Triumvirat Maudit', emoji: '🔺',
    desc: 'Tes trois traits fusionnent : ondes de choc autour des vagabonds et foudroyeurs, ' +
          'arcs reliant colosse et servants, peste projetée à chaque éclair de foudroyeur.',
    baseCost: 2000000, mult: 1, max: 1,
    effect: () => 'Fusion des 3 traits de serviteur',
    apply: (s, n) => { s.triumvirat = n; },
  },
  // --- Voie du Clic ---
  {
    id: 'poigne_sismique', name: 'Poigne Sismique', emoji: '🌐',
    desc: 'Ton clic infernal frappe désormais toute une zone 3×3.',
    baseCost: 300000, mult: 1, max: 1,
    effect: () => 'Le clic frappe en zone 3×3',
    apply: (s, n) => { s.clicZone = n; },
  },
  {
    id: 'rafale_infernale', name: 'Rafale Infernale', emoji: '💢',
    desc: 'Ta griffe frappe seule la cible la plus proche, encore et encore.',
    baseCost: 400000, mult: 1.6, max: 5,
    effect: (n) => `Clic automatique ${(2 + n * 0.6).toFixed(1)}×/s`,
    apply: (s, n) => { s.autoClic = n; },
  },
  {
    id: 'brasier_eternel', name: 'Brasier Éternel', emoji: '🔥',
    desc: 'Tes nappes de feu ne s\'éteignent plus : le sol embrasé le reste tout le niveau.',
    baseCost: 350000, mult: 1, max: 1,
    effect: () => 'Nappes de feu permanentes',
    apply: (s, n) => { s.brasierEternel = n; },
  },
  {
    id: 'griffe_massacre', name: 'Griffe du Massacre', emoji: '📈',
    desc: 'Chaque destruction du niveau renforce tes dégâts de clic (remis à zéro au niveau suivant).',
    baseCost: 300000, mult: 1.6, max: 3,
    effect: (n) => `Dégâts de clic ↑ avec les destructions (jusqu'à ×${1 + n})`,
    apply: (s, n) => { s.griffeMassacre += n; },
  },
  {
    id: 'damnation_perp', name: 'Damnation Perpétuelle', emoji: '👹',
    desc: 'La furie de la Damnation Finale se prolonge à chaque destruction et peut être relancée deux fois par niveau.',
    baseCost: 2000000, mult: 1, max: 1,
    effect: () => 'Furie prolongée par les kills · 2×/niveau',
    apply: (s, n) => { s.damnationPerp = n; },
  },
  // --- Voie de la Magie ---
  {
    id: 'meteore_pluie', name: 'Pluie de Météores', emoji: '☄️',
    desc: 'Ton Météore tombe en trois impacts successifs sur des zones au hasard.',
    baseCost: 500000, mult: 1, max: 1,
    effect: () => '3 météores par lancer',
    apply: (s, n) => { s.meteorePluie = n; },
  },
  {
    id: 'meteore_centre', name: 'Météore Centré', emoji: '🎯',
    desc: 'Ton Météore vise toujours le centre de la carte, même inoccupé.',
    baseCost: 400000, mult: 1, max: 1,
    effect: () => 'Vise toujours le centre',
    apply: (s, n) => { s.meteoreCentre = n; },
  },
  {
    id: 'meteore_global', name: 'Météore Apocalyptique', emoji: '🌍',
    desc: 'Ton Météore s\'abat sur la carte ENTIÈRE (dégâts réduits).',
    baseCost: 800000, mult: 1, max: 1,
    effect: () => 'Frappe toute la carte · dégâts réduits',
    apply: (s, n) => { s.meteoreGlobal = n; },
  },
  {
    id: 'tempete_perp', name: 'Tempête Perpétuelle', emoji: '🌩️',
    desc: 'La Foudre Infernale s\'abat automatiquement, encore et encore.',
    baseCost: 500000, mult: 1.6, max: 5,
    effect: (n) => `Foudre auto toutes les ${Math.max(1.5, 4 - n * 0.4).toFixed(1)}s`,
    apply: (s, n) => { s.foudreAuto = n; },
  },
  {
    id: 'flammes_coins', name: 'Flammes des 4 Coins', emoji: '🪔',
    desc: 'Le feu noir s\'embrase depuis les quatre coins de la carte.',
    baseCost: 600000, mult: 1, max: 1,
    effect: () => 'Feu noir aux 4 coins',
    apply: (s, n) => { s.blackfire4coins = n; },
  },
  {
    id: 'flammes_sacrilege', name: 'Flammes Sacrilèges', emoji: '✝️',
    desc: 'Chaque prêtre ou Vertu détruit déclenche un foyer de feu noir.',
    baseCost: 700000, mult: 1, max: 1,
    effect: () => 'Feu noir sur prêtre/Vertu détruit',
    apply: (s, n) => { s.blackfireSacrilege = n; },
  },
  {
    id: 'archimage', name: 'Archimage Démoniaque', emoji: '🕳️',
    desc: 'Sous ta souris, un trou noir aspire les âmes : dégâts continus et âmes bonus arrachées aux cibles happées.',
    baseCost: 2500000, mult: 1, max: 1,
    effect: () => 'Trou noir sous la souris · dégâts + vol d\'âmes',
    apply: (s, n) => { s.archimage = n; },
  },
];

/* Attaques actives : métadonnées (recharge ; `once` = une seule fois par niveau). */
const ACTIVE_ABILITIES = {
  foudre: { cooldown: (lvl) => Math.max(4, 14 - lvl) },
  meteore: { cooldown: (lvl) => Math.max(8, 20 - lvl) },
  flammes_noires: { cooldown: () => 0, once: true },
  finisher: { cooldown: () => 0, once: true },
};

/* -------------------------------------------------------------------------
 * Arbre de compétences : position (en coordonnées « monde ») de chaque pouvoir
 * et lien vers son parent. La vue se parcourt librement au drag.
 * ------------------------------------------------------------------------- */
// Palier de prix des voies : chaque voie DÉJÀ engagée renchérit le coût des
// suivantes (n'a d'effet qu'avec le Serment du Chaos, qui autorise le multi-voie
// — objectif : casser le « gros gain de facilité » du multi-voie bon marché).
const VOIE_IDS = ['voie_magie', 'voie_legion', 'voie_clic'];
const VOIE_PRICE_TIER = 6;   // 1re voie = prix normal, 2e ×6, 3e ×36

const TREE_W = 1720;
const TREE_H = 1600;
const SKILL_TREE = [
  { id: 'root',        x: 700, y: 680 },                   // le démon (non achetable)
  // Serment du Chaos : lève l'exclusivité des voies (accessible dès le départ).
  { id: 'pacte_libre',        x: 700, y: 800, parent: 'root' },
  { id: 'griffes',        x: 700, y: 560, parent: 'root' },
  { id: 'cataclysme',        x: 700, y: 440, parent: 'griffes' },
  { id: 'frenesie',        x: 552, y: 560, parent: 'griffes' },
  { id: 'souffle',        x: 848, y: 560, parent: 'griffes' },
  // Vélocité + longévités : ligne droite horizontale vers la gauche à partir
  // du premier pacte (vélocité), toutes à la même hauteur.
  { id: 'pattes',        x: 552, y: 680, parent: 'root' },
  { id: 'longevite1',        x: 404, y: 680, parent: 'pattes' },
  { id: 'longevite2',        x: 256, y: 680, parent: 'longevite1' },
  { id: 'longevite3',        x: 108, y: 680, parent: 'longevite2' },
  { id: 'recolte',        x: 848, y: 680, parent: 'root' },
  // Serviteurs : désormais RÉSERVÉS à la Voie des Légions (reqVoie). Le premier
  // pacte de serviteurs (Esprits) exige donc d'avoir engagé la voie ; toute la
  // chaîne (Colosse, Vagabonds, Foudroyeurs) en dépend par filiation.
  { id: 'minions',        x: 996, y: 680, parent: 'recolte', reqVoie: 'voie_legion' },
  // Débloqué seulement quand les Esprits Serviteurs sont au maximum (req).
  { id: 'demolisseur',        x: 996, y: 920, parent: 'minions', req: 8 },
  // Améliorations dmg/vitesse : réservées à la Voie des Légions (reqVoie).
  { id: 'minion_dmg',        x: 1144, y: 680, parent: 'minions', req: 1, reqVoie: 'voie_legion' },
  { id: 'minion_speed',        x: 1144, y: 800, parent: 'minions', req: 1, reqVoie: 'voie_legion' },
  { id: 'demo_dmg',        x: 1144, y: 920, parent: 'demolisseur', req: 1, reqVoie: 'voie_legion' },
  { id: 'demo_speed',        x: 996, y: 1040, parent: 'demolisseur', req: 1, reqVoie: 'voie_legion' },
  // Trait du Colosse : exige les DEUX autres pactes du Colosse (dmg + vitesse).
  { id: 'demo_trait',        x: 1144, y: 1040, reqAll: ['demo_dmg', 'demo_speed'], reqVoie: 'voie_legion' },
  // Vagabonds (après le Colosse).
  { id: 'vagabond',        x: 1144, y: 1160,  parent: 'demolisseur', req: 1 },
  { id: 'vagabond_dmg',        x: 1292, y: 1160,  parent: 'vagabond', req: 1, reqVoie: 'voie_legion' },
  { id: 'vagabond_speed',        x: 1144, y: 1280, parent: 'vagabond', req: 1, reqVoie: 'voie_legion' },
  // Trait du Vagabond : exige les deux autres pactes du Vagabond (dmg + vitesse).
  { id: 'vagabond_trait',        x: 1292, y: 1280, reqAll: ['vagabond_dmg', 'vagabond_speed'], reqVoie: 'voie_legion' },
  // Foudroyeur (après les vagabonds) et ses améliorations.
  { id: 'foudroyeur',        x: 1292, y: 1400, parent: 'vagabond', req: 1 },
  { id: 'foudroyeur_dmg',        x: 1440, y: 1400, parent: 'foudroyeur', req: 1, reqVoie: 'voie_legion' },
  { id: 'foudroyeur_rate',        x: 1292, y: 1520, parent: 'foudroyeur', req: 1, reqVoie: 'voie_legion' },
  // Trait du Foudroyeur : exige les deux autres pactes (dmg + cadence).
  { id: 'foudroyeur_trait',        x: 1440, y: 1520, reqAll: ['foudroyeur_dmg', 'foudroyeur_rate'], reqVoie: 'voie_legion' },
  // Trait des Esprits Serviteurs : traque des prêtres (réservé à la Voie des Légions).
  // Placé en haut à droite du pacte des Esprits Serviteurs.
  { id: 'chasse_pretres',        x: 1292, y: 800, parent: 'minions', req: 1, reqVoie: 'voie_legion' },

  // Voie de la Magie (exclusive) — prolonge la branche du feu.
  { id: 'voie_magie',        x: 996, y: 560, parent: 'souffle', req: 1, group: 'voie' },
  { id: 'foudre',        x: 1144, y: 560, parent: 'voie_magie', req: 1 },
  { id: 'foudre_dmg',        x: 1144, y: 440, parent: 'foudre', req: 1 },
  { id: 'pyromancie',        x: 996, y: 440, parent: 'voie_magie', req: 1 },
  { id: 'meteore',        x: 1292, y: 560, parent: 'foudre', req: 1 },
  { id: 'meteore_zone',        x: 1440, y: 560, parent: 'meteore', req: 1 },
  { id: 'flammes_noires',        x: 996, y: 320, parent: 'pyromancie', req: 1 },

  // Voie des Légions (exclusive) — porte d'entrée des serviteurs. Rattachée à
  // « Récolte » (et non plus à « Esprits ») : il faut engager la voie AVANT de
  // pouvoir invoquer le moindre serviteur.
  { id: 'voie_legion',        x: 848, y: 800, parent: 'recolte', req: 1, group: 'voie' },
  { id: 'legion_force',        x: 848, y: 920, parent: 'voie_legion', req: 1 },

  // Voie du Clic Démoniaque (exclusive) — prolonge la branche du clic.
  { id: 'voie_clic',        x: 700, y: 320,  parent: 'cataclysme', req: 1, group: 'voie' },
  { id: 'clic_demon',        x: 552, y: 320,  parent: 'voie_clic', req: 1 },
  { id: 'nappe_feu',        x: 700, y: 200, parent: 'voie_clic', req: 1 },
  { id: 'finisher',        x: 404, y: 320,  parent: 'clic_demon', req: 1 },

  // ===== Pactes hyper-spécialisés (Astaroth) — visibles seulement en l'incarnant =====
  // Voie des Légions
  { id: 'legion_infinie',        x: 848, y: 1040,  parent: 'legion_force', req: 1, reqVoie: 'voie_legion', reqHyper: true, hyper: true },
  { id: 'synergie_meute',        x: 700, y: 920,  parent: 'legion_force', req: 1, reqVoie: 'voie_legion', reqHyper: true, hyper: true },
  { id: 'triumvirat',        x: 1588, y: 1280, reqAll: ['demo_trait', 'vagabond_trait', 'foudroyeur_trait'], reqVoie: 'voie_legion', reqHyper: true, hyper: true },
  // Voie du Clic
  { id: 'poigne_sismique',        x: 552, y: 200, parent: 'clic_demon', req: 1, reqVoie: 'voie_clic', reqHyper: true, hyper: true },
  { id: 'griffe_massacre',        x: 552, y: 440, parent: 'clic_demon', req: 1, reqVoie: 'voie_clic', reqHyper: true, hyper: true },
  { id: 'rafale_infernale',        x: 404, y: 200, parent: 'clic_demon', req: 1, reqVoie: 'voie_clic', reqHyper: true, hyper: true },
  { id: 'brasier_eternel',        x: 700, y: 80, parent: 'nappe_feu',  req: 1, reqVoie: 'voie_clic', reqHyper: true, hyper: true },
  { id: 'damnation_perp',        x: 256, y: 320, reqAll: ['finisher'], reqVoie: 'voie_clic', reqHyper: true, hyper: true },
  // Voie de la Magie
  { id: 'meteore_pluie',        x: 1292, y: 440,  parent: 'meteore', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'meteore_centre',        x: 1440, y: 440, parent: 'meteore', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'meteore_global',        x: 1588, y: 440, parent: 'meteore', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'tempete_perp',        x: 1292, y: 320,  parent: 'foudre',  req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'flammes_coins',        x: 1144, y: 320, parent: 'flammes_noires', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'flammes_sacrilege',        x: 848, y: 320, parent: 'flammes_noires', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
  { id: 'archimage',        x: 996, y: 200, parent: 'flammes_noires', req: 1, reqVoie: 'voie_magie', reqHyper: true, hyper: true },
];

/* -------------------------------------------------------------------------
 * Démons primordiaux — offrandes d'âmes (un démon par péché capital).
 * On offre des âmes à un démon ; au bout de OFFERINGS_PER_DEMON offrandes son
 * « pacte capital » se scelle et applique un bonus permanent lié à son péché.
 * Le coût d'une offrande dépend de la progression GLOBALE : chaque offrande
 * faite (à n'importe quel démon) renchérit toutes les offrandes suivantes.
 * ------------------------------------------------------------------------- */
const OFFERINGS_PER_DEMON = 10;   // offrandes nécessaires pour sceller un pacte
const OFFERING_BASE = 1500;       // coût de la toute première offrande
const OFFERING_GROWTH = 1.14;     // facteur d'escalade par offrande globale

const PRIMORDIAL_DEMONS = [
  {
    id: 'orgueil', sin: 'Orgueil', name: 'Lucifer', emoji: '👑', color: '#e8c84d',
    pact: 'Superbe Infernale',
    desc: 'Ta superbe démesurée décuple ta force : +100% de dégâts de base.',
    apply: (s) => { s.damage *= 2; },
  },
  {
    id: 'avarice', sin: 'Avarice', name: 'Mammon', emoji: '🪙', color: '#f0b429',
    pact: 'Cupidité Sans Fond',
    desc: 'Ton avidité aspire les âmes : +150% d\'âmes récoltées.',
    apply: (s) => { s.soulMult *= 2.5; },
  },
  {
    id: 'luxure', sin: 'Luxure', name: 'Asmodée', emoji: '💋', color: '#e0457b',
    pact: 'Étreinte Vorace',
    desc: 'Un désir frénétique presse tes coups : cadence d\'attaque +80%.',
    apply: (s) => { s.attackInterval *= 0.55; },
  },
  {
    id: 'envie', sin: 'Envie', name: 'Léviathan', emoji: '🐍', color: '#3fb27f',
    pact: 'Convoitise du Sacré',
    desc: 'Tu convoites le pouvoir des saints : chaque prêtre exorcisé te rend ' +
          '1,5 s de survie, et tu infliges +30% de dégâts aux prêtres et aux Vertus.',
    apply: (s) => { s.priestSteal += 1.5; s.holyDmg += 0.3; },
  },
  {
    id: 'gourmandise', sin: 'Gourmandise', name: 'Belzébuth', emoji: '🪰', color: '#8bbf3f',
    pact: 'Appétit Dévorant',
    desc: 'Tu dévores tout alentour : +150% de dégâts de zone.',
    apply: (s) => { s.splash += 1.5; },
  },
  {
    id: 'colere', sin: 'Colère', name: 'Satan', emoji: '👿', color: '#e8442b',
    pact: 'Fureur Déchaînée',
    desc: 'Ta rage guide ta griffe : +30 % de dégâts de clic.',
    apply: (s) => { s.clickDamage *= 1.3; },
  },
  {
    id: 'paresse', sin: 'Paresse', name: 'Belphégor', emoji: '🦥', color: '#6a8caf',
    pact: 'Torpeur Éternelle',
    desc: 'Le temps s\'alanguit autour de toi : l\'exorcisme est ralenti de 35%.',
    apply: (s) => { s.slothSlow = Math.max(s.slothSlow, 0.35); },
  },
];

/* -------------------------------------------------------------------------
 * Prestige — « Boutique Démoniaque ».
 * Une fois les 7 Vertus vaincues, le joueur peut PRESTIGER : la progression
 * (âmes, niveau, pactes, offrandes, vertus) repart à zéro et il gagne 1 point
 * de prestige. Ces points achètent 7 améliorations PERMANENTES du personnage,
 * conservées à travers tous les prestiges.
 * ------------------------------------------------------------------------- */
const PRESTIGE_COST = 1;   // coût (en points) d'un niveau d'amélioration permanente
const PRESTIGE_REWARD = 3; // points gagnés à chaque prestige

const PRESTIGE_UPGRADES = [
  {
    id: 'p_dmg', name: 'Puissance Éternelle', emoji: '🩸',
    desc: 'Augmente définitivement les dégâts de base du démon.',
    effect: (n) => `+${25 * n}% de dégâts de base`,
    apply: (s, n) => { s.damage *= (1 + 0.25 * n); },
  },
  {
    id: 'p_speed', name: 'Célérité Éternelle', emoji: '🦶',
    desc: 'Le démon se déplace définitivement plus vite.',
    effect: (n) => `+${15 * n}% de vitesse`,
    apply: (s, n) => { s.moveSpeed *= (1 + 0.15 * n); },
  },
  {
    id: 'p_attack', name: 'Frénésie Éternelle', emoji: '⚡',
    desc: 'Réduit définitivement le délai entre deux attaques.',
    effect: (n) => `−${Math.round((1 - Math.pow(0.9, n)) * 100)}% de délai d'attaque`,
    apply: (s, n) => { s.attackInterval *= Math.pow(0.9, n); },
  },
  {
    id: 'p_splash', name: 'Brasier Éternel', emoji: '🔥',
    desc: 'Augmente définitivement les dégâts de zone (propagation).',
    effect: (n) => `+${30 * n}% de dégâts de zone`,
    apply: (s, n) => { s.splash += 0.3 * n; },
  },
  {
    id: 'p_click', name: 'Griffe Éternelle', emoji: '👊',
    desc: 'Augmente définitivement les dégâts du clic infernal.',
    effect: (n) => `+${30 * n}% de dégâts de clic`,
    apply: (s, n) => { s.clickDamage *= (1 + 0.3 * n); },
  },
  {
    id: 'p_power', name: 'Arcane Éternelle', emoji: '🌠',
    desc: 'Augmente définitivement les dégâts des pouvoirs actifs (Foudre, Météore, Flammes Noires…).',
    effect: (n) => `+${25 * n}% de dégâts des pouvoirs`,
    apply: (s, n) => { s.powerDmg += 0.25 * n; },
  },
  {
    id: 'p_servant', name: 'Légion Éternelle', emoji: '🧟',
    desc: 'Augmente définitivement les dégâts de tous tes serviteurs.',
    effect: (n) => `+${25 * n}% de dégâts des serviteurs`,
    apply: (s, n) => { s.servantDmg += 0.25 * n; },
  },
];

/* -------------------------------------------------------------------------
 * Incarnations — après avoir prestigé au moins une fois, le joueur peut
 * incarner un DÉMON PRIMORDIAL qui débloque une mécanique unique.
 * Premier disponible : Belial, le démon du Mensonge.
 * ------------------------------------------------------------------------- */
const INCARNATIONS = [
  {
    id: 'belial', name: 'Belial', title: 'Démon du Mensonge', emoji: '🎭',
    color: '#b06bff', available: true,
    desc: 'Tu peux MENTIR au jeu. Hors combat, gonfle une statistique ou tes ' +
          'âmes (×1,5 à ×5 et plus). Le mensonge tient jusqu\'à la prochaine ' +
          'Vertu : si tu l\'as rendu vrai, tu gagnes un point de prestige bonus ; ' +
          'sinon, tu paies le prix (malus de stat ou dette d\'âmes).',
  },
  {
    id: 'astaroth', name: 'Astaroth', title: 'Grand-Duc de l\'Hyper-Spécialisation',
    emoji: '👑', color: '#f0b429', available: true,
    desc: 'HYPER-SPÉCIALISATION : la PREMIÈRE voie que tu choisis devient ta ' +
          'seule et unique voie — les autres se verrouillent définitivement, et ' +
          'le Serment du Chaos est banni (s\'il était déjà scellé, Astaroth t\'en ' +
          'rembourse la moitié). En échange, ta voie révèle de nouveaux pactes ' +
          'ultimes qui parachèvent ta spécialisation.',
  },
  {
    id: 'mephisto', name: 'Méphisto', title: 'Marchand d\'Âmes',
    emoji: '📜', color: '#c0392b', available: true,
    desc: 'PACTE FAUSTIEN : au début de CHAQUE niveau, Méphisto te propose 3 ' +
          'pactes tirés du destin (liés à la graine : un niveau donné offre ' +
          'toujours les mêmes 3). Chacun t\'accorde un pouvoir puissant assorti ' +
          'd\'une contrepartie, valable pour ce seul niveau. À toi de choisir ' +
          'ton marché.',
  },
];

/* -------------------------------------------------------------------------
 * Pactes faustiens de Méphisto.
 * Chaque niveau, 3 de ces pactes sont proposés (tirage DÉTERMINISTE dérivé de
 * la graine + du numéro de niveau : un niveau donné montre toujours les mêmes
 * 3 options). Le pacte choisi ne vaut que pour le niveau en cours.
 *   apply(s) : effets sur les stats (bienfait ET contrepartie).
 *   hpMult   : (optionnel) multiplie les PV des entités du niveau.
 *   forceClic / noClic : (optionnel) force / interdit le clic infernal ce niveau.
 * ------------------------------------------------------------------------- */
const FAUST_SALT = 90210; // sel de graine dédié au tirage des pactes faustiens
const FAUST_PACTS = [
  {
    id: 'sang', name: 'Pacte de Sang', emoji: '🩸',
    boon: '+150 % de dégâts', bane: '−35 % de temps de survie',
    apply: (s) => { s.damage *= 2.5; s.lifespan *= 0.65; },
  },
  {
    id: 'or', name: 'Pacte de l\'Or', emoji: '🪙',
    boon: 'Âmes récoltées ×2,5', bane: '−40 % de dégâts',
    apply: (s) => { s.soulMult *= 2.5; s.damage *= 0.6; },
  },
  {
    id: 'fureur', name: 'Pacte de Fureur', emoji: '⚡',
    boon: 'Cadence d\'attaque +100 %, vitesse +50 %', bane: 'Ennemis +40 % de PV',
    apply: (s) => { s.attackInterval *= 0.5; s.moveSpeed *= 1.5; },
    hpMult: 1.4,
  },
  {
    id: 'colosse', name: 'Pacte du Colosse', emoji: '🗿',
    boon: 'Dégâts de zone +200 %, dégâts +30 %', bane: '−45 % de vitesse de déplacement',
    apply: (s) => { s.splash += 2; s.damage *= 1.3; s.moveSpeed *= 0.55; },
  },
  {
    id: 'horde', name: 'Pacte de la Horde', emoji: '🧟',
    boon: 'Dégâts des serviteurs +120 %', bane: '−50 % de dégâts du démon',
    apply: (s) => { s.servantDmg += 1.2; s.damage *= 0.5; },
  },
  {
    id: 'avarice', name: 'Pacte de l\'Avare', emoji: '⏳',
    boon: '+60 % de temps de survie', bane: '−50 % d\'âmes récoltées',
    apply: (s) => { s.lifespan *= 1.6; s.soulMult *= 0.5; },
  },
  {
    id: 'damne', name: 'Pacte du Damné', emoji: '💀',
    boon: '+80 % de dégâts et +80 % d\'âmes', bane: 'Ennemis +60 % de PV, −20 % de temps',
    apply: (s) => { s.damage *= 1.8; s.soulMult *= 1.8; s.lifespan *= 0.8; },
    hpMult: 1.6,
  },
  {
    id: 'frenesie', name: 'Pacte de Frénésie', emoji: '🔥',
    boon: 'Dégâts, cadence, vitesse et zone +40 %', bane: '−40 % de temps de survie',
    apply: (s) => { s.damage *= 1.4; s.attackInterval *= 0.6; s.moveSpeed *= 1.4; s.splash += 0.6; s.lifespan *= 0.6; },
  },
  {
    id: 'griffe', name: 'Pacte de la Griffe', emoji: '👊',
    boon: 'Clic infernal débloqué et ×3 ce niveau', bane: '−45 % de dégâts d\'attaque',
    apply: (s) => { s.clickDamage *= 3; s.damage *= 0.55; },
    forceClic: true,
  },
  {
    id: 'tempete', name: 'Pacte de la Tempête', emoji: '🌩️',
    boon: 'Dégâts des pouvoirs +150 %', bane: '−30 % de dégâts de base',
    apply: (s) => { s.powerDmg += 1.5; s.damage *= 0.7; },
  },
];

/* Cibles possibles d'un mensonge (statistiques « plus = mieux » + âmes). */
const LIE_TARGETS = [
  { id: 'damage',      name: 'Dégâts',         stat: 'damage',      fmt: (v) => Math.round(v) },
  { id: 'moveSpeed',   name: 'Vitesse',        stat: 'moveSpeed',   fmt: (v) => v.toFixed(1) },
  { id: 'clickDamage', name: 'Dégâts de clic', stat: 'clickDamage', fmt: (v) => Math.round(v) },
  { id: 'souls',       name: 'Âmes',           stat: null,          fmt: (v) => Math.round(v) },
];

// Ampleur d'un mensonge, exprimée en pourcentage du montant actuel : de +50 %
// (facteur ×1,5) à +100 % (facteur ×2,0), par paliers de 5 %.
const LIE_PCT_MIN = 0.5;   // +50 %
const LIE_PCT_MAX = 1.0;   // +100 %
const LIE_PCT_STEP = 0.05; // pas de 5 %
const LIE_MIN = 1 + LIE_PCT_MIN;  // facteur minimum (×1,5)
const LIE_MAX = 1 + LIE_PCT_MAX;  // facteur maximum (×2,0)
const LIE_STEP = LIE_PCT_STEP;    // pas du facteur (0,05)

/* Panneau des statistiques cumulées (bouton 📊). Chaque ligne cible une clé de
 * l'objet `stats` ; `type` gouverne le formatage de la valeur ET des
 * contributions détaillées (au survol). `hideIfZero` masque les lignes de
 * serviteurs/pouvoirs non pertinents. */
const STAT_ROWS = [
  { group: 'Démon', key: 'damage',         label: 'Dégâts',              type: 'int' },
  { group: 'Démon', key: 'clickDamage',    label: 'Dégâts de clic',      type: 'int' },
  { group: 'Démon', key: 'moveSpeed',      label: 'Vitesse de déplacement', type: 'dec' },
  { group: 'Démon', key: 'attackInterval', label: "Délai d'attaque",     type: 'sec', lowerBetter: true },
  { group: 'Démon', key: 'lifespan',       label: 'Longévité',           type: 'sec' },
  { group: 'Démon', key: 'splash',         label: 'Dégâts de zone',      type: 'pct' },
  { group: 'Démon', key: 'soulMult',       label: "Récolte d'âmes",      type: 'mult' },

  { group: 'Serviteurs & Pouvoirs', key: 'minions',       label: 'Esprits serviteurs',  type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'minionDmgFlat',  label: 'Dégâts serviteurs',   type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'minionSpeed',   label: 'Vitesse serviteurs',  type: 'pct', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'demoDmgFlat',   label: 'Dégâts du Colosse',   type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'demoSpeed',     label: 'Vitesse du Colosse',  type: 'pct', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'vagabond',      label: 'Vagabonds',           type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'vagabondDmgFlat',label: 'Dégâts de peste',    type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'stormling',     label: 'Foudroyeurs',         type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'stormlingDmgFlat',label: 'Dégâts des éclairs', type: 'int', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'servantDmg',    label: 'Dégâts serviteurs (global)', type: 'pct', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'powerDmg',      label: 'Dégâts des pouvoirs', type: 'pct', hideIfZero: true },
  { group: 'Serviteurs & Pouvoirs', key: 'foudreDmg',     label: 'Dégâts de la Foudre', type: 'pct', hideIfZero: true },
];

/* =========================================================================
 * MONDES — Campagnes thématiques (Phase 1 : fondation)
 * -------------------------------------------------------------------------
 * Le jeu se décline en trois « mondes » qui partagent EXACTEMENT la même
 * courbe de difficulté (PV/valeur/densité dérivés du numéro de niveau dans le
 * monde), mais changent le thème visuel, les cibles, les boss de dizaine et
 * l'unité hostile qui gêne le démon.
 *   - normal : la campagne d'origine (campagne → métropole, Vertus, prêtres).
 *   - cieux  : voie du Blasphème — détruire les Cieux (Archanges, anges).
 *   - enfers : voie de la Trahison — détruire les Enfers (démons primordiaux,
 *              démons mineurs).
 * ========================================================================= */

/* -------- Cibles célestes (monde des Cieux) -------- */
// NB : emojis à codepoint unique (pas de sélecteur VS16 U+FE0F) — les séquences
// VS16 comme ☁️/🕊️/🏛️/⚔️ se décentrent hors de leur case sur certains
// navigateurs. On leur préfère des emojis « présentation emoji par défaut ».
Object.assign(TARGET_TYPES, {
  nuee:        { name: 'Nuée',            emoji: '⛅', hp: 9,   value: 3,  living: false },
  astre:       { name: 'Astre',          emoji: '⭐', hp: 14,  value: 6,  living: false },
  colombe:     { name: 'Colombe',        emoji: '🐦', hp: 12,  value: 9,  living: true  },
  benitier:    { name: 'Bénitier',       emoji: '⛲', hp: 60,  value: 16, living: false },
  cloche:      { name: 'Cloche sacrée',  emoji: '🔔', hp: 78,  value: 22, living: false },
  orgue:       { name: 'Grand Orgue',    emoji: '🎹', hp: 100, value: 30, living: false },
  temple:      { name: 'Temple de nacre',emoji: '⛪', hp: 150, value: 44, living: false },
  sanctuaire:  { name: 'Sanctuaire',     emoji: '🛕', hp: 210, value: 62, living: false },
  elu:         { name: 'Bienheureux',    emoji: '🧑', hp: 18,  value: 15, living: true  },
  seraphinlt:  { name: 'Petit séraphin', emoji: '👼', hp: 26,  value: 20, living: true  },
  // Ange : exorciste céleste (remplace le prêtre dans les Cieux). `heals`
  // marque une aura de soin/résurrection (mécanique en Phase 2 ; zone déjà
  // affichée). `auraR` = rayon de la zone en cases.
  ange:        { name: 'Ange gardien',   emoji: '😇', hp: 24,  value: 22, living: true, priestLike: true, heals: true, auraR: 1.6 },
});

/* -------- Cibles infernales (monde des Enfers) -------- */
Object.assign(TARGET_TYPES, {
  brasier:     { name: 'Brasier',        emoji: '🔥', hp: 10,  value: 4,  living: false },
  ossuaire:    { name: 'Ossuaire',       emoji: '🦴', hp: 40,  value: 12, living: false },
  tombe:       { name: 'Pierre tombale', emoji: '🪦', hp: 52,  value: 14, living: false },
  gibet:       { name: 'Gibet',          emoji: '🔗', hp: 58,  value: 15, living: false },
  chaudron:    { name: 'Chaudron',       emoji: '🍲', hp: 72,  value: 20, living: false },
  volcan:      { name: 'Cône de lave',   emoji: '🌋', hp: 120, value: 34, living: false },
  porte:       { name: 'Porte damnée',   emoji: '🚪', hp: 150, value: 44, living: false },
  tour_noire:  { name: 'Tour noire',     emoji: '🏯', hp: 220, value: 64, living: false },
  ame_damnee:  { name: 'Âme damnée',     emoji: '👻', hp: 15,  value: 9,  living: true  },
  suppliciee:  { name: 'Suppliciée',     emoji: '🧎', hp: 20,  value: 14, living: true  },
  // Démon mineur : hostile des Enfers. Contrairement aux exorcistes, il
  // n'accélère PAS l'exorcisme (pas de drain). À la place il harcèle les
  // serviteurs (attacksServants) et bride la magie (throttleMagic : allonge les
  // recharges des sorts tant qu'il est en vie).
  demon_mineur:{ name: 'Démon mineur',   emoji: '👺', hp: 22,  value: 18, living: true, hostile: true, attacksServants: true, throttleMagic: true },
});

/* -------- Réglages des unités hostiles (Phase 2) -------- */
const HOSTILE_TUNING = {
  // Démons mineurs (Enfers)
  demonAtkInterval: 2.0,     // secondes entre deux attaques sur un serviteur
  demonAtkBaseDmg: 9,        // dégâts de base d'une attaque (scale avec le niveau)
  demonAtkRange: 3.2,        // portée (en cases) pour cibler un serviteur
  magicThrottlePer: 0.22,    // +22 % de temps de recharge par démon mineur vivant
  magicThrottleMin: 0.4,     // recharge jamais ralentie sous 40 % de la vitesse
  // Anges & Archanges (Cieux)
  healInterval: 2.2,         // secondes entre deux vagues de soin
  healFrac: 0.14,            // soigne 14 % des PV max des entités dans la zone
  resurrectInterval: 5.0,    // secondes entre deux résurrections
  resurrectHpFrac: 0.6,      // PV rendus à une entité ressuscitée (fraction du max)
};

/* PV de base des serviteurs (Phase 2). Le démon lui-même est invulnérable
 * (aucune entrée = pas de PV). Ces PV ne comptent que là où des hostiles les
 * attaquent (Enfers) ; ailleurs ils restent au maximum. */
const SERVANT_HP = {
  minion: 40,
  demolisher: 220,
  vagabond: 80,
  stormling: 60,
};

/* -------- Les 7 Archanges (boss de dizaine des Cieux) -------- */
// Emojis à codepoint unique (⚔️ et ⚖ à VS16 se décentraient) → 🔱 et ⚡.
const ARCHANGELS = [
  { id: 'michel',    name: 'Michel',    emoji: '🔱', hp: 260, value: 220 },
  { id: 'gabriel',   name: 'Gabriel',   emoji: '📯', hp: 280, value: 250 },
  { id: 'raphael',   name: 'Raphaël',   emoji: '🌿', hp: 300, value: 280 },
  { id: 'uriel',     name: 'Uriel',     emoji: '🔥', hp: 320, value: 310 },
  { id: 'raguel',    name: 'Raguel',    emoji: '⚡', hp: 340, value: 340 },
  { id: 'sariel',    name: 'Sariel',    emoji: '🌙', hp: 360, value: 370 },
  { id: 'raziel',    name: 'Raziel',    emoji: '📖', hp: 380, value: 400 },
];
// Les Archanges soignent/ressuscitent sur une large zone (mécanique en Phase 2 ;
// la zone est déjà affichée). auraR plus grand que celui des anges.
for (const a of ARCHANGELS)
  TARGET_TYPES['arch_' + a.id] = { name: a.name, emoji: a.emoji, hp: a.hp, value: a.value, living: true, archangel: a.id, heals: true, auraR: 2.5 };

/* -------- Les 7 démons primordiaux en boss de dizaine (Enfers) --------
 * On réutilise les péchés/emblèmes des PRIMORDIAL_DEMONS existants comme boss
 * du monde infernal (les trahir revient à détruire les Enfers). */
const DEMON_BOSSES = PRIMORDIAL_DEMONS.map((d, i) => ({
  id: d.id, name: d.name, emoji: d.emoji, hp: 250 + i * 22, value: 210 + i * 30,
}));
// Mécanique des boss démoniaques : ils harcèlent les serviteurs ET brident la
// magie (version « boss » du démon mineur). Les Archanges, eux, soignent et
// ressuscitent (heals) — déjà défini plus haut.
for (const d of DEMON_BOSSES)
  TARGET_TYPES['pdemon_' + d.id] = { name: d.name, emoji: d.emoji, hp: d.hp, value: d.value, living: true, pdemon: d.id, attacksServants: true, throttleMagic: true };

/* -------- Boss finaux ultimes (fin d'une campagne d'endgame) -------- */
// Emojis à codepoint unique (🌞 / 🐉), correctement centrés.
TARGET_TYPES['ultimate_divin'] = {
  name: 'Être Divin Ultime', emoji: '🌞', hp: 520, value: 2500, living: true,
  heals: true, auraR: 3.4, ultimate: 'cieux',
};
TARGET_TYPES['ultimate_demoniaque'] = {
  name: 'Être Démoniaque Ultime', emoji: '🐉', hp: 520, value: 2500, living: true,
  attacksServants: true, throttleMagic: true, ultimate: 'enfers',
};

/* Campagne d'endgame : après le niveau 70 (7 boss de dizaine) vient un niveau
 * final (71) où trône le boss ultime. Le vaincre = victoire de la campagne. */
const CAMPAIGN_FINAL_LEVEL = 71;
const CAMPAIGN_REWARD = 3;        // points de prestige à la victoire d'une campagne
const ULTIMATE_HP_FACTOR = 2.5;   // multiplicateur de PV du boss ultime
// Ancrage de difficulté des campagnes (Cieux/Enfers) : la campagne se joue de 1
// à 70, mais sa DIFFICULTÉ démarre à celle du niveau 70 du monde normal et
// grimpe LINÉAIREMENT ensuite (pas de boost exponentiel post-70, réservé au
// monde normal). Le niveau de difficulté effectif = 70 + (niveau - 1) * SCALE.
// Valeur calée au simulateur enrichi (build réaliste jouant jusqu'au niv.70 +
// prestiges) : à 4.0, la campagne est quasi-infaisable à 0-1 prestige (on
// atteint ~67-69/71) et se gagne à ~2 prestiges. Réglable via g.campaignDiffScale.
const CAMPAIGN_DIFF_SCALE = 4.0;
// Renforcement des PV par « bouclage » d'un monde : chaque fois qu'un monde est
// terminé (7 Vertus / Être divin / Être démoniaque), les PV de ses entités
// gagnent ce pourcentage (cumulatif, persistant). 0.15 = +15 % par complétion.
const WORLD_CLEAR_HP = 0.15;

/* -------- Biomes célestes -------- */
const CIEUX_BIOMES = [
  { id: 'parvis',     name: 'Parvis des Nuées',   ground: ['#8fa6d6', '#a7bce8'],
    pool: { nuee: 6, astre: 3, colombe: 3, benitier: 1 } },
  { id: 'jardin',     name: 'Jardin d\'Éden',      ground: ['#7fb08a', '#95c79f'],
    pool: { colombe: 3, nuee: 3, astre: 2, cloche: 1, benitier: 2, elu: 2 } },
  { id: 'cloitre',    name: 'Cloître Céleste',     ground: ['#b9a9d8', '#cbbde6'],
    pool: { cloche: 2, orgue: 1, elu: 3, colombe: 2, benitier: 2, astre: 2 } },
  { id: 'basilique',  name: 'Basilique de Lumière',ground: ['#c9b6e0', '#dccbee'],
    pool: { temple: 2, orgue: 2, cloche: 2, elu: 3, seraphinlt: 1, astre: 2 } },
  { id: 'choeurs',    name: 'Chœurs Angéliques',   ground: ['#a9c0e8', '#c0d3f2'],
    pool: { seraphinlt: 3, temple: 2, sanctuaire: 1, elu: 2, orgue: 1, colombe: 2 } },
  { id: 'firmament',  name: 'Haut Firmament',      ground: ['#8ea9e6', '#a6bef0'],
    pool: { sanctuaire: 2, temple: 2, seraphinlt: 3, astre: 3, orgue: 1, elu: 2 } },
  { id: 'empyree',    name: 'Empyrée',             ground: ['#d8cff0', '#eae2fb'],
    pool: { sanctuaire: 3, temple: 2, seraphinlt: 3, elu: 2, orgue: 2, astre: 2 } },
];

/* -------- Biomes infernaux -------- */
const ENFERS_BIOMES = [
  { id: 'seuil',      name: 'Seuil des Enfers',    ground: ['#4a2624', '#5c2f2b'],
    pool: { brasier: 5, ossuaire: 3, ame_damnee: 3, tombe: 1 } },
  { id: 'charnier',   name: 'Charnier',            ground: ['#3f2422', '#512b28'],
    pool: { ossuaire: 3, tombe: 3, ame_damnee: 3, gibet: 2, brasier: 2 } },
  { id: 'gehenne',    name: 'Géhenne',             ground: ['#5a2a1f', '#6d3324'],
    pool: { gibet: 2, chaudron: 2, suppliciee: 3, ame_damnee: 2, brasier: 2, tombe: 1 } },
  { id: 'forges',     name: 'Forges Damnées',      ground: ['#4d2620', '#633025'],
    pool: { chaudron: 2, volcan: 2, gibet: 2, suppliciee: 3, ossuaire: 2, brasier: 2 } },
  { id: 'styx',       name: 'Rives du Styx',       ground: ['#33262f', '#412f3a'],
    pool: { porte: 2, chaudron: 2, ame_damnee: 3, suppliciee: 2, volcan: 1, gibet: 2 } },
  { id: 'abysses',    name: 'Abysses',             ground: ['#2c1f2b', '#3a2837'],
    pool: { tour_noire: 1, porte: 2, volcan: 2, suppliciee: 3, chaudron: 2, ame_damnee: 2 } },
  { id: 'cocyte',     name: 'Cocyte',              ground: ['#241d2e', '#31273f'],
    pool: { tour_noire: 3, porte: 2, volcan: 2, suppliciee: 3, chaudron: 1, ame_damnee: 2 } },
];

/* -------- Table des mondes -------- */
const WORLDS = {
  normal: {
    id: 'normal', name: 'Monde normal', emoji: '🗺️',
    biomes: BIOMES, bosses: null,            // null → logique Vertus/BOSS_POOL historique
    hostileId: 'pretre', seedOffset: 0,
  },
  cieux: {
    id: 'cieux', name: 'Les Cieux', emoji: '☁️',
    campaign: 'Blasphème Suprême',
    biomes: CIEUX_BIOMES,
    bosses: ARCHANGELS.map(a => 'arch_' + a.id),   // boss de dizaine 10→70
    hostileId: 'ange', ultimateId: 'ultimate_divin', seedOffset: 1000003,
  },
  enfers: {
    id: 'enfers', name: 'Les Enfers', emoji: '🔥',
    campaign: 'Trahison Suprême',
    biomes: ENFERS_BIOMES,
    bosses: DEMON_BOSSES.map(d => 'pdemon_' + d.id),
    hostileId: 'demon_mineur', ultimateId: 'ultimate_demoniaque', seedOffset: 2000003,
  },
};
const WORLD_ORDER = ['normal', 'cieux', 'enfers'];
