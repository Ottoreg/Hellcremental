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
  chevalier:  { name: 'Paladin',      emoji: '🛡️', hp: 90,  value: 45, living: true  },

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
 * Les 7 Vertus — boss de chaque dizaine (niveaux 10, 20, … 70). Chacune
 * s'oppose à un péché capital (donc à un démon primordial). Une fois les
 * 7 Vertus vaincues, le système de Prestige s'éveille (développé plus tard :
 * incarner un démon primordial pour affronter les Archanges méga-boss).
 * ------------------------------------------------------------------------- */
const VIRTUES = [
  { id: 'humilite',      name: 'Humilité',      sin: 'orgueil',     emoji: '🕊️', hp: 240, value: 200 },
  { id: 'charite',       name: 'Charité',       sin: 'avarice',     emoji: '🤲', hp: 260, value: 230 },
  { id: 'chastete',      name: 'Chasteté',      sin: 'luxure',      emoji: '💠', hp: 280, value: 260 },
  { id: 'bienveillance', name: 'Bienveillance', sin: 'envie',       emoji: '🤝', hp: 300, value: 290 },
  { id: 'temperance',    name: 'Tempérance',    sin: 'gourmandise', emoji: '⚖️', hp: 320, value: 320 },
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
    desc: 'Se déplace plus vite d\'une victime à l\'autre.',
    baseCost: 18, mult: 1.38, max: 40,
    effect: (n) => `+${(0.4 * n).toFixed(1)} vitesse`,
    apply: (s, n) => { s.moveSpeed += 0.4 * n; },
  },
  // Longévité : trois pactes uniques de +5 s, chacun 20× plus cher que le précédent.
  {
    id: 'longevite1', name: 'Longévité Maudite', emoji: '⏳',
    desc: 'Résiste 5 secondes de plus avant d\'être exorcisé.',
    baseCost: 30, mult: 1, max: 1,
    effect: () => '+5s de survie',
    apply: (s, n) => { s.lifespan += 5 * n; },
  },
  {
    id: 'longevite2', name: 'Endurance Damnée', emoji: '⌛',
    desc: 'Encore 5 secondes de sursis avant l\'exorcisme.',
    baseCost: 600, mult: 1, max: 1,
    effect: () => '+5s de survie',
    apply: (s, n) => { s.lifespan += 5 * n; },
  },
  {
    id: 'longevite3', name: 'Âme Increvable', emoji: '🕰️',
    desc: 'Un dernier répit de 5 secondes face aux prières.',
    baseCost: 12000, mult: 1, max: 1,
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
          '(Magie, Légions et Clic) au lieu d\'une seule.',
    baseCost: 1000000, mult: 1, max: 1,
    effect: () => 'Toutes les voies deviennent accessibles',
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
    effect: (n) => `+${Math.round(n * 30)}% de dégâts de la Foudre`,
    apply: (s, n) => { s.foudreDmg += 0.3 * n; },
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
    desc: 'Chaque serviteur — et le Démolisseur — frappe bien plus fort.',
    baseCost: 350, mult: 1.45, max: 25,
    effect: (n) => `+${Math.round(n * 25)}% de dégâts des serviteurs`,
    apply: (s, n) => { s.minionDmgBonus += 0.25 * n; },
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
    desc: 'Tes esprits serviteurs frappent plus fort.',
    baseCost: 500, mult: 1.45, max: 20,
    effect: (n) => `+${Math.round(n * 20)}% de dégâts des serviteurs`,
    apply: (s, n) => { s.minionDmgBonus += 0.2 * n; },
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
    desc: 'Le Démolisseur cogne encore plus fort.',
    baseCost: 1500, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 30)}% de dégâts du Colosse`,
    apply: (s, n) => { s.demoDmgBonus += 0.3 * n; },
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
    desc: 'Le nuage de peste des vagabonds ronge bien plus vite.',
    baseCost: 3000, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 25)}% de dégâts de peste`,
    apply: (s, n) => { s.vagabondDmg += 0.25 * n; },
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
    desc: 'Les éclairs des foudroyeurs frappent plus fort.',
    baseCost: 6000, mult: 1.5, max: 20,
    effect: (n) => `+${Math.round(n * 30)}% de dégâts des éclairs`,
    apply: (s, n) => { s.stormlingDmg += 0.3 * n; },
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
  {
    id: 'finisher', name: 'Damnation Finale', emoji: '👹', active: true,
    desc: 'Sort ACTIF (une seule fois par niveau) : bannis TOUS tes serviteurs ' +
          'pour le reste du niveau et, en échange, ta griffe entre en furie ' +
          'pendant 10 s — dégâts de clic décuplés et frappe en zone. Un vrai ' +
          'finisher pour tout raser toi-même.',
    baseCost: 40000, mult: 1.7, max: 8,
    effect: (n) => `Furie 10 s · clic ×${6 + n * 2} · zone ${1 + Math.min(2, Math.floor(n / 2))} case(s) · 1×/niveau`,
    apply: (s, n) => { s.finisher = n; },
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
const TREE_W = 1560;
const TREE_H = 1320;
const SKILL_TREE = [
  { id: 'root',        x: 560, y: 430 },                   // le démon (non achetable)
  // Serment du Chaos : lève l'exclusivité des voies (accessible dès le départ).
  { id: 'pacte_libre', x: 555, y: 660, parent: 'root' },
  { id: 'griffes',     x: 560, y: 260, parent: 'root' },
  { id: 'cataclysme',  x: 560, y: 105, parent: 'griffes' },
  { id: 'frenesie',    x: 360, y: 185, parent: 'griffes' },
  { id: 'souffle',     x: 760, y: 185, parent: 'griffes' },
  // Vélocité + longévités : ligne droite horizontale vers la gauche à partir
  // du premier pacte (vélocité), toutes à la même hauteur.
  { id: 'pattes',      x: 490, y: 545, parent: 'root' },
  { id: 'longevite1',  x: 360, y: 545, parent: 'pattes' },
  { id: 'longevite2',  x: 230, y: 545, parent: 'longevite1' },
  { id: 'longevite3',  x: 100, y: 545, parent: 'longevite2' },
  { id: 'recolte',     x: 765, y: 440, parent: 'root' },
  { id: 'minions',     x: 875, y: 610, parent: 'recolte' },
  // Débloqué seulement quand les Esprits Serviteurs sont au maximum (req).
  { id: 'demolisseur', x: 940, y: 770, parent: 'minions', req: 8 },
  // Améliorations dmg/vitesse : réservées à la Voie des Légions (reqVoie).
  { id: 'minion_dmg',   x: 1030, y: 545, parent: 'minions', req: 1, reqVoie: 'voie_legion' },
  { id: 'minion_speed', x: 1110, y: 620, parent: 'minions', req: 1, reqVoie: 'voie_legion' },
  { id: 'demo_dmg',     x: 1150, y: 730, parent: 'demolisseur', req: 1, reqVoie: 'voie_legion' },
  { id: 'demo_speed',   x: 1200, y: 835, parent: 'demolisseur', req: 1, reqVoie: 'voie_legion' },
  // Trait du Colosse (disponible sans la voie).
  { id: 'demo_trait',   x: 1290, y: 760, parent: 'demolisseur', req: 1 },
  // Vagabonds (après le Colosse).
  { id: 'vagabond',       x: 930, y: 930,  parent: 'demolisseur', req: 1 },
  { id: 'vagabond_dmg',   x: 770, y: 960,  parent: 'vagabond', req: 1, reqVoie: 'voie_legion' },
  { id: 'vagabond_speed', x: 700, y: 1050, parent: 'vagabond', req: 1, reqVoie: 'voie_legion' },
  { id: 'vagabond_trait', x: 1090, y: 985, parent: 'vagabond', req: 1 },
  // Foudroyeur (après les vagabonds) et ses améliorations.
  { id: 'foudroyeur',       x: 930,  y: 1080, parent: 'vagabond', req: 1 },
  { id: 'foudroyeur_dmg',   x: 770,  y: 1170, parent: 'foudroyeur', req: 1, reqVoie: 'voie_legion' },
  { id: 'foudroyeur_rate',  x: 1090, y: 1170, parent: 'foudroyeur', req: 1, reqVoie: 'voie_legion' },
  { id: 'foudroyeur_trait', x: 930,  y: 1245, parent: 'foudroyeur', req: 1 },
  // Trait des Esprits Serviteurs : traque des prêtres (réservé à la Voie des Légions).
  // Placé en haut à droite du pacte des Esprits Serviteurs.
  { id: 'chasse_pretres', x: 1010, y: 415, parent: 'minions', req: 1, reqVoie: 'voie_legion' },

  // Voie de la Magie (exclusive) — prolonge la branche du feu.
  { id: 'voie_magie',  x: 960, y: 165, parent: 'souffle', req: 1, group: 'voie' },
  { id: 'foudre',      x: 1110, y: 95, parent: 'voie_magie', req: 1 },
  { id: 'foudre_dmg',  x: 1250, y: 180, parent: 'foudre', req: 1 },
  { id: 'pyromancie',  x: 1110, y: 245, parent: 'voie_magie', req: 1 },
  { id: 'meteore',     x: 1270, y: 60, parent: 'foudre', req: 1 },
  { id: 'meteore_zone',x: 1420, y: 120, parent: 'meteore', req: 1 },
  { id: 'flammes_noires', x: 1290, y: 300, parent: 'pyromancie', req: 1 },

  // Voie des Légions (exclusive) — prolonge la branche des serviteurs.
  { id: 'voie_legion', x: 690, y: 720, parent: 'minions', req: 1, group: 'voie' },
  { id: 'legion_force',x: 545, y: 785, parent: 'voie_legion', req: 1 },

  // Voie du Clic Démoniaque (exclusive) — prolonge la branche du clic.
  { id: 'voie_clic',   x: 430, y: 65,  parent: 'cataclysme', req: 1, group: 'voie' },
  { id: 'clic_demon',  x: 280, y: 55,  parent: 'voie_clic', req: 1 },
  { id: 'nappe_feu',   x: 205, y: 170, parent: 'voie_clic', req: 1 },
  { id: 'finisher',    x: 140, y: 75,  parent: 'clic_demon', req: 1 },
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
    pact: 'Convoitise Mortelle',
    desc: 'Tu convoites la vie des mortels : chaque destruction prolonge ta longévité de +0,4 s.',
    apply: (s) => { s.envyLife += 0.4; },
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
    desc: 'Une rage aveugle t\'anime : +90% de vitesse de déplacement et +40% de dégâts.',
    apply: (s) => { s.moveSpeed *= 1.9; s.damage *= 1.4; },
  },
  {
    id: 'paresse', sin: 'Paresse', name: 'Belphégor', emoji: '🦥', color: '#6a8caf',
    pact: 'Torpeur Éternelle',
    desc: 'Le temps s\'alanguit autour de toi : l\'exorcisme est ralenti de 35%.',
    apply: (s) => { s.slothSlow = Math.max(s.slothSlow, 0.35); },
  },
];
