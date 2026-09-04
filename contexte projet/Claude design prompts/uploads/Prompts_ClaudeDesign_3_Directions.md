# Prompts pour Claude Design — Exploration de 3 directions visuelles
## Projet : Gougoul Holocron (refonte complète de l'interface)

> **Contexte à donner à Claude Design en une phrase :** Gougoul Holocron est un cloud privé académique de campus (portail web + mobile) avec trois profils d'utilisateurs — étudiant, professeur/assistant, administrateur — permettant l'explorateur de fichiers, la soumission de devoirs, des dossiers de cours partagés, un espace communautaire de dépôt libre, une corbeille, et un panel d'administration. On explore ici **3 directions visuelles distinctes**, chacune avec un mode clair ET un mode sombre réversibles, avant de choisir laquelle développer sur l'ensemble du produit.

---

## COMMENT UTILISER CE FICHIER

Il contient **4 prompts** :
1. Un **prompt d'exploration comparative** (à utiliser en premier) : demande les 3 directions sur un même écran de référence (le tableau de bord étudiant), en clair et en sombre → 6 variantes à comparer d'un coup d'œil.
2. Trois **prompts détaillés séparés** (un par direction), à utiliser ensuite pour approfondir la direction retenue sur davantage d'écrans.

Copie-colle le Prompt 1 en premier dans Claude Design.

---

## PROMPT 1 — Exploration comparative (à lancer en premier)

```
Je conçois l'interface de "Gougoul Holocron", un cloud privé académique de campus
(portail web + mobile responsive) avec 3 profils utilisateurs : étudiant, professeur/
assistant, administrateur. Fonctionnalités : tableau de bord, explorateur de fichiers,
soumission de devoirs, dossiers de cours partagés, espace communautaire de dépôt libre,
corbeille, panel admin, paramètres.

Je veux EXPLORER 3 directions visuelles distinctes avant de choisir. Génère l'écran de
"tableau de bord étudiant" (desktop, ~1440px) décliné dans les 3 directions ci-dessous,
CHACUNE en mode clair ET mode sombre (soit 6 versions de l'écran). Garde exactement la
même structure et le même contenu dans les 6 versions — seule l'identité visuelle change
— pour permettre une comparaison directe.

CONTENU DE L'ÉCRAN (identique dans les 6 versions) :
- Barre de navigation latérale (desktop) : Accueil, Mes fichiers, Soumissions, Cours
  partagés, Espace communautaire, Corbeille, Paramètres. Logo "Gougoul Holocron" en haut.
  Un bouton de bascule clair/sombre visible dans la barre ou l'en-tête.
- En-tête : "Bonjour, Victoire" + avatar + indicateur "Serveur opérationnel".
- Jauge de stockage circulaire ou linéaire : "1.2 Go / 2 Go utilisés".
- Section "Fichiers récents" : 4 cartes de fichiers (icônes par type : PDF, image, zip,
  tableur), nom + taille + date.
- Section "Cours partagés" : 3 cartes de dossiers (Génie Logiciel, Intelligence
  Artificielle, Systèmes Informatiques) avec nombre de fichiers.
- Section "Devoirs à rendre" : 2 lignes avec statut (à rendre / rendu), date limite.
- Un état vide élégant si une section n'a rien (pour "Espace communautaire" par exemple).

── DIRECTION A : "AURORA" ──────────────────────────────────────────────
Personnalité : calme, moderne, un peu magique/premium.
Mode sombre : fond #0E0F13, surfaces #181A20, accent indigo-lavande #8B93FF, accent
secondaire vert menthe #4DE0A0, texte #E6E7EE.
Mode clair : fond #F7F8FC, surfaces #FFFFFF, accent #5B63E6, secondaire #12A66B,
texte #1A1C22.
Typographie : Inter ou Geist, hiérarchie par poids et espacement. Coins arrondis
généreux (12-16px), cartes quasi sans bordure avec élévation par subtil décalage de
luminosité (pas d'ombre lourde ni de bordure épaisse).

── DIRECTION B : "MERIDIAN" ────────────────────────────────────────────
Personnalité : institutionnel, sérieux, digne de confiance — l'identité "officielle"
d'une faculté moderne, très lisible en toute condition de lumière.
Mode sombre : fond #0D1420, surfaces #152033, accent bleu roi #3E7BFA, secondaire
ambre #F5A524, texte #E4E9F2.
Mode clair : fond #F4F6F9, surfaces #FFFFFF, accent #2563EB, secondaire #D98A00,
texte #0F172A.
Typographie : sans-serif classique et structurée (Inter ou similaire), coins arrondis
modérés (8-10px), cartes avec fine bordure ET légère élévation, mise en page plus
dense et structurée façon tableau de bord d'entreprise.

── DIRECTION C : "SLATE & CITRUS" ──────────────────────────────────────
Personnalité : ultra épuré, esprit outil professionnel 2026 (façon Linear/Vercel),
audacieux, un seul accent électrique qui claque sur un fond neutre.
Mode sombre : fond gris vrai (pas noir pur) #0B0B0C, surfaces #161618, UN SEUL accent
saturé citron-vert #C4F042 utilisé avec parcimonie (boutons primaires, indicateurs
actifs uniquement), texte blanc cassé #EDEDED.
Mode clair : fond #FAFAFA, surfaces #FFFFFF, accent citron adapté en version foncée
lisible sur clair (ex. #7A9A00), texte #141414.
Typographie : très minimaliste, énormément d'espace blanc/négatif, cartes totalement
sans bordure (élévation uniquement par la luminosité), interface presque "silencieuse"
qui ne montre l'accent que là où une action est possible.

── RÈGLES COMMUNES AUX 6 VERSIONS ──────────────────────────────────────
- Priorité à la clarté : ne pas surcharger le tableau de bord de métriques.
- Contraste accessible (WCAG : au moins 4.5:1 texte courant, 3:1 gros texte/icônes),
  y compris en mode sombre — jamais de blanc pur sur noir pur.
- La couleur d'accent sert uniquement le sens (action principale, statut actif) —
  jamais la décoration pure.
- Montre clairement le bouton/interrupteur de bascule clair ↔ sombre dans chaque
  version, à l'identique de sa direction.

Présente les 6 écrans côte à côte ou en grille claire, légendés (ex. "Aurora — Sombre",
"Aurora — Clair", "Meridian — Sombre", etc.) pour faciliter la comparaison.
```

---

## PROMPT 2 — Approfondir "AURORA" (si retenue)

```
Développe la direction visuelle "AURORA" pour Gougoul Holocron sur l'ensemble du
parcours utilisateur, en mode clair ET sombre (bascule réversible).

SYSTÈME DE DESIGN :
- Sombre : fond #0E0F13, surface #181A20, surface élevée #20222A, accent #8B93FF,
  secondaire #4DE0A0, alerte #FF6B6B, texte #E6E7EE, texte atténué #9A9CA8,
  bordure #2A2C36 (très subtile, utilisée avec parcimonie).
- Clair : fond #F7F8FC, surface #FFFFFF, surface élevée #EEF0FF, accent #5B63E6,
  secondaire #12A66B, alerte #E5484D, texte #1A1C22, texte atténué #6B6E7A,
  bordure #E2E4EF.
- Typographie Inter, échelle de tailles claire (titres 28-32px, sous-titres 18-20px,
  corps 14-15px, légendes 12px). Poids : 700 pour titres, 600 pour actions, 400 pour
  le corps.
- Coins arrondis 12-16px. Élévation par décalage de luminosité de fond (pas d'ombres
  portées lourdes). Icônes fines type Font Awesome ou Phosphor.
- Composants à définir : boutons (primaire/secondaire/danger), champs de saisie,
  cartes de fichier, badges de statut, barre de progression d'upload avec bouton
  annuler, modales de confirmation, toggle clair/sombre animé.

ÉCRANS À PRODUIRE (desktop 1440px ET mobile 390px pour chacun, clair et sombre) :
1. Connexion / inscription (saisie du matricule → reconnaissance automatique du rôle
   → mot de passe → entrée), en 3 étapes fluides sur un seul écran.
2. Tableau de bord ÉTUDIANT (stockage, fichiers récents, devoirs à rendre, cours
   partagés en aperçu).
3. Tableau de bord PROFESSEUR/ASSISTANT (devoirs créés, soumissions à corriger,
   gestion des cours, statistiques simples).
4. Tableau de bord ADMINISTRATEUR (santé système, nombre d'utilisateurs, stockage
   global, accès rapide à la gestion).
5. Explorateur de fichiers (grille + liste, glisser-déposer, barre de progression
   d'upload avec bouton Annuler, menu contextuel : renommer/déplacer/supprimer/
   partager, fil d'Ariane).
6. Soumissions — vue étudiant (liste des devoirs avec statut visuel clair : à rendre/
   rendu/en retard, bouton de dépôt).
7. Soumissions — vue professeur (création guidée d'un devoir, tableau des rendus
   reçus, bouton télécharger).
8. Cours partagés (bibliothèque par filière, lecture seule étudiant / dépôt
   enseignant, barre de recherche).
9. Espace communautaire (mur de dépôt libre : cours, logiciels, médias — catégories,
   recherche, carte de dépôt avec icône de type de fichier).
10. Corbeille (liste des éléments supprimés, restaurer / supprimer définitivement,
    indication du délai avant purge automatique).
11. Panel Admin (table des utilisateurs avec recherche/filtre, actions rapides :
    modifier quota, désactiver compte, gestion des matricules autorisés).
12. Paramètres (profil, changement de mot de passe avec validation, préférences de
    thème, quota).

Pour chaque écran, prévoir les états : chargement (squelettes), vide (illustration
légère + message), erreur. Le tout responsive et cohérent entre desktop et mobile.
```

---

## PROMPT 3 — Approfondir "MERIDIAN" (si retenue)

```
Développe la direction visuelle "MERIDIAN" pour Gougoul Holocron sur l'ensemble du
parcours utilisateur, en mode clair ET sombre (bascule réversible).

SYSTÈME DE DESIGN :
- Sombre : fond #0D1420, surface #152033, surface élevée #1C2A42, accent bleu roi
  #3E7BFA, secondaire ambre #F5A524, alerte #EF4444, texte #E4E9F2, texte atténué
  #8B98AD, bordure #223148 (fine, visible — l'identité Meridian assume des bordures
  nettes plutôt que la seule élévation par luminosité).
- Clair : fond #F4F6F9, surface #FFFFFF, surface élevée #EAF0FE, accent #2563EB,
  secondaire #D98A00, alerte #DC2626, texte #0F172A, texte atténué #64748B,
  bordure #DDE3ED.
- Typographie sans-serif structurée (Inter), hiérarchie plus dense et "tableau de
  bord d'entreprise" : titres 24-28px, corps 14px, usage généreux de tableaux et de
  listes structurées plutôt que de grandes cartes illustrées.
- Coins arrondis modérés (8-10px). Cartes avec fine bordure + légère ombre portée
  (identité plus "solide"/institutionnelle qu'Aurora). Icônes nettes, style outline.
- Composants : boutons nets à angles peu arrondis, champs de saisie avec libellés
  toujours visibles au-dessus, badges de statut carrés/rectangulaires, tableaux de
  données avec en-têtes soulignés, toggle clair/sombre discret dans la barre supérieure.

ÉCRANS À PRODUIRE (mêmes 12 écrans que dans le Prompt 2, desktop 1440px ET mobile
390px, clair et sombre) :
1. Connexion / inscription par matricule (3 étapes).
2. Tableau de bord ÉTUDIANT.
3. Tableau de bord PROFESSEUR/ASSISTANT.
4. Tableau de bord ADMINISTRATEUR.
5. Explorateur de fichiers (privilégier une vue en LISTE/tableau dense par défaut,
   avec bascule vers vue grille — cohérent avec l'esprit "outil professionnel").
6. Soumissions — vue étudiant.
7. Soumissions — vue professeur (tableau de correction structuré).
8. Cours partagés.
9. Espace communautaire.
10. Corbeille.
11. Panel Admin — c'est l'écran où Meridian doit particulièrement briller : table de
    gestion des utilisateurs dense, filtres avancés, actions en masse, aspect
    "console d'administration professionnelle".
12. Paramètres.

Prévoir les états chargement/vide/erreur. Cohérence stricte desktop/mobile.
```

---

## PROMPT 4 — Approfondir "SLATE & CITRUS" (si retenue)

```
Développe la direction visuelle "SLATE & CITRUS" pour Gougoul Holocron sur l'ensemble
du parcours utilisateur, en mode clair ET sombre (bascule réversible).

SYSTÈME DE DESIGN :
- Sombre : fond gris vrai (jamais noir pur) #0B0B0C, surface #161618, surface élevée
  #1E1E20, UN SEUL accent saturé citron-vert #C4F042 utilisé avec grande parcimonie
  (uniquement : bouton d'action principale, indicateur d'état actif, focus). Aucune
  seconde couleur d'accent — les statuts (succès/erreur) restent dans une palette
  neutre légèrement teintée plutôt que des couleurs vives supplémentaires. Texte
  blanc cassé #EDEDED, texte atténué #8A8A8E.
- Clair : fond #FAFAFA, surface #FFFFFF, accent citron adapté en version foncée et
  lisible sur fond clair (#7A9A00), texte #141414, texte atténué #6E6E72.
- Typographie minimaliste, poids de police et espacement (jamais la couleur) pour la
  hiérarchie. Énormément d'espace négatif entre les blocs. Titres sobres, pas de
  gros aplats colorés.
- ZÉRO bordure sur les cartes — l'élévation se fait uniquement par un décalage très
  subtil de luminosité du fond (2-4% de différence). Coins arrondis discrets (6-8px).
  Interface "silencieuse" : l'accent citron n'apparaît que là où une action est
  réellement possible, jamais en décoration.
- Composants : boutons primaires pleins en accent citron (seul élément vraiment
  coloré de l'écran), boutons secondaires en simple contour texte, champs de saisie
  très épurés (soulignés plutôt qu'encadrés), badges de statut discrets en niveaux
  de gris + un point de couleur minimal, toggle clair/sombre minimaliste.

ÉCRANS À PRODUIRE (mêmes 12 écrans que dans le Prompt 2, desktop 1440px ET mobile
390px, clair et sombre) :
1. Connexion / inscription par matricule (3 étapes, écran presque nu, très centré).
2. Tableau de bord ÉTUDIANT (afficher UN SEUL chiffre clé bien mis en avant plutôt
   que plusieurs métriques concurrentes — cohérent avec l'esprit minimaliste 2026 :
   "prioriser avant d'exposer la profondeur").
3. Tableau de bord PROFESSEUR/ASSISTANT.
4. Tableau de bord ADMINISTRATEUR.
5. Explorateur de fichiers (design très aéré, icônes de fichiers discrètes en
   niveaux de gris, l'accent citron réservé au bouton "Uploader").
6. Soumissions — vue étudiant.
7. Soumissions — vue professeur.
8. Cours partagés.
9. Espace communautaire.
10. Corbeille.
11. Panel Admin.
12. Paramètres.

Prévoir les états chargement/vide/erreur, en restant fidèle à l'esprit minimaliste
(pas d'illustrations chargées, des messages courts et discrets). Cohérence stricte
desktop/mobile.
```

---

## Après l'exploration

Une fois les 6 variantes du Prompt 1 obtenues, compare-les avec Victoire selon ces critères :
- Laquelle est la plus lisible et agréable à l'usage quotidien (fatigue visuelle) ?
- Laquelle correspond le mieux à l'image que le projet doit renvoyer (premium/calme,
  institutionnel/sérieux, ou tendance/pro) ?
- Laquelle fonctionne le mieux dans les deux modes (certaines directions sont plus
  fortes en sombre qu'en clair, ou l'inverse) ?

Puis lance le Prompt 2, 3 ou 4 correspondant à la direction choisie pour couvrir
l'ensemble des écrans du produit.
