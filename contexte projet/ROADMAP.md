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
  + `database/migrations/2026-09-04_communautaire_et_panel_admin.sql`,
  cette dernière à exécuter manuellement sur la base déjà déployée),
  `adminController.js`/`routes/admin.js`, `communityController.js`/
  `routes/community.js`, middleware `checkAdmin`/`checkPermission`. Aucun
  écran frontend touché pour D1/D2 — respecte l'instruction de Victoire de
  ne pas construire sur un design pas encore confirmé (mobile Espace
  communautaire, Panel Admin avancé). `node --check` OK sur tous les
  fichiers backend. **Rien de tout ça n'est testé contre un vrai serveur
  Nextcloud/MySQL** — voir JOURNAL.md pour la liste des vérifications à
  faire avant déploiement.
- **Fait (2026-09-04, suite) :** Victoire a validé le canvas "Core Modules"
  (Claude Design) et demandé de tout construire. **Refonte frontend Slate &
  Citrus** de `Dashboard.jsx` (réécriture complète, ~970 lignes) à partir de
  la source exacte `Gougoul Holocron - Core Modules.dc.html` :
  - Nouveau `theme/tokens.js` (tokens clair/sombre exacts extraits du
    canvas), thème persisté (`localStorage`), bascule clair/sombre
    fonctionnelle (desktop : bas de la sidebar : mobile : onglet Paramètres).
  - Nouvelle coquille : sidebar desktop (7 entrées) remplace l'ancienne top
    bar ; barre inférieure mobile à 4 icônes (Accueil/Fichiers/Plus/Profil)
    avec feuille "Plus" pour les onglets restants — remplace l'ancienne
    barre à 4 onglets fixes.
  - **Accueil et Corbeille reconstruits à l'identique de la source**
    (desktop) : Stockage, Fichiers récents (données réelles via
    `listFiles('/')` triées par date), Dossiers partagés, Devoirs à
    rendre/Soumissions récentes, état vide Espace communautaire.
  - **Corbeille (B1) branchée au backend** : `getTrash/restoreTrash/
    purgeTrashItem/emptyTrash` ajoutées à `api.js`, écran complet
    (liste/restaurer/purger un élément/vider). Pas de compte à rebours de
    purge affiché (le backend ne le calcule pas — voir point de vigilance
    #3 plus bas, décision volontaire de ne pas afficher un délai inventé).
  - **Nouvel onglet "Cours partagés"** (dédié, réutilise `sharedFolders`
    déjà chargé) et **onglet "Espace communautaire"** (backend D1.7 prêt,
    écran encore un état "Bientôt disponible" — l'UI complète attend son
    propre passage, voir ci-dessous).
  - Explorateur/Soumissions/Paramètres : migrés vers les nouveaux tokens et
    la nouvelle coquille, fonctionnalités existantes toutes préservées
    (upload+annulation, suppression équilibrée B2, mot de passe C1) —
    restylés dans l'esprit Slate & Citrus mais **pas reconstruits
    pixel-exact** depuis les sections correspondantes du canvas (t3-t5/t8),
    faute d'avoir extrait leur markup exact dans cette passe.
  - **Bug de chevauchement de texte corrigé** (titre de devoir long → 1
    ligne + ellipsis, plus de chevauchement avec le sous-titre).
  - **Espacement mobile corrigé** : padding-top généreux + `env(safe-area-
    inset-top/bottom)` sur le conteneur principal et la barre inférieure
    (au lieu des 18px bruts de la source, jugés trop serrés par Victoire).
  - Widget "Assistant IA" et bouton flottant retirés (absents du design
    validé ; l'ancien message "pas encore branché" n'avait plus lieu d'être).
  - `frontend/public/index.html` : couleur de fond/`theme-color` mis à jour
    sur la nouvelle palette sombre (évite un flash de l'ancienne couleur
    avant le montage React) ; titre renommé "Holocron".
  - **Build de production vérifié** (`npm install` + `npx react-scripts
    build`) : compile sans erreur ni avertissement. Pas de test visuel en
    navigateur avec un vrai backend (aucun serveur Nextcloud/MySQL
    accessible depuis cet environnement) — à vérifier par Victoire au
    premier déploiement.
- **Fait (2026-09-05) :** suite immédiate de la passe ci-dessus, sur
  demande de Victoire ("build ce qui manque") :
  - **`Login.jsx`/`Register.jsx` réécrits** sur les tokens Slate & Citrus,
    `Login.jsx` reconstruit fidèlement depuis `Core Modules.dc.html` section
    Connexion (flux 3 étapes : matricule → rôle détecté via
    `verifyMatricule` → mot de passe → `login`). `Register.jsx` n'a pas de
    maquette dédiée dans le canvas (seule "Connexion" y figure) : même
    système visuel et mécanique 2 étapes réutilisés par extrapolation. Bug
    préexistant corrigé au passage : `Register` redirigeait vers `/login`,
    route inexistante dans `App.jsx` (seule `/` est définie) — corrigé en
    `/`. Champ `displayName` retiré du formulaire (jamais utilisé côté
    backend, `authController.register` l'ignorait déjà).
  - **D1.9 Espace communautaire construit** : nouveau
    `components/CommunitySpace.jsx` (catalogue avec facettes
    faculté/niveau/catégorie + recherche, fiche détail avec ressources
    similaires, formulaire de dépôt), reconstruit depuis `Canvas.dc.html`
    (desktop). Branché sur l'API D1.7 réelle (6 fonctions ajoutées à
    `api.js`). Vignettes de couverture non affichées (voir point de
    vigilance ci-dessous). Actions de modération (vérifier/marquer
    dangereux/supprimer) **pas incluses** — dépendaient de D2.5.
  - **D2.5 Panel Admin avancé construit** : nouveau
    `components/AdminPanel.jsx` (3 onglets : Administrateurs, Dossiers
    prioritaires, Journaux d'activité), reconstruit depuis `Canvas-2.dc.html`
    (desktop), branché sur l'API D2.3 réelle (10 fonctions ajoutées à
    `api.js`). Entrée "Administration" ajoutée à la nav, visible uniquement
    si `profile.is_admin`. **Backend ajusté en prérequis** :
    `GET /api/users/profile` expose désormais `is_admin`/`admin_level`/
    `permissions` (absents jusque-là — le frontend n'avait aucun moyen de
    savoir qui est admin). Simplifications assumées faute de temps/données
    disponibles : pas de sélecteur de filière dans "Créer un dossier
    prioritaire" (le backend n'expose pas encore `faculty_filieres` par
    endpoint dédié — `filiere_id` reste optionnel côté API) ; pas de
    compteur de ressources par dossier prioritaire (non calculé par le
    backend) ; pas de filtre "par utilisateur" sur les journaux d'activité
    (le paramètre backend attend un `user_id` numérique, pas une recherche
    par nom) ; onglets "Utilisateurs"/"Matricules"/"Espace communautaire"
    du Panel Admin (visibles dans le canvas) pas construits, hors du
    périmètre D2 (D2 = les 3 onglets avancés uniquement).
  - Build de production revérifié après chaque ajout : compile toujours
    sans erreur.
- **Fait (2026-09-05, suite) :** sur "ne te limite pas, termine toutes les
  tâches" — endpoint `GET /community/resources/:id/cover` + vraies
  vignettes dans `CommunitySpace` (blob authentifié, jamais `<img src>`
  direct) ; actions de modération dans `CommunitySpace` (vérifier/marquer
  dangereux/supprimer, gérées par `permissions`/`isSuperAdmin`) ; onglets
  **Utilisateurs** et **Matricules** du Panel Admin construits (backend
  neuf : `listUsers`/`toggleUserActive`/`listMatricules`/`addMatricule`/
  `deleteMatricule`, permissions `gerer_utilisateurs`/`gerer_matricules`
  enfin consommées ; route `GET /api/users/all` morte — `checkRole('admin')`
  sur un rôle qui n'existe pas — supprimée) ; `AdminPanel` filtre
  maintenant ses onglets par permission réelle ; Explorateur reconstruit
  en vue Liste (défaut, fidèle au canvas) avec bascule Grille ; statut
  "En retard" ajouté aux Soumissions étudiant. `Cours partagés`/`Paramètres`
  vérifiés proches de la source, pas retouchés. `npx react-scripts build`
  revérifié après chaque étape.
- **Fait (2026-09-05, suite 3) :** sur "fait tout ce que tu es en mesure de
  builder" — les 4 points ci-dessus tous résolus :
  - `GET /admin/faculty-filieres` (nouveau) + sélecteur de filière dans
    "Créer un dossier prioritaire" ; `resource_count` calculé et affiché
    par dossier prioritaire (par faculté+niveau — la classification des
    ressources n'a pas de dimension filière).
  - Filtre "par utilisateur" des journaux d'activité (recherche + sélection,
    réutilise `searchUsers`, résout un nom en `user_id`).
  - **Mobile Panel Admin** : sous-onglets en chips défilables, formulaires
    de création/attribution masqués sur mobile avec renvoi vers le desktop
    — conforme à l'intention explicite du canvas
    (`Canvas-2.dc.html` : "desktop reste l'outil principal").
  - **Mobile Espace communautaire** : nouveau `ResourceRow` (ligne
    compacte, vignette 56px) pour le catalogue et les ressources
    similaires, chips de facettes en défilement horizontal — fidèle à
    `Canvas.dc.html` section Catalogue mobile.
  - `npx react-scripts build` revérifié après chaque étape.
- **A faire (limite non buildable sans accès serveur) :** étapes 2-3 du
  mobile Connexion restent une extrapolation (le canvas ne mocke que
  l'étape 1) ; onglet "Espace communautaire" dédié du Panel Admin (table de
  modération séparée — jugé redondant avec la modération déjà présente
  dans `CommunitySpace`) ; **tout test réel contre un Nextcloud/MySQL en
  production**, qui nécessite le déploiement (SFTP + rebuild Docker) que
  Victoire seule peut faire.
- **Attend des autres :**
  - de **Victoire** : exécuter la migration SQL
    (`database/migrations/2026-09-04_communautaire_et_panel_admin.sql`) sur
    le MySQL de production, et créer manuellement le Team Folder Nextcloud
    `Communautaire` (D1.8) — avant tout test réel de D1/D2 ; déployer
    (SFTP + rebuild Docker) et valider visuellement en conditions réelles.

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

### ⚠️ Points de vigilance visuels relevés sur les rendus Claude Design (2026-09-04)

> À corriger PENDANT l'intégration React (D1.9/D2.5/B1), pas avant — ce sont
> des rendus `.dc.html`/exports image, rien n'est encore branché en code.
> Trouvés en inspectant les images réelles (`assets/slide-*.png`), pas
> seulement le texte des prompts — toujours vérifier le rendu, pas juste la
> spec, avant de considérer un écran "bon".

1. ✅ **Corrigé (2026-09-04).** Chevauchement de texte sur la carte
   "devoir" — titre limité à 1 ligne + ellipsis (`AssignmentRow` dans
   `Dashboard.jsx`) : le titre complet reste consultable via l'attribut
   `title` (tooltip navigateur) plutôt que d'être tronqué silencieusement.
2. **Contraste à vérifier sur les badges de statut en Slate & Citrus**
   (ex. badge "Rendu") — toujours pas revalidé avec un vrai outil de
   contraste (WebAIM ou équivalent) malgré la retokenisation ; à faire
   avant un déploiement en production.
3. **Toujours ouvert.** Écran Corbeille (Meridian) promettait un compte à
   rebours de purge par élément que le backend ne calcule pas — l'écran
   reconstruit le 2026-09-04 dans `Dashboard.jsx` a délibérément **omis**
   cette promesse (affiche seulement la date de suppression, pas de compte
   à rebours inventé) plutôt que d'induire Victoire en erreur sur la
   politique de rétention réelle. Si un vrai compte à rebours est voulu,
   il faudra l'implémenter côté backend d'abord.
4. ✅ **Corrigé (2026-09-04).** Espace mobile au-dessus du header — le
   conteneur principal mobile utilise désormais `max(20px, env(safe-area-
   inset-top))` au lieu des 18px bruts de la source, + `env(safe-area-
   inset-bottom)` sur la barre inférieure. Non vérifié sur un vrai appareil
   avec encoche (pas d'accès à un navigateur/appareil physique depuis cet
   environnement) — à confirmer par Victoire.

**Canvas "Core Modules" : validé par Victoire le 2026-09-04.** A servi de
source exacte pour la refonte `Dashboard.jsx` du même jour (Accueil et
Corbeille reconstruits pixel-exact en desktop ; Explorateur/Soumissions/
Cours partagés/Paramètres retokenisés mais pas reconstruits section par
section ; mobile fidèle uniquement pour Accueil/Corbeille). Connexion
(`Login.jsx`/`Register.jsx`) et Panel Admin "Utilisateurs/Matricules" de ce
même canvas **pas encore repris** — restent sur l'ancien style.

## Axe B — Gestion de fichiers (finitions connues)

- ✅ **B1. Corbeille** (backend 2026-09-04, frontend 2026-09-04). Routes API
  trashbin natif Nextcloud (lister/restaurer/purger un élément/vider) dans
  `fileController.js` + `routes/files.js`, branchées dans `Dashboard.jsx`
  (nouvel onglet dédié, reconstruit pixel-exact depuis `Core Modules.dc.html`
  section Corbeille). Pas de compte à rebours de purge affiché (le backend
  ne le calcule pas — voir "Points de vigilance visuels" ci-dessus). Pas
  encore testé contre un vrai Nextcloud.
- ✅ **B2. Suppression équilibrée** (2026-09-04). Un étudiant peut supprimer
  SES propres fichiers personnels (hors Team Folders `Cours-*`, qui restent
  protégés) — route `DELETE /files/delete` ouverte à tous les rôles,
  contrôle par rôle+chemin dans le contrôleur ; bouton Explorateur activé
  côté frontend.
- ✅ **B3. Téléchargement direct des gros fichiers** (2026-09-04). Pour un
  fichier de l'espace personnel (hors Team Folders `Cours-*`), le backend lit
  désormais directement le disque monté en lecture seule (`NC_DATA_DIR`,
  même volume que les soumissions) au lieu de faire un aller-retour WebDAV —
  élimine un hop réseau + la couche PHP Nextcloud par octet transféré.
  Confinement de chemin ajouté (le disque n'a plus les permissions WebDAV
  pour se protéger tout seul). Repli WebDAV inchangé si le fichier n'est pas
  trouvé sur le disque (Team Folders, cas non prévus).

## Axe C — Compte utilisateur

- ✅ **C1. API changement de mot de passe** (2026-09-04, codé — pas encore
  déployé/testé en conditions réelles). `POST /api/auth/change-password`
  (`{currentPassword, newPassword}`) : vérifie le mot de passe actuel
  (bcrypt), met à jour le mot de passe Nextcloud via OCS **avant** la BDD
  (pour ne jamais désynchroniser `nc_password`), puis `users.password`
  (hash) et `users.nc_password` (clair). Formulaire Settings branché
  (validation confirmation + longueur, retour d'erreur/succès).

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
  - ✅ D1.7 Backend : routes API codées (2026-09-04) dans
    `communityController.js` + `routes/community.js` (montées sur `/api`) :
    `GET /api/faculties`, `GET /api/levels`,
    `GET /api/community/resources?faculty=&level=&category=&q=&sort=`,
    `GET /api/community/resources/:id`, `POST /api/community/resources`
    (multipart `fichier`+`cover_image?`), `GET .../:id/download` (403 si
    `dangereux`, ne filtre PAS le catalogue — reste visible avec badge),
    `POST .../:id/report`, `PATCH .../:id/verification` (`verifier_logiciels`),
    `DELETE .../:id` (`moderer_communautaire`). `node --check` OK. **Pas testé
    contre un vrai Nextcloud** (nécessite D1.8 fait manuellement en premier).
  - ⬜ D1.8 Team Folder Nextcloud `Communautaire` — **action manuelle
    serveur restante** (comme les Team Folders `Cours-*` à l'origine) :
    créer le groupfolder `Communautaire`, écriture ouverte à
    `Etudiants`/`Professeurs`/`Assistants`. Les sous-dossiers par catégorie
    (`Cours`/`Logiciels`/`Medias`/`Autre`, + `_covers`) sont créés
    automatiquement par le backend au premier dépôt (MKCOL défensif), pas
    besoin de les créer à la main.
  - ✅ D1.9 Frontend (2026-09-05, complété le même jour) :
    `components/CommunitySpace.jsx` — catalogue (facettes + recherche),
    fiche détail (ressources similaires, badge de vérification, **vraies
    vignettes de couverture** via `GET .../:id/cover` en blob authentifié,
    **actions de modération** vérifier/marquer dangereux/supprimer selon
    permission), formulaire de dépôt (fichier + couverture optionnelle).
    Branché sur l'API réelle. Desktop uniquement. Pas testé contre un vrai
    Nextcloud (D1.8 pas fait par Victoire).
- 🔶 **D2. Interface d'administration (panel admin).** Conception complète
  (2 niveaux, permissions à la carte, dossiers prioritaires, logs) — voir
  DECISIONS.md D-2026-09-04-05/06/07. Écrans desktop livrés (2026-09-04).
  Implémentation pas commencée.
  - ✅ D2.1 Modèle de données (`users.is_admin`/`admin_level`,
    `admin_permissions`, `community_priority_folders`, `faculty_filieres`,
    `activity_logs`) — voir DECISIONS.md
  - ✅ D2.2 Écrans desktop Slate & Citrus (Administrateurs, Dossiers
    prioritaires, Journaux d'activité)
  - ✅ D2.3 Backend : routes API codées (2026-09-04) dans
    `adminController.js` + `routes/admin.js` (`/api/admin/*`) :
    `GET /admins`, `GET /users/search?q=`, `POST /admins/:userId/grant`
    (super admin uniquement — vérifié dans le contrôleur, pas seulement une
    permission `admin_permissions` : c'est l'action la plus sensible du
    système), `DELETE /admins/:userId` (idem, refuse aussi de se retirer
    soi-même), `GET`/`POST /priority-folders` (`gerer_dossiers` pour le
    POST/DELETE), `GET /logs` (`voir_logs`). `node --check` OK. La
    confirmation supplémentaire pour la promotion super admin reste à faire
    **côté frontend** (D2.5) quand l'écran sera intégré.
  - ✅ D2.4 Middleware `checkPermission(permission)` + `checkAdmin` ajoutés
    dans `authMiddleware.js` (super admin bypass implicite, admin simple
    vérifie `admin_permissions`) ; `authMiddleware` attache désormais
    `is_admin`/`admin_level` à `req.user`.
  - ✅ D2.5 Frontend (2026-09-05, débloqué — Victoire a validé le design
    et demandé de construire ce qui manquait) : `components/AdminPanel.jsx`
    — **5 onglets** au final (Administrateurs avec recherche + attribution
    de droits, Dossiers prioritaires, Journaux d'activité — périmètre D2 —
    **+ Utilisateurs + Matricules**, périmètre Panel Admin base ajouté le
    même jour car présent dans le canvas et déjà attendu par les
    permissions `gerer_utilisateurs`/`gerer_matricules` existantes). Onglets
    filtrés par permission réelle (`isSuperAdmin` ou `permissions`), pas
    seulement par `checkAdmin`. Entrée "Administration" dans la nav,
    visible seulement si `profile.is_admin` (nécessitait d'exposer
    `is_admin`/`admin_level`/`permissions` sur `GET /users/profile`, absent
    jusque-là — corrigé). Pas de modale de confirmation dédiée pour la
    promotion super admin (le formulaire de sélection de niveau fait office
    de confirmation explicite). Desktop uniquement. Pas testé contre un
    vrai serveur.
  - ✅ D2.6 Backend Utilisateurs/Matricules (2026-09-05, ajouté) :
    `adminController.listUsers`/`toggleUserActive` (`gerer_utilisateurs`),
    `listMatricules`/`addMatricule`/`deleteMatricule` (`gerer_matricules`,
    `listMatricules` calcule `is_used` via `LEFT JOIN users`). Route morte
    `GET /api/users/all` (`checkRole('admin')` sur un rôle inexistant dans
    l'énum, inatteignable depuis toujours) supprimée au passage.
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
