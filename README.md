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

La progression (âmes, niveau, pouvoirs) est **sauvegardée automatiquement** dans
le navigateur (`localStorage`).

## 🧱 Structure du projet

```
index.html          Structure de la page (HUD, scène, boutique)
css/style.css       Thème sombre & infernal, mise en page responsive
js/config.js        Équilibrage : cibles, thèmes de niveaux, pouvoirs
js/iso.js           Rendu isométrique (conversions grille↔écran, caméra)
js/game.js          Logique : état, génération de niveau, boucle, rendu
js/ui.js            Interface : HUD, boutique, écrans de fin
js/main.js          Point d'entrée : redimensionnement, entrées, boucle d'animation
```

## 🛠️ Technologies

HTML, CSS et **JavaScript vanilla** — aucune dépendance, aucun build.
Rendu de la grille isométrique sur `<canvas>` (compatible HiDPI), effets de
particules, et interface entièrement en français.

---

*Sème le chaos. Récolte les âmes. Recommence, plus terrible encore.*
