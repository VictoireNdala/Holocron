# ROADMAP.md — Holocron

> Ce fichier découpe l'objectif principal en **mini-objectifs séquentiels
> (steps)**. Chaque step est petit, testable, et fait avancer vers l'objectif
> sans tout casser. Un step se coche seulement quand il est **déployé et
> vérifié en conditions réelles** (pas juste "codé").
>
> État possible d'un step : `⬜ à faire` · `🔶 en cours` · `✅ fait`.
> Quand un step est terminé, déplace-le en bas dans "Historique des steps
> terminés" (ou laisse-le coché ici si la liste reste courte) et ajoute une
> ligne dans `JOURNAL.md`.

---

## 0. Zones de responsabilité — à tenir à jour par chacun

> **Règle :** chaque agent (Claude, Claude Code, Claude Design) met a jour
> **sa propre zone** apres chaque session de travail — jamais celle d'un
> autre. Trois champs par zone : **Fait** (deja livre et verifie),
> **A faire** (prochaine chose a produire), **Attend des autres** (ce qui
> bloque tant qu'un autre agent n'a pas livre quelque chose de precis).

### 🔵 Zone Claude (conversation — stratégie, specs, conception)
- **Fait :** systeme `.md` pose ; conception complete de l'Espace
  communautaire (facettes, badges, quotas, couverture) ; conception
  complete du Panel Admin avance (2 niveaux, permissions, dossiers
  prioritaires, logs) ; tous les prompts Claude Design ecrits ; renommage
  Holocron propage ; **spec technique ecrite pour l'Espace communautaire
  (D1.7) et le Panel Admin avance (D2)** — endpoints, contrats, noms de
  champs — voir ces sections ci-dessous, a jour au 2026-09-04.
- **A faire :** ecrire la spec technique des ecrans encore manquants
  (Soumissions/Cours partages/Corbeille Slate & Citrus, dashboards
  Professeur/Admin, mobile 390px, etats vide/chargement/erreur) au fur et
  a mesure qu'ils arrivent de Claude Design.
- **Attend des autres :**
  - de **Claude Design** : les ecrans manquants (mobile Espace
    communautaire, Soumissions/Cours partages/Corbeille en Slate & Citrus,
    dashboards Professeur/Admin) avant de pouvoir en ecrire la spec
    technique.
  - de **Claude Code** : un retour sur l'etat reel du code existant avant
    de proposer une spec qui supposerait a tort qu'une route existe deja.

### 🟢 Zone Claude Code (implémentation dans VS Code)
- **Fait :** *(a completer par Claude Code lui-meme a chaque session — ne
  pas laisser cette ligne vide plus d'une session)*
- **A faire :** *(a completer — se referer aux Axes B a E ci-dessous pour
  la liste des steps disponibles)*
- **Attend des autres :**
  - de **Claude Design** : un ecran doit etre explicitement **valide par
    Victoire** avant d'etre implemente — ne jamais builder sur un rendu non
    confirme.
  - de **Claude** : la spec technique (endpoints, modele de donnees exact)
    pour toute fonctionnalite nouvelle (Espace communautaire, Panel Admin
    avance) avant d'ecrire le backend correspondant.

> **Protocole explicite Claude Design → Claude Code (leve toute ambiguite) :**
> Claude Design produit des **maquettes visuelles de reference**
> (fichiers `.dc.html`, exports image/PDF) — jamais du code a integrer tel
> quel. Claude Code ne copie-colle PAS ce HTML dans l'application : il
> **reimplemente** l'ecran en React (JSX, composants du projet, tokens de
> couleur en variables CSS/JS cohérentes avec le reste du code), branche
> les vraies donnees via l'API, et respecte les conventions déjà en place
> dans `Dashboard.jsx`/`api.js`. La maquette sert de reference visuelle et
> de comportement (etats, interactions), pas de source a copier.

### 🟣 Zone Claude Design (maquettes visuelles)
- **Fait :** Dashboard etudiant, Connexion, Explorateur, Panel Admin (base),
  Parametres, module Espace communautaire complet (Catalogue, Fiche detail,
  Formulaire de depot, Moderation) — desktop 1440px, clair + sombre, Slate
  & Citrus ; **3 onglets Panel Admin avance** (Administrateurs, Dossiers
  prioritaires, Journaux d'activite) — desktop 1440px, clair + sombre.
- **A faire :** versions mobile 390px de l'Espace communautaire ;
  Soumissions (etudiant + prof), Cours partages, Corbeille en Slate &
  Citrus (existent seulement en Meridian) ; dashboards Professeur et Admin ;
  etats chargement/vide/erreur partout.
- **Attend des autres :** rien de bloquant actuellement — les prompts pour
  tout ce qui reste a faire sont deja ecrits et disponibles (voir fichiers
  `Prompt_*.md`).

---

## Objectif principal

> Voir `CONTEXT.md` section 2 pour la définition complète de « système fini ».
> En résumé : un système complet, stable, sauvegardé, où étudiants, profs et
> admin font tout via le portail — fichiers, soumissions, cours, mot de
> passe, espace communautaire, administration.

---

## Axe A — Refonte de l'interface (Claude Design)

- ⬜ **A1.** Lancer le Prompt 1 (exploration comparative) → obtenir les 6
  rendus (3 directions × clair/sombre).
- ⬜ **A2.** Choisir la direction visuelle avec le groupe. Mettre à jour
  `CONTEXT.md` section 9 avec le choix.
- ⬜ **A3.** Lancer le Prompt 2/3/4 correspondant → obtenir les 12 écrans
  clés (desktop + mobile, clair + sombre).
- ⬜ **A4.** Traduire chaque écran validé en spécification technique
  (composants, états, endpoints API nécessaires) → alimente les axes B à F
  ci-dessous.

## Axe B — Gestion de fichiers (finitions connues)

- ⬜ **B1. Corbeille.** Intégrer l'API trashbin native de Nextcloud
  (lister les éléments supprimés, restaurer, purger). Écran dédié une fois
  la direction visuelle choisie (A3).
- ⬜ **B2. Suppression équilibrée.** Un étudiant peut supprimer SES propres
  fichiers personnels (hors Team Folders `Cours-*`, qui restent protégés).
  Ajuster la route `DELETE /files` pour autoriser l'étudiant sur son propre
  espace uniquement.
- ⬜ **B3. Téléchargement direct des gros fichiers.** Éviter que le fichier
  transite intégralement par le backend (actuellement source de lenteur) —
  explorer un lien de téléchargement direct ou un streaming optimisé.

## Axe C — Compte utilisateur

- ⬜ **C1. API changement de mot de passe.** Le formulaire existe déjà dans
  Settings (non branché). Créer la route backend (met à jour `users.password`
  ET `nc_password` ET le mot de passe Nextcloud via OCS), brancher le
  frontend.

## Axe D — Nouvelles fonctionnalités structurantes

- 🔶 **D1. Espace libre communautaire.** Conception et design terminés
  (2026-09-04) — voir CONTEXT.md section "Espace communautaire" et
  DECISIONS.md D-2026-09-04-01 à 04. Implémentation pas commencée.
  - ✅ D1.1 Modèle de données (`community_resources`, `faculties`, `levels`)
  - ✅ D1.2 Classification à 3 facettes (Faculté/Niveau/Catégorie)
  - ✅ D1.3 Système de badges de vérification (logiciels uniquement)
  - ✅ D1.4 Écrans desktop Slate & Citrus (catalogue, fiche, dépôt, modération)
  - ⬜ D1.5 Écrans mobile 390px (prompt à lancer)
  - ⬜ D1.6 États chargement/vide/erreur
  - 🔶 D1.7 Backend : routes API — spec écrite (2026-09-04), pas codée :
    - `GET /api/faculties`, `GET /api/levels`
    - `GET /api/community/resources?faculty=&level=&category=&q=&sort=`
    - `GET /api/community/resources/:id` (détail + ressources similaires)
    - `POST /api/community/resources` (multipart : `fichier`, `cover_image?`,
      `titre`, `description`, `categorie`, `faculty_id?`, `level_id?`)
    - `GET /api/community/resources/:id/download` (403 si `dangereux`)
    - `POST /api/community/resources/:id/report`
    - `PATCH /api/community/resources/:id/verification` `{status: verifie|dangereux}`
      — requiert permission `verifier_logiciels`, catégorie Logiciel uniquement
    - `DELETE /api/community/resources/:id` — requiert `moderer_communautaire`
  - ⬜ D1.8 Team Folder Nextcloud `Communautaire` + sous-dossiers catégorie
  - ⬜ D1.9 Frontend : intégration React des écrans validés
- 🔶 **D2. Interface d'administration (panel admin).** Conception complète
  (2 niveaux, permissions à la carte, dossiers prioritaires, logs) — voir
  DECISIONS.md D-2026-09-04-05/06/07. Écrans desktop livrés (2026-09-04).
  Implémentation pas commencée.
  - ✅ D2.1 Modèle de données (`users.is_admin`/`admin_level`,
    `admin_permissions`, `community_priority_folders`, `faculty_filieres`,
    `activity_logs`) — voir DECISIONS.md
  - ✅ D2.2 Écrans desktop Slate & Citrus (Administrateurs, Dossiers
    prioritaires, Journaux d'activité)
  - ⬜ D2.3 Backend : routes API — spec écrite (2026-09-04), pas codée :
    - `GET /api/admin/admins` (liste + niveau + permissions)
    - `GET /api/admin/users/search?q=` (nom ou matricule)
    - `POST /api/admin/admins/:userId/grant`
      `{admin_level: super|simple, permissions?: string[]}` — promotion
      super admin = confirmation supplémentaire côté frontend, action
      journalisée dans `activity_logs`
    - `DELETE /api/admin/admins/:userId` (retirer les droits admin)
    - `GET /api/admin/priority-folders`
    - `POST /api/admin/priority-folders`
      `{faculty_id, filiere_id?, level_id?}` — requiert `gerer_dossiers`
    - `DELETE /api/admin/priority-folders/:id`
    - `GET /api/admin/logs?user=&action=&from=&to=` — requiert `voir_logs`
  - ⬜ D2.4 Middleware `checkPermission(permission)` (super admin bypass
    implicite, admin simple vérifie `admin_permissions`)
  - ⬜ D2.5 Frontend : intégration React des 3 écrans + modale de
    confirmation super admin
- ⬜ **D3. Notifications (cloche) fonctionnelles** — au moins pour les
  événements clés (nouveau devoir, rendu reçu, dépôt communautaire).
- ⬜ **D4. Page de gestion du stockage dédiée** (au-delà de la jauge simple
  du Dashboard).

## Axe E — Infrastructure et résilience

- ⬜ **E1. Redondance disque.** Miroir ZFS si un second disque est
  disponible.
- ⬜ **E2. Snapshots ZFS planifiés** (automatiser au-delà des snapshots
  manuels actuels).
- ⬜ **E3. Surveillance SMART** des disques.
- ⬜ **E4. Nom de domaine local** (`holocron.local`) en remplacement de
  l'IP — mDNS ou reverse proxy.

## Entre parenthèses (pas prioritaire, ne pas commencer sans décision explicite)

- Assistant IA local (Ollama) — matériel actuel limité (i5/8 Go, sans GPU).
- Migration vers le supercalculateur universitaire — chantier séparé, après
  que le système actuel soit complet sur l'infrastructure présente.

---

## Ordre de travail suggéré

1. **Axe A en premier** (A1 → A4) : le visuel final conditionne la façon
   dont on implémente tout le reste (composants, écrans, endpoints attendus).
2. Puis les finitions rapides et à faible risque : **B2, C1, B1**.
3. Puis les nouveaux chantiers structurants : **D1, D2** (les plus
   demandés/visibles).
4. Le reste (B3, D3, D4, axe E) au fil de l'eau, sans bloquer les précédents.

> Cet ordre est une suggestion, pas une contrainte — à ajuster librement
> selon les priorités du moment. Le mettre à jour ici si l'ordre change.

---

## Historique des steps terminés

_(vide pour l'instant — le système actuel, avant cette réorganisation, est
déjà entièrement décrit dans `CONTEXT.md` section 7 et dans `JOURNAL.md`.)_
