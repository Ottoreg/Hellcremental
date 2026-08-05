/* =========================================================================
 * Hellcremental — Disposition ALTERNATIVE de l'arbre des pactes sur GRILLE.
 *
 * ⚠️ FICHIER NON UTILISÉ / NON CHARGÉ. Conservé pour plus tard.
 * Cette variante aligne tous les nœuds sur une grille régulière (pas de
 * 148×120 px) pour rendre les liens majoritairement cardinaux
 * (haut/bas/gauche/droite). Jugée pas encore satisfaisante → l'ancienne
 * disposition (organique) reste en place dans js/config.js.
 *
 * Pour l'activer : remplacer dans js/config.js les constantes TREE_W / TREE_H
 * et le tableau SKILL_TREE par ceux ci-dessous, et remettre css/style.css
 * (#tree-world / #tree-links) à 1720×1600.
 * ========================================================================= */

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
