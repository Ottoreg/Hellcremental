# 😈 Hellcremental — Le Petit Démon Destructeur

Un jeu **incrémental** dans lequel tu incarnes un petit démon mineur surgi des
Enfers avec une seule mission : **tout réduire en cendres** sur une grille
isométrique 2D — avant de te faire exorciser.

![thème : prairie, ferme, hameau, cité sainte…](#)

## 🎯 Concept

- Le joueur est un **petit démon** qui détruit tout sur son passage.
- Chaque **niveau** est une zone isométrique remplie d'objets et d'êtres vivants
  à anéantir (buissons, arbres, moutons, villageois, chaumières, chapelles,
  statues saintes, paladins…).
- Le démon a une **durée de vie** : un chronomètre qui représente le temps avant
  d'être **exorcisé** par les prières des mortels.
- À chaque exorcisme, on **comptabilise les ravages** et on récompense le joueur
  en **âmes 💀** (la monnaie du jeu), qu'il dépense pour **s'améliorer**.
- S'il détruit **tout un niveau** avant d'être exorcisé, il passe à un niveau
  **plus difficile** (grille plus grande, cibles plus coriaces, ennemis plus
  redoutables).

## 🎮 Comment jouer

1. Ouvre simplement **`index.html`** dans un navigateur (aucun serveur requis).
2. Le démon 😈 se déplace et **détruit automatiquement** la cible la plus proche.
3. **Clique** sur une cible pour la viser et lui infliger un *clic infernal*.
4. Récolte des **âmes** et achète des **pouvoirs** dans la boutique :
   - 🩸 **Griffes Infernales** — plus de dégâts par coup
   - ⚡ **Frénésie Démoniaque** — attaques plus rapides
   - 🦶 **Pattes Véloces** — déplacement plus rapide
   - ⏳ **Longévité Maudite** — survivre plus longtemps
   - 🔥 **Souffle de Feu** — dégâts de zone aux cibles adjacentes
   - 💀 **Récolte d'Âmes** — plus d'âmes par destruction
   - 👿 **Esprits Serviteurs** — des lutins qui détruisent avec toi
   - ☄️ **Clic Cataclysmique** — clic plus puissant
5. Deviens assez fort pour **nettoyer un niveau entier** et progresser.

La progression (âmes, niveau, pouvoirs **et la partie en cours**) est
**sauvegardée automatiquement** dans le navigateur (`localStorage`).

## 💾 Sauvegarde & niveaux reproductibles

- **Niveaux aléatoires mais déterministes.** Chaque joueur possède une *graine*
  (seed) sauvegardée. La génération des niveaux est aléatoire mais **reproductible**
  à partir de cette graine : le même joueur retrouvera toujours la même suite de
  niveaux, à l'identique.
- **Reprise exacte.** La partie en cours est sauvegardée en continu (niveau,
  chronomètre, points de vie de chaque cible, tuiles calcinées). En rouvrant le
  jeu, le bouton **« Reprendre la partie »** te remet exactement où tu en étais.
- **Transfert entre appareils.** Sans serveur, la synchronisation automatique
  n'est pas possible ; le menu **⚙️ Options & sauvegarde** permet donc d'**exporter**
  ta partie sous forme de code, puis de l'**importer** sur un autre appareil pour
  continuer là où tu t'étais arrêté.

## 📱 Application mobile (PWA)

Hellcremental est une **Progressive Web App** installable :

- **Installable** sur l'écran d'accueil (mobile & bureau) via le bouton 📲 ou le
  menu du navigateur.
- **Fonctionne hors-ligne** grâce à un *service worker* qui met la coquille de
  l'app en cache.
- **Interface tactile et responsive** : mise en page adaptée aux petits écrans,
  gestion du *notch* (safe-area), et jeu au doigt.

> ℹ️ L'installation et le mode hors-ligne nécessitent que le jeu soit servi via
> **http(s)** ou **localhost** (le service worker ne fonctionne pas en `file://`).
> Pour tester en local :
> ```bash
> npx serve .        # ou : python3 -m http.server
> ```
> puis ouvre l'adresse indiquée. Le jeu reste jouable en ouvrant directement
> `index.html`, mais sans installation ni cache hors-ligne.

## 🧱 Structure du projet

```
index.html          Structure de la page (HUD, scène, boutique, menu, PWA)
manifest.json       Manifeste PWA (nom, icônes, couleurs, installation)
service-worker.js   Cache hors-ligne & installation
icons/              Icônes de l'application (SVG + PNG 192/512 + maskable)
css/style.css       Thème sombre & infernal, mise en page responsive & mobile
js/config.js        Équilibrage : cibles, thèmes de niveaux, pouvoirs
js/rng.js           Générateur aléatoire à graine (niveaux déterministes)
js/iso.js           Rendu isométrique (conversions grille↔écran, caméra)
js/game.js          Logique : état, génération, sauvegarde/reprise, boucle, rendu
js/ui.js            Interface : HUD, boutique, menu, écrans de fin, install PWA
js/main.js          Point d'entrée : redimensionnement, entrées, service worker, boucle
```

## 🛠️ Technologies

HTML, CSS et **JavaScript vanilla** — aucune dépendance, aucun build.
Rendu de la grille isométrique sur `<canvas>` (compatible HiDPI), effets de
particules, et interface entièrement en français.

---

*Sème le chaos. Récolte les âmes. Recommence, plus terrible encore.*
