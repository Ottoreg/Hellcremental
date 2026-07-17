/* =========================================================================
 * Hellcremental — Générateur pseudo-aléatoire à graine (déterministe)
 *
 * La génération des niveaux est ALÉATOIRE mais REPRODUCTIBLE : à partir d'une
 * même graine (« seed »), le même joueur obtient toujours la même suite de
 * niveaux. La graine est sauvegardée, ce qui permet de retrouver sa partie à
 * l'identique — y compris sur un autre appareil après import de la sauvegarde.
 * ========================================================================= */

/* Générateur mulberry32 : rapide, déterministe, sans état global. */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Combine une graine, un numéro de niveau et un essai en une graine dérivée
 * déterministe (le même triplet donne toujours le même résultat). */
function seededRandom(seed, level, attempt = 0) {
  const s = (seed ^ Math.imul(level, 2654435761) ^ Math.imul(attempt + 1, 40503)) >>> 0;
  return mulberry32(s);
}

/* Génère une graine de joueur aléatoire (une seule fois, à la création). */
function makeSeed() {
  return (Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
}
