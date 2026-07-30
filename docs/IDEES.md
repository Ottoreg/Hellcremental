# Hellcremental — Idées & roadmap (notes de conception)

Notes de design pas encore implémentées, à reprendre plus tard.

## Endgame : l'embranchement après la première Fin du Monde

Quand le joueur **bat le mode Fin du Monde pour la première fois**, lui offrir un
**choix définitif** entre deux voies :

### Structure commune aux deux voies
Chaque voie ouvre **une nouvelle campagne de 70 niveaux**, thématisée selon le choix
(Cieux ou Enfers), avec des **ennemis et des lieux inédits** propres à ce décor.
- **Tous les 10 niveaux** : un boss majeur à vaincre — un **Archange** (voie du
  Blasphème) ou un **démon primordial** (voie de la Trahison). Soit 7 boss d'étape
  par campagne, sur le modèle des 7 Vertus de la campagne principale.

### Voie du Blasphème suprême — détruire les Cieux
- 70 niveaux célestes, nouveaux ennemis/lieux du thème des Cieux.
- Boss tous les 10 niveaux : les **Archanges**.
- Après avoir vaincu les 7 Archanges → affronter **l'Être divin ultime** (boss final céleste).

### Voie de la Trahison suprême — détruire les Enfers
- 70 niveaux infernaux, nouveaux ennemis/lieux du thème des Enfers.
- Boss tous les 10 niveaux : les **démons primordiaux** (les 7 péchés).
- Après avoir vaincu les 7 démons → affronter **l'Être démoniaque ultime** (boss final infernal).

### Unités hostiles thématiques (remplacent les prêtres exorcistes)
Dans la campagne principale, les **prêtres** accélèrent l'exorcisme (drainent la
survie). Dans chaque campagne d'endgame, ce rôle est remplacé par des ennemis
actifs propres au thème :

**Cieux — les Anges** (voie du Blasphème) :
- **Exorcisent le joueur** (comme les prêtres : drainent la durée de vie).
- **Soignent régulièrement** les entités proches (rendent des PV aux cibles autour).
- **Ressuscitent de temps en temps** les entités vivantes détruites à proximité.

**Enfers — les Démons mineurs** (voie de la Trahison) :
- **Attaquent les serviteurs** du joueur : les serviteurs reçoivent désormais des
  **PV** et peuvent être **tués pour le niveau en cours** (réinvoqués au niveau suivant).
- **Brident les pouvoirs magiques** : **augmentent les cooldowns** des sorts actifs
  (Foudre, Météore, Flammes Noires…).

**Impacts techniques à prévoir :**
- Ajouter une **barre/pool de PV aux serviteurs** (esprits, colosse, vagabonds,
  foudroyeurs) — aujourd'hui ils sont invulnérables. Nécessaire pour les Enfers.
- Système d'**entités hostiles mobiles** qui ciblent le joueur/serviteurs, distinct
  des cibles destructibles passives actuelles.
- Effets de **soin / résurrection** côté cibles (Anges) et de **malus de cooldown**
  côté pouvoirs (Démons mineurs).

**Notes ouvertes à trancher plus tard :**
- Le choix est-il verrouillé à vie, ou reversible à chaque cycle / prestige ?
- Faut-il rejouer la Fin du Monde à chaque fois pour re-choisir, ou l'accès reste-t-il ouvert ?
- Les Archanges (méga-boss) étaient déjà notés comme le grand morceau manquant
  du bout de boucle — cet embranchement les intègre côté « Blasphème ».

## Outillage de test : sélecteur de monde de départ

Pour tester l'endgame sans avoir à tout rejouer, prévoir un **mode de test** (dev)
qui laisse **choisir par quel monde on démarre** :
- **Monde normal** (campagne de base)
- **Cieux** (voie du Blasphème)
- **Enfers** (voie de la Trahison)

**Contrainte importante :** la **courbe de difficulté reste identique** pour ces
niveaux quel que soit le monde de départ. Autrement dit, le niveau N a la même
difficulté de base (PV, densité, etc.) qu'on commence par le monde normal, les
Cieux ou les Enfers — seuls le thème, les ennemis et les boss changent, pas le
scaling. Démarrer directement dans les Cieux ne doit pas hériter du bonus de PV
post-70 : chaque campagne se recompte comme sa propre progression 1→70.

**À prévoir techniquement :**
- Découpler le **thème/monde** du **numéro de difficulté** dans la génération de
  niveau (aujourd'hui `hpMult`/`valMult`/biome dérivent tous du même `level`).
- Un bouton dev (comme 💰 / ⏭️) ou un petit menu de choix au démarrage en mode test.

## Rappel : maillon manquant existant
- Les **Archanges méga-boss** évoqués dès la conception initiale du prestige
  (« incarner un primordial pour affronter les Archanges ») n'ont jamais été
  codés. La voie du Blasphème ci-dessus est l'occasion de les créer.
