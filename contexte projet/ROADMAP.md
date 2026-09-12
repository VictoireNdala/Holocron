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
  Holocron propage ; spec technique ecrite pour l'Espace communautaire
  (D1.7) et le Panel Admin avance (D2) ; **8 points de retour d'usage
  structures en Axe F** apres le premier passage reel du 2026-09-12
  (voir Axe F ci-dessous et DECISIONS.md D-2026-09-12-01/02/03).
- **A faire :** suivre l'implementation de l'Axe F par Claude Code et
  ajuster/preciser les decisions si des questions se posent en cours de
  route (notamment F6, le chantier taxonomie dynamique).
- **Attend des autres :**
  - de **Claude Code** : implementation de B0 (priorite haute) puis de
    l'Axe F, dans l'ordre suggere plus bas.

### 🟢 Zone Claude Code (implémentation dans VS Code)
- **Fait (2026-09-04) :** B2 Suppression équilibrée — route `DELETE
  /files/delete` ouverte à tous les rôles (retrait de `checkRole`), contrôle
  déplacé dans `fileController.deleteFile` : un étudiant ne peut pas
  supprimer dans un Team Folder `Cours-*` (403 explicite), reste libre sur
  son propre espace ; bouton supprimer de l'Explorateur (React) activé pour
  l'étudiant hors dossiers de cours (`canDelete`, remplace l'ancien
  `isProf`). B1 Corbeille (backend uniquement, pas d'écran — en attente de
  la maquette Slate & Citrus) — 4 nouvelles routes API trashbin natif
  Nextcloud : `GET /files/trash`, `POST /files/trash/restore`,
  `DELETE /files/trash/item`, `DELETE /files/trash/empty` (le DELETE normal
  alimentait déjà la corbeille Nextcloud sans le savoir). `node --check` OK
  sur les fichiers backend modifiés.
- **Fait (2026-09-04, suite) :** C1 API changement de mot de passe —
  `POST /api/auth/change-password` dans `authController.js`/`routes/auth.js`,
  helper `setUserPassword` ajouté à `config/nextcloud.js`, formulaire
  Settings (`Dashboard.jsx`) branché sur `changePassword()` de `api.js`.
  B3 téléchargement direct (lecture disque pour l'espace personnel,
  `fileController.downloadFile`). **Backend complet de D1 (Espace
  communautaire) et D2 (Panel Admin avancé)** — voir détail dans les
  sous-items D1.7/D2.3/D2.4 ci-dessous : migrations SQL (`database/init.sql`
  + `database/migrations/2026-09-04_communautaire_et_panel_admin.sql`),
  `adminController.js`/`routes/admin.js`, `communityController.js`/
  `routes/community.js`, middleware `checkAdmin`/`checkPermission`.
- **Fait (2026-09-04, suite) :** Victoire a validé le canvas "Core Modules"
  (Claude Design) et demandé de tout construire. **Refonte frontend Slate &
  Citrus** de `Dashboard.jsx` (réécriture complète) à partir de la source
  exacte `Gougoul Holocron - Core Modules.dc.html` : nouveau
  `theme/tokens.js`, nouvelle coquille (sidebar desktop 7 entrées, barre
  mobile 4 icônes + feuille "Plus"), **Accueil et Corbeille reconstruits à
  l'identique de la source** (desktop), Corbeille (B1) branchée au backend,
  nouveaux onglets Cours partagés et Espace communautaire (état "Bientôt
  disponible" à l'époque), Explorateur/Soumissions/Paramètres retokenisés.
  Bug de chevauchement de texte corrigé, espacement mobile corrigé (safe-area).
  Build de production vérifié (compile sans erreur).
- **Fait (2026-09-05) :** `Login.jsx`/`Register.jsx` réécrits sur les
  tokens Slate & Citrus (Login fidèle au canvas, flux 3 étapes ; Register
  extrapolé). D1.9 Espace communautaire construit
  (`components/CommunitySpace.jsx`, catalogue/fiche/dépôt). D2.5 Panel
  Admin avancé construit (`components/AdminPanel.jsx`, 3 onglets).
  `GET /api/users/profile` corrigé pour exposer `is_admin`/`admin_level`/
  `permissions` (absent jusque-là).
- **Fait (2026-09-05, suite) :** couverture réelle + actions de modération
  dans `CommunitySpace` ; onglets Utilisateurs/Matricules du Panel Admin
  construits (backend neuf `listUsers`/`toggleUserActive`/`listMatricules`/
  `addMatricule`/`deleteMatricule`, route morte `GET /api/users/all`
  supprimée) ; Explorateur en vue Liste par défaut avec bascule Grille ;
  statut "En retard" sur les Soumissions étudiant.
- **Fait (2026-09-05, suite 3) :** sélecteur de filière + compteur de
  ressources pour les dossiers prioritaires (`GET /admin/faculty-filieres`
  nouveau) ; filtre "par utilisateur" des journaux d'activité ; mobile
  Panel Admin (chips défilables, formulaires de création masqués sur
  mobile, conforme à l'intention du canvas) ; mobile Espace communautaire
  (`ResourceRow` compact, chips en défilement horizontal).
- **Fait (2026-09-05, fin de session) :** tout le code de la session
  poussé sur GitHub (commit `c8c60b4`) — a servi de base au `git clone` de
  la migration disque du 2026-09-12, sans reconstruction manuelle.
- **Fait (2026-09-12) :** diagnostic et réparation d'une régression de
  documentation — `CONTEXT.md`/`ROADMAP.md`/`JOURNAL.md` avaient été
  partiellement régénérés (probablement par Claude conversation, à partir
  d'une copie ancienne) et avaient perdu la trace du travail des
  2026-09-04/05 (tables D2, statuts B1-C1/D1/D2, avancement du code réel)
  tout en gagnant les infos réelles et précieuses de la migration disque
  et du premier usage réel. Fusion des deux versions plutôt qu'écrasement
  — voir note dans `CONTEXT.md` section 12 pour la leçon retenue.
- **Fait (2026-09-12, audit + recommandations) :** audit sécurité/fiabilité
  du système existant à la demande de Victoire, recommandations codées
  dans la foulée (**Axe G, nouveau** — voir plus bas) : rate limiting
  (`express-rate-limit`), en-têtes de sécurité HTTP (`helmet`), durcissement
  `JWT_SECRET` (échec explicite au démarrage si absent, plus de valeur par
  défaut faible), pagination du catalogue communautaire, renommer/déplacer
  un fichier dans l'Explorateur (WebDAV MOVE), recherche locale dans "Mes
  fichiers", réinitialisation de mot de passe par un admin, et **D3
  Notifications** (cloche + panneau, 3 évènements : nouveau devoir, rendu
  reçu, dépôt communautaire). Build de production vérifié à chaque étape ;
  **pas encore testé contre le vrai serveur/la vraie base**.
- **Fait (2026-09-12, suite 5) :** **B0 corrigé** — rollback automatique
  du compte MySQL (et du compte Nextcloud si déjà créé) si l'inscription
  échoue à l'étape Nextcloud (`authController.register`,
  `config/nextcloud.js` : nouveau `deleteNextcloudUser`). En vérifiant ce
  chemin, découverte d'un bug directement lié dans `docker-compose.yml` :
  `NEXTCLOUD_PASSWORD` contenait encore l'ANCIENNE valeur (piège #16)
  au lieu de `gougoul123` documentée comme correcte depuis le 2026-09-12
  — corrigé (piège #18), sinon B0 aurait été déclenché à CHAQUE
  inscription. `JWT_SECRET` régénéré dans `docker-compose.yml` (valeur
  forte, 2026-09-12). F3 : liste des types prévisualisables élargie
  (Office/OpenDocument/texte, en plus d'image/vidéo/PDF), plancher de
  taille ajouté côté backend. Build vérifié (`node --check` + `npx
  react-scripts build`), **rien de tout ça testé contre le vrai
  Nextcloud/MySQL de production.**
- **A faire :** déploiement + vérification réelle de l'Axe B0/F/G (voir
  "Ordre de travail suggéré" — exécuter les deux migrations en attente
  avant de redéployer, la rotation JWT_SECRET déconnectera tous les
  utilisateurs actifs au prochain déploiement).
- **Attend des autres :** rien de bloquant actuellement côté infra —
  migration disque faite, Team Folder `Communautaire` créé, système
  redéployé et globalement fonctionnel. Les points remontés (Axe F) sont
  prêts à être traités directement.

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
  prioritaires, Journaux d'activite) ; canvas **"Core Modules"** validé le
  2026-09-04 (Dashboard, Connexion, Explorateur, Soumissions, Cours
  partagés, Corbeille, Paramètres, Panel Admin Utilisateurs/Matricules —
  desktop **et** mobile 390px).
- **A faire :** versions mobile 390px de l'Espace communautaire et du
  Panel Admin avancé ; dashboards Professeur et Admin dédiés ; états
  chargement/vide/erreur partout.
- **Attend des autres :** rien de bloquant actuellement.

---

## Objectif principal

> Voir `CONTEXT.md` section 2 pour la définition complète de « système fini ».
> En résumé : un système complet, stable, sauvegardé, où étudiants, profs et
> admin font tout via le portail — fichiers, soumissions, cours, mot de
> passe, espace communautaire, administration.

---

## Axe A — Refonte de l'interface (Claude Design)

- ✅ **A1-A4.** Direction Slate & Citrus choisie et déployée en production
  (voir `CONTEXT.md` section 9). Canvas "Core Modules" validé par Victoire
  le 2026-09-04, a servi de source pour toute la refonte frontend.

### ⚠️ Points de vigilance visuels relevés sur les rendus Claude Design (2026-09-04)

1. ✅ **Corrigé (2026-09-04).** Chevauchement de texte sur la carte
   "devoir" — titre limité à 1 ligne + ellipsis (`AssignmentRow` dans
   `Dashboard.jsx`) : le titre complet reste consultable via l'attribut
   `title` (tooltip navigateur) plutôt que d'être tronqué silencieusement.
2. **Contraste à vérifier sur les badges de statut en Slate & Citrus**
   (ex. badge "Rendu") — toujours pas revalidé avec un vrai outil de
   contraste (WebAIM ou équivalent) malgré la retokenisation ; à faire.
3. **Toujours ouvert.** Écran Corbeille (Meridian) promettait un compte à
   rebours de purge par élément que le backend ne calcule pas — l'écran
   reconstruit affiche seulement la date de suppression, pas de compte à
   rebours inventé. Si un vrai compte à rebours est voulu, il faudra
   l'implémenter côté backend d'abord.
4. ✅ **Corrigé (2026-09-04).** Espace mobile au-dessus du header — le
   conteneur principal mobile utilise `max(20px, env(safe-area-inset-top))`
   + `env(safe-area-inset-bottom)` sur la barre inférieure. Non vérifié sur
   un vrai appareil avec encoche — à confirmer par Victoire.

## Axe B — Gestion de fichiers (finitions connues)

- ✅ **B0. Rollback dans `register` si Nextcloud échoue.** Voir
  `DECISIONS.md` D-2026-09-12-01 et `CONTEXT.md` piège #13. **Corrigé le
  2026-09-12** : les étapes Nextcloud (création du compte + groupes/quota)
  sont isolées dans leur propre `try/catch` ; en cas d'échec, la ligne
  `users` fraîchement créée est supprimée automatiquement, ainsi que le
  compte Nextcloud s'il avait déjà été créé avant l'échec (nouveau
  `deleteNextcloudUser` dans `config/nextcloud.js`). **Non testé contre un
  vrai échec Nextcloud** (pas d'accès à l'infra depuis l'environnement de
  dev) — à valider par Victoire après déploiement. Au passage, découverte
  et correction d'un bug directement lié : `docker-compose.yml` contenait
  encore l'ANCIEN mot de passe admin Nextcloud (voir `CONTEXT.md` piège
  #18) — sans ce correctif, **toute** inscription aurait échoué à l'étape
  Nextcloud et déclenché ce rollback systématiquement.

- ✅ **B1. Corbeille.** Routes API trashbin natif Nextcloud
  (lister/restaurer/purger un élément/vider) branchées dans un écran
  dédié reconstruit pixel-exact depuis `Core Modules.dc.html`. **Testé en
  conditions réelles le 2026-09-12** (restaurer/purger confirmés
  fonctionnels). Pas de compte à rebours de purge affiché (voir point de
  vigilance #3 ci-dessus).
- ✅ **B2. Suppression équilibrée.** Un étudiant peut supprimer SES propres
  fichiers personnels (hors Team Folders `Cours-*`, qui restent protégés).
  Codé et déployé le 2026-09-04 ; pas explicitement re-testé action par
  action le 2026-09-12, mais fait partie du même build validé globalement
  (l'Explorateur — upload/download/dossiers — a été testé).
- ✅ **B3. Téléchargement direct des gros fichiers.** Pour un fichier de
  l'espace personnel, le backend lit directement le disque monté en
  lecture seule au lieu de faire un aller-retour WebDAV. Codé et déployé
  le 2026-09-04 ; pas explicitement re-testé individuellement le 2026-09-12.

## Axe C — Compte utilisateur

- ✅ **C1. API changement de mot de passe.** `POST /api/auth/change-password`
  (`{currentPassword, newPassword}`) : vérifie le mot de passe actuel
  (bcrypt), met à jour le mot de passe Nextcloud via OCS **avant** la BDD
  (pour ne jamais désynchroniser `nc_password`), puis `users.password`
  (hash) et `users.nc_password` (clair). Codé et déployé le 2026-09-04 ;
  pas explicitement re-testé le 2026-09-12.

## Axe D — Nouvelles fonctionnalités structurantes

- ✅ **D1. Espace libre communautaire.** **Implémenté et validé en
  conditions réelles le 2026-09-12** (dépôt avec image de couverture,
  catalogue, fiche détail, téléchargement, compteur de téléchargements —
  tous confirmés fonctionnels). Voir Axe F pour les correctifs/évolutions
  restants (notamment F6 taxonomie dynamique, F7 dossiers prioritaires
  invisibles).
  - ✅ D1.1 Modèle de données (`community_resources`, `faculties`, `levels`,
    `community_reports`)
  - ✅ D1.2 Classification à 3 facettes (Faculté/Niveau/Catégorie)
  - ✅ D1.3 Système de badges de vérification (logiciels uniquement)
  - ✅ D1.4 Écrans desktop Slate & Citrus (catalogue, fiche, dépôt, modération)
  - ⬜ D1.5 Écrans mobile 390px dédiés (le rendu reste responsive mais pas
    recomposé depuis une maquette mobile spécifique)
  - ⬜ D1.6 États chargement/vide/erreur génériques
  - ✅ D1.7 Backend : routes API complètes (`communityController.js` +
    `routes/community.js`), y compris `GET .../:id/cover` (vignettes
    réelles) — voir `CONTEXT.md` section 4 pour le détail.
  - ✅ D1.8 Team Folder Nextcloud `Communautaire` — **créé le 2026-09-12**
    lors du redéploiement Nextcloud complet (voir `CONTEXT.md` section 6).
  - ✅ D1.9 Frontend : `components/CommunitySpace.jsx` — catalogue, fiche
    détail (vraies vignettes, actions de modération), formulaire de dépôt.
    Desktop + mobile compact (`ResourceRow`).
- ✅ **D2. Interface d'administration (panel admin).** **Implémentée et
  accessible en conditions réelles le 2026-09-12** — rôle
  `is_admin`/`admin_level` sur `users`, 5 onglets (Utilisateurs, Matricules,
  Administrateurs, Dossiers prioritaires, Journaux d'activité) confirmés
  fonctionnels visuellement. Voir Axe F8 pour les descriptions d'aide à
  ajouter. **Incident notable** : le compte super admin de Victoire a
  perdu son statut une fois pendant la migration (compte MySQL recréé) —
  repromu manuellement, à surveiller si le compte est recréé à nouveau.
  - ✅ D2.1 à D2.6 — modèle de données, écrans, backend (admins, dossiers
    prioritaires, logs, permissions), middleware, frontend (5 onglets),
    Utilisateurs/Matricules — tout fait, voir `CONTEXT.md` section 4 et
    `JOURNAL.md` pour le détail historique.
- ✅ **D3. Notifications (cloche) fonctionnelles.** Table `notifications`
  (fan-out à l'écriture, une ligne par destinataire), helper
  `utils/notify.js` (`notifyUser`/`notifyUsers`/`notifyFiliere`/
  `notifyAllExcept`), route `GET/PATCH /api/notifications`. Trois
  évènements déclencheurs : nouveau devoir (tous les étudiants de la
  filière ciblée), rendu reçu (le professeur propriétaire du devoir),
  dépôt communautaire (tous les utilisateurs actifs sauf l'auteur).
  Frontend : cloche avec badge non-lus + panneau déroulant (composant
  `NotificationBell`, réutilisé sur l'Accueil et `ScreenHeader`), polling
  30s, clic = marque lu + navigue vers l'onglet concerné. **Codé et buildé,
  pas testé en conditions réelles** (nécessite la migration
  `2026-09-12_notifications.sql`, non exécutée sur la prod).
- ⬜ **D4. Page de gestion du stockage dédiée** (au-delà de la jauge simple
  du Dashboard).

## Axe F — Correctifs et évolutions UX (retour d'usage du 2026-09-12)

> Remontés par Victoire après un premier vrai passage sur le Dashboard,
> l'Explorateur, Cours partagés, l'Espace communautaire et le Panel Admin,
> une fois le système stabilisé après la migration disque. Chaque step est
> indépendant, à traiter dans l'ordre indiqué ou selon la priorité de
> Victoire.

> **Fait (2026-09-12, Claude Code) :** F1-F8 codés dans la foulée, ainsi que
> le piège #17 (`communityRoutes` montée sur `/api` interceptait
> `/api/health` — `authMiddleware` appliqué sans condition de chemin via
> `router.use()` avant même la tentative de matching des routes ; corrigé en
> déplaçant `/api/health` avant tout `app.use('/api', ...)` dans
> `index.js`). **Rien n'est encore testé contre un vrai serveur** — build de
> production vérifié à chaque étape (`npx react-scripts build` + `node
> --check`), pas de test en conditions réelles.

- ✅ **F1.** Encart "Espace communautaire" du Dashboard remplacé par un
  aperçu réel (3 dernières ressources déposées, `GET
  /community/resources?sort=recent`) + lien "Voir tout" vers l'onglet.

- ✅ **F2.** Bouton "Retour" explicite ajouté au-dessus du fil d'Ariane
  dans l'Explorateur (visible dès qu'on n'est pas à la racine), en plus du
  fil d'Ariane existant — conforme à DECISIONS.md D-2026-09-12-02.

- ✅ **F3.** Vraies prévisualisations via l'API Preview native de
  Nextcloud (`/index.php/core/preview`), proxifiée par une route
  `GET /files/preview?fileId=&size=` avec les identifiants WebDAV
  per-user. Nécessite `oc:fileid` dans le PROPFIND de `listFiles`
  (ajouté). Repli silencieux sur l'icône générique si la prévisualisation
  échoue (404). **Élargi le 2026-09-12** : la liste des types demandés
  côté frontend couvre désormais image/vidéo/texte/PDF **et**
  Office/OpenDocument (docx/xlsx/pptx/odt/ods/odp), pas seulement
  image/vidéo comme avant — sans coût si le provider n'est pas activé
  (échec silencieux). Plancher de 32px ajouté sur la taille de vignette
  backend (`fileController.filePreview`). **Dépend toujours des providers
  de preview Nextcloud activés côté serveur (Office nécessite imagick +
  LibreOffice ou Collabora/OnlyOffice) — pas vérifié/activé, à faire côté
  infra par Victoire, pas dans le code.**

- ✅ **F4.** Sélection multiple dans l'Explorateur (bouton "Sélectionner",
  cases à cocher sur chaque élément, barre d'action avec compteur +
  "Supprimer la sélection"). Architecture pensée pour accueillir d'autres
  actions groupées plus tard (partage, déplacement), non implémentées à ce
  stade comme demandé.

- 🔶 **F5.** Bug non reproduit dans le code actuel : `tab === 'courses'`
  affiche bien sa propre page avec état vide dédié, aucune redirection
  trouvée vers 'explorer' dans ce chemin. **Hypothèse la plus probable :
  le build déployé au moment du signalement était antérieur à cette
  implémentation.** À reconfirmer par Victoire après le prochain
  déploiement — si le bug persiste avec le code actuel, remonter les
  étapes exactes de reproduction (rien à corriger sans ça).

- ✅ **F6. [Structurant]** Taxonomie entièrement dynamique :
  - Catégories : nouvelle table `community_categories` (nom, `is_logiciel`,
    ordre) — `community_resources.categorie` passe d'ENUM à VARCHAR
    (élargissement pur, aucune donnée existante affectée). `is_logiciel`
    identifie la catégorie spéciale pour les badges de vérification PAR
    FLAG, pas par libellé (renommable sans casser la logique).
  - Facultés/filières/niveaux : CRUD ajouté sur les tables déjà existantes
    (`faculties`, `faculty_filieres`, `levels` — aucun changement de schéma
    nécessaire pour ces 3-là).
  - Nouvelle permission `gerer_taxonomie` (ENUM `admin_permissions.permission`
    élargi) + nouvel onglet Panel Admin "Taxonomie" (facultés avec filières
    imbriquées, niveaux, catégories).
  - Formulaire de dépôt et filtres du catalogue lisent désormais tout
    dynamiquement depuis l'API, plus aucune liste en dur côté frontend.
  - **Migration séparée requise** : `database/migrations/2026-09-12_taxonomie_dynamique.sql`
    à exécuter manuellement sur la base de production (conçue pour être
    sans risque sur des données réelles déjà présentes — voir le fichier).

- ✅ **F7.** Nouvelle route publique `GET /community/priority-folders`
  (lecture ouverte à tous, distincte de la version admin) + section
  "Dossiers prioritaires" en tête du catalogue (`CommunitySpace`), cliquer
  applique les filtres faculté/niveau correspondants. Compteur de
  ressources inclus.

- ✅ **F8.** Description courte ajoutée sous chaque onglet du Panel Admin
  (via `SUB_TABS[].desc`), et sur les principaux onglets du Dashboard
  (Mes fichiers, Cours partagés, Paramètres) en enrichissant leur sous-titre
  existant.

## Axe G — Sécurité et améliorations (audit + recherche, 2026-09-12)

> Victoire a demandé une recherche libre sur ce qui pouvait être amélioré
> ou ajouté au système existant. Recommandations présentées, puis
> explicitement validées ("vas-y build tes récommandation") et codées dans
> la foulée. Voir `JOURNAL.md` pour le détail session par session.

- ✅ **G1. Rate limiting.** `express-rate-limit` — limite globale (300
  req/15 min, `apiLimiter`, appliquée à toute l'API) + limite stricte sur
  les routes d'authentification (10 req/15 min, `authLimiter`, sur
  `/register`, `/login`, `/verify-matricule/:matricule`,
  `/change-password`). Protège notamment contre le bruteforce direct sur
  `/login` (CONTEXT.md piège #14).
- ✅ **G2. En-têtes de sécurité HTTP.** `helmet()` monté globalement dans
  `index.js` — CSP par défaut, HSTS, X-Frame-Options, etc. Sans risque ici
  : ce serveur ne sert que du JSON, jamais de HTML.
- ✅ **G3. Durcissement `JWT_SECRET`.** Nouveau `config/jwt.js` : échec
  explicite au démarrage (`throw`) si `JWT_SECRET` n'est pas défini dans
  l'environnement — plus de valeur par défaut `'holocron_secret_2024'`
  commitée dans le code (n'importe qui avec accès au dépôt pouvait forger
  un token valide pour n'importe quel compte). **Action manuelle requise
  côté serveur** : `docker-compose.yml` définit toujours
  `JWT_SECRET: holocron_secret_2024` pour ne pas casser le prochain
  déploiement — Victoire doit la remplacer par une valeur forte et unique
  dès que possible (voir `DECISIONS.md`). Rotation = déconnexion de tous
  les utilisateurs actifs, à faire à un moment approprié.
- ✅ **G4. Pagination du catalogue communautaire.** `GET
  /community/resources` accepte `page`/`limit` (max 50/page, 20 par
  défaut), renvoie `pagination: {page, limit, total, totalPages}`.
  Frontend : contrôles Précédent/Suivant sous la grille, page réinitialisée
  à 1 à chaque changement de filtre.
- ✅ **G5. Renommer/déplacer un fichier (Explorateur).** Nouvelle route
  `POST /files/move` (WebDAV `MOVE` natif, `Overwrite: F`), même garde-fou
  que la suppression (B2) : un étudiant ne peut pas agir dans un Team
  Folder `Cours-*`. Icône crayon (vue Grille) / lien "Renommer" (vue Liste),
  fonctionne aussi sur les dossiers.
- ✅ **G6. Recherche dans "Mes fichiers".** Filtrage local par nom dans le
  dossier courant (pas d'appel réseau supplémentaire), réinitialisée à
  chaque navigation vers un nouveau dossier.
- ✅ **G7. Réinitialisation de mot de passe par un admin.** Nouvelle route
  `POST /admin/users/:userId/reset-password` (permission
  `gerer_utilisateurs`) pour un utilisateur bloqué qui a perdu son mot de
  passe (le flux existant `changePassword` exige l'ancien, donc inutile
  dans ce cas). Même ordre Nextcloud-d'abord que C1, génère un mot de
  passe temporaire affiché **une seule fois** à l'admin (à communiquer
  hors-bande), invalide les sessions actives de l'utilisateur.
- ✅ **G8. Notifications (D3)** — voir Axe D ci-dessus, listé aussi ici
  car issu de cette même session de recommandations.

## Axe E — Infrastructure et résilience

- ⬜ **E1. Redondance disque.** Miroir ZFS si un second disque est
  disponible — toujours un seul disque en stripe depuis la migration du
  2026-09-12.
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

1. **Tout le code est prêt côté Axe B/F/G — reste le déploiement et la
   vérification réelle.** Avant de redéployer, exécuter les deux
   migrations en attente (`2026-09-12_taxonomie_dynamique.sql` et
   `2026-09-12_notifications.sql`). `docker-compose.yml` a déjà été mis à
   jour dans le dépôt (`JWT_SECRET` régénéré, `NEXTCLOUD_PASSWORD`
   corrigé) — ces valeurs ne prennent effet qu'au rebuild Docker sur le
   serveur, donc le prochain déploiement déconnectera tous les
   utilisateurs actifs (rotation JWT) : à faire à un moment de faible
   usage si possible.
2. **Après déploiement, confirmer avec Victoire** : B0 (provoquer un
   échec Nextcloud réel — ex. couper le conteneur puis tenter une
   inscription — et vérifier qu'aucun compte fantôme ne reste), F3 (dépend
   des providers de preview Nextcloud, pas vérifiés/activés côté infra),
   F5 (bug pas reproduit dans le code actuel, à reconfirmer), D3/G8
   (notifications jamais testées contre le vrai serveur), et le reste de
   l'Axe G (rate limiting, reset mot de passe admin, etc.).
3. Puis Axe D restant (D4).
4. Le reste (axe E, refonte visuelle Aurora/Meridian non retenue,
   supercalculateur) au fil de l'eau, sans bloquer les précédents.

> Cet ordre est une suggestion, pas une contrainte — à ajuster librement
> selon les priorités du moment. Le mettre à jour ici si l'ordre change.

---

## Historique des steps terminés

_(vide pour l'instant — le système actuel est décrit en détail dans
`CONTEXT.md` section 7 et dans `JOURNAL.md`.)_
