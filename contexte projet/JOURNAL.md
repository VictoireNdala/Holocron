# JOURNAL.md — Holocron

> Historique des sessions, en ordre chronologique (la plus récente en haut).
> Chaque entrée : date, ce qui a été fait, ce qui a changé, ce qu'il reste
> en suspens. Objectif : que n'importe qui (humain ou IA) comprenne en 2
> minutes ce qui s'est passé récemment, sans relire tout l'historique.

---

## 2026-09-12 (suite 4) — Axe G : audit sécurité/fiabilité + recommandations codées

**Contexte :** Victoire demande une recherche libre ("que peux-tu améliorer
ou ajouter au système déjà présent ?"). Audit du code existant + recherche
externe, recommandations présentées et classées (sécurité, fiabilité,
fonctionnalités manquantes), puis explicitement validées ("vas-y build tes
récommandation") — implémentation complète de la liste dans la foulée.
Nouvel **Axe G** créé dans `ROADMAP.md` pour ces points (distincts de
l'Axe F, qui vient du retour d'usage de Victoire).

**Ce qui a été fait :**
- **G1 Rate limiting** : `express-rate-limit` — `apiLimiter` global
  (300/15min sur toute l'API) + `authLimiter` strict (10/15min) sur
  `/register`, `/login`, `/verify-matricule/:matricule`,
  `/change-password`.
- **G2 Helmet** : `helmet()` monté globalement dans `index.js` — sans
  risque, ce serveur ne sert que du JSON.
- **G3 Durcissement JWT_SECRET** : nouveau `config/jwt.js`, échec explicite
  au démarrage si `JWT_SECRET` absent de l'environnement — supprime le
  fallback `'holocron_secret_2024'` commité en dur (n'importe qui avec le
  dépôt pouvait forger un token valide). `docker-compose.yml` inchangé
  volontairement (rotation = déconnexion de tous les utilisateurs, décision
  de timing qui revient à Victoire) — **action manuelle requise** avant que
  ce correctif soit réellement effectif en production.
- **G4 Pagination catalogue communautaire** : `GET /community/resources`
  accepte `page`/`limit` (max 50), renvoie `pagination`. Contrôles
  Précédent/Suivant côté `CommunitySpace.jsx`.
- **G5 Renommer/déplacer (Explorateur)** : nouvelle route `POST
  /files/move` (WebDAV `MOVE`), même garde-fou Team Folders `Cours-*` que
  B2. Icône crayon (Grille) / lien "Renommer" (Liste), fichiers et
  dossiers.
- **G6 Recherche "Mes fichiers"** : filtrage local par nom, pas d'appel
  réseau, réinitialisée à la navigation.
- **G7 Réinitialisation mot de passe par un admin** : `POST
  /admin/users/:userId/reset-password` (permission `gerer_utilisateurs`),
  même ordre Nextcloud-d'abord que C1, mot de passe temporaire affiché une
  seule fois, sessions actives invalidées.
- **G8 / D3 Notifications (cloche)** : nouvelle table `notifications`
  (fan-out à l'écriture), `utils/notify.js`, routes `GET/PATCH
  /api/notifications`. Trois évènements : nouveau devoir → étudiants de la
  filière ; rendu reçu → professeur propriétaire du devoir ; dépôt
  communautaire → tous les utilisateurs actifs sauf l'auteur. Frontend :
  composant `NotificationBell` (badge non-lus, panneau déroulant, polling
  30s), intégré sur l'Accueil et dans `ScreenHeader` (donc sur tous les
  écrans). **Migration séparée à exécuter manuellement** :
  `database/migrations/2026-09-12_notifications.sql`.
- Build de production revérifié après chaque étape (`npx react-scripts
  build`, compile sans erreur à chaque fois), `node --check` OK sur tout
  le backend modifié. Serveur backend démarré localement pour un
  smoke-test réel (pas juste une vérification de syntaxe) : confirmé que
  `/api/health` répond 200 avec les en-têtes `helmet`/rate-limit corrects,
  que `/api/notifications` répond 401 sans token (route bien montée et
  protégée), et que le process **refuse de démarrer** sans `JWT_SECRET`
  dans l'environnement (comportement fail-fast attendu de G3).

**Ce qui reste en suspens :**
- **B0 (rollback `register`) toujours pas corrigé** — reste la priorité
  absolue, non traitée depuis plusieurs sessions malgré Axe F et G.
- Rien de cette session n'a été testé contre le vrai Nextcloud/MySQL de
  production — seuls le build et un smoke-test local (sans DB réelle) ont
  été faits.
- Migration `2026-09-12_notifications.sql` pas encore exécutée en
  production (comme celle de F6, toujours en attente).
- `JWT_SECRET` dans `docker-compose.yml` de production toujours la valeur
  faible d'origine — à remplacer par Victoire par un secret fort (voir G3
  ci-dessus et `DECISIONS.md`).
- Le volume de notifications "dépôt communautaire" (broadcast à tous les
  utilisateurs actifs) n'a pas été testé à l'échelle réelle du campus — à
  surveiller si le nombre d'utilisateurs actifs devient important
  (inserts en fan-out, un par destinataire).

---

## 2026-09-12 (suite 3) — Axe F (F1-F8) codé + correctif piège #17

**Contexte :** Victoire demande confirmation que les 8 points remontés
après le premier usage réel (Axe F de `ROADMAP.md`) ont bien été codés,
puis de s'y mettre — rien ne l'avait encore été à ce stade.

**Ce qui a été fait :**
- **F1** : encart "Espace communautaire" du Dashboard remplacé par un vrai
  aperçu (3 dernières ressources) au lieu du texte "Bientôt disponible"
  figé.
- **F2** : bouton "Retour" explicite ajouté au-dessus du fil d'Ariane dans
  l'Explorateur (D-2026-09-12-02).
- **F3** : vraies prévisualisations (images/vidéos/PDF) via l'API Preview
  Nextcloud, proxifiée par une nouvelle route `GET /files/preview`
  (identifiants per-user, `oc:fileid` ajouté au PROPFIND). Repli sur
  l'icône générique si indisponible.
- **F4** : sélection multiple + suppression groupée dans l'Explorateur
  (mode "Sélectionner", cases à cocher, barre d'action).
- **F5** : bug non reproduit dans le code actuel — `tab === 'courses'`
  affiche déjà correctement sa propre page avec état vide. Hypothèse : le
  build déployé au moment du signalement était antérieur à cette
  implémentation (2026-09-04/05). À reconfirmer après le prochain
  déploiement plutôt que de "corriger" un code qui semble déjà correct.
- **F6 (le plus gros)** : taxonomie entièrement dynamique.
  `community_resources.categorie` passe d'ENUM à VARCHAR (élargissement
  sans risque sur les données déjà réelles) ; nouvelle table
  `community_categories` (nom, `is_logiciel`, ordre) ; nouvelle permission
  `gerer_taxonomie` ; nouvel onglet Panel Admin "Taxonomie" (CRUD facultés
  avec filières imbriquées, niveaux, catégories) ; formulaire de dépôt et
  filtres catalogue branchés dynamiquement. Voir DECISIONS.md
  D-2026-09-12-04 pour le choix VARCHAR + flag plutôt qu'une FK stricte.
  **Migration séparée à exécuter manuellement** :
  `database/migrations/2026-09-12_taxonomie_dynamique.sql`.
- **F7** : nouvelle route publique `GET /community/priority-folders` +
  section dédiée en tête du catalogue, avec compteur de ressources.
- **F8** : descriptions courtes ajoutées sous chaque onglet du Panel Admin
  et sur les principaux onglets du Dashboard.
- **Piège #17 corrigé** : `/api/health` déplacé avant tous les
  `app.use('/api/...')` dans `index.js` — `communityRoutes` appliquait
  `authMiddleware` sans condition de chemin (`router.use()`) avant même la
  tentative de matching, interceptant `/api/health`.
- Build de production revérifié après chaque étape (`npx react-scripts
  build`), `node --check` OK sur tout le backend modifié.

**Ce qui reste en suspens :**
- **B0 (rollback `register`) toujours pas corrigé** — reste la priorité
  absolue pour la prochaine session côté code.
- Rien de cette session n'a été testé contre un vrai Nextcloud/MySQL —
  seule la compilation a été vérifiée.
- F3 dépend des providers de preview Nextcloud (PDF/Office/vidéo) côté
  serveur, jamais vérifiés/activés — peut ne rien afficher pour ces types
  tant que ce n'est pas confirmé.
- F5 à reconfirmer par Victoire après déploiement du build à jour — pas de
  changement de code puisqu'aucun bug n'a été retrouvé dans la source
  actuelle.
- Migration `2026-09-12_taxonomie_dynamique.sql` pas encore exécutée en
  production.

---

## 2026-09-12 (suite) — Premier retour d'usage réel + repromotion admin

**Contexte :** après la migration disque de la veille/du matin, premier
usage réel et prolongé du système par Victoire (Dashboard, Explorateur,
Cours partagés, Espace communautaire, Panel Admin).

**Repromotion admin :** le compte `etu_20244936` avait perdu ses droits
`is_admin`/`admin_level` (le compte MySQL a été recréé plusieurs fois
pendant la migration de la veille, donc reparti avec les valeurs par
défaut). Repromue en `super` admin manuellement en base — Panel Admin de
nouveau accessible, 5 onglets confirmés fonctionnels visuellement.

**8 points remontés, structurés en Axe F de `ROADMAP.md` (F1 à F8) :**
- F1 : texte "bientôt disponible" figé sur le Dashboard (résidu déjà noté
  la veille, toujours pas corrigé).
- F2 : navigation Explorateur à améliorer — décision actée en
  `DECISIONS.md` D-2026-09-12-02 (fil d'Ariane + bouton retour, appuyé sur
  une recherche des bonnes pratiques 2026).
- F3 : vraies prévisualisations de fichiers dans l'Explorateur (images,
  vidéos, PDF...) au lieu d'icônes génériques — même technique que la
  recherche Preview Nextcloud faite le 2026-09-04 pour l'Espace
  communautaire, à réutiliser ici.
- F4 : sélection multiple + suppression groupée dans l'Explorateur
  (les autres actions groupées type partage sont explicitement reportées).
- F5 : bug — l'onglet "Cours partagés" redirige vers "Mes fichiers" au
  lieu de s'afficher (même vide).
- F6 : **le plus structurant** — la taxonomie de l'Espace communautaire
  (facultés/filières/niveaux/catégories) doit devenir entièrement
  dynamique et gérable en CRUD depuis le Panel Admin ; les valeurs
  utilisées jusqu'ici n'étaient qu'un échantillon, pas une liste figée.
  Décision actée en D-2026-09-12-03.
- F7 : bug — un dossier prioritaire créé dans le Panel Admin
  ("Sciences Informatiques > Genie Logiciel > L1") n'apparaît nulle part
  dans le catalogue de l'Espace communautaire ; le câblage catalogue ↔
  `community_priority_folders` est à vérifier/corriger.
- F8 : ajouter de courtes descriptions d'usage sur les onglets du Panel
  Admin (et par extension, ailleurs où c'est utile).

**Statut :** tout est dans `ROADMAP.md` Axe F, ordre de travail suggéré
mis à jour (B0 d'abord, puis F1/F5 rapides, puis le reste de F, F6 en
dernier dans l'axe vu sa taille). Rien encore implémenté à ce stade — à
donner à Claude Code.

---

## 2026-09-11/12 — Migration vers un nouveau disque + résolution de plusieurs incidents en cascade

**Contexte :** le disque précédent (emprunté à un ami dans l'urgence) a été
rendu/retiré. Migration complète vers un nouveau disque, en profitant du
fait que le code est désormais sur GitHub (plus de reconstruction manuelle
comme en juillet).

**Migration infrastructure (réussie) :**
- Ancien pool `Holocron_sith` exporté proprement (disque déjà absent).
- Nouveau pool `Holocron_sith` recréé via l'interface web (stripe, 1 disque
  ~465 Go — toujours pas de redondance).
- Code cloné directement depuis GitHub (`git clone` — la sauvegarde a
  fonctionné, contrairement à l'incident de juillet).
- Confirmation que Claude Code avait bien poussé l'Axe B/C/D (Corbeille,
  mot de passe, Espace communautaire, Panel Admin) avant cette session —
  tables MySQL correspondantes présentes après clone.
- Build backend/frontend refait (un premier build interrompu par une
  navigation accidentelle hors de l'onglet Shell — le Shell web TrueNAS tue
  le process en cours si on change d'onglet ; toujours rester sur l'onglet
  pendant un build long).
- Stack Nextcloud redéployée à neuf (nouvelle installation complète :
  admin, groupfolders, 6 groupes, 4 Team Folders dont le nouveau
  `Communautaire`, skeleton désactivé) — voir `CONTEXT.md` section 6.

**Incidents résolus en cascade (tous documentés dans `CONTEXT.md` pièges
connus #13 à #16) :**
1. Route `/api/health` renvoyait 401 — un routeur (`communityRoutes`) monté
   sur `/api` interceptait tout avant la définition de la route health,
   plus bas dans `index.js`. Fix : remonter `/api/health` avant tous les
   `app.use(...)`. **Signalé à corriger côté source par Claude Code** (le
   montage de `communityRoutes` sur `/api` reste trop large).
2. Nextcloud injoignable en HTTP ("No route to host") après un redémarrage
   Docker complet — désynchronisation des règles NAT iptables (IP interne
   du conteneur changée, NAT pointant vers l'ancienne IP). Fix : recréation
   complète de la stack (`down` puis `up`, pas un simple `restart`).
3. Cycle 401 → 429 en boucle sur les comptes utilisateurs : le mot de passe
   admin réel de cette installation Nextcloud (`gougoul123`) ne correspondait
   plus à celui documenté (`TheGougoulHolocron8@`) ni à celui du
   `docker-compose.yml` webapp — corrigé dans les deux. **`CONTEXT.md` mis
   à jour avec le mot de passe réel.**
4. **Découverte du bug de fond** : `register` n'a pas de rollback si la
   création Nextcloud échoue après l'écriture MySQL → plusieurs comptes
   fantômes créés pendant les diagnostics ci-dessus, causant une bonne
   partie du temps de debug (401/429 confus avec les incidents 1-3 plutôt
   que reconnus comme "le compte n'existe juste pas côté Nextcloud"). Voir
   `DECISIONS.md` D-2026-09-12-01 — **à corriger par Claude Code, priorité
   haute (Axe B0 de `ROADMAP.md`)**.

**Résultat final :** système entièrement fonctionnel, testé de bout en
bout — inscription, quota, explorateur (upload/download/dossiers),
Corbeille (restaurer/purger), Espace communautaire (dépôt avec image de
couverture, fiche détail, compteur de téléchargements). Snapshot ZFS pris
(`Holocron_sith@systeme-complet-2026-09-12`).

**Ce qui reste en suspens :**
- Le texte "Espace communautaire — Bientôt disponible" sur le Dashboard
  est un résidu figé côté frontend, à retirer (la fonctionnalité existe et
  marche, seul cet encart d'accueil ment).
- Le fix B0 (rollback register) n'est pas encore implémenté.
- Toujours aucune redondance disque (1 seul disque, stripe).

---

## 2026-09-05 (suite 2) — Filière/compteur dossiers prioritaires, filtre utilisateur des logs, mobile Espace communautaire/Panel Admin

**Contexte :** Victoire demande de construire "tout ce que tu es en mesure
de builder" — reprise des derniers points connus (limites assumées la fois
précédente), en excluant explicitement ce qui dépend du déploiement réel.

**Ce qui a été fait :**
- **Backend :** `GET /api/admin/faculty-filieres?faculty_id=` (nouveau,
  `adminController.listFacultyFilieres`) pour peupler le sélecteur de
  filière. `listPriorityFolders` calcule maintenant `resource_count` par
  sous-requête (`community_resources` filtrées par `faculty_id` exact et
  `level_id` si précisé — la classification des ressources n'a pas de
  dimension filière, voir DECISIONS.md D-2026-09-04-01, donc le compte
  l'ignore volontairement).
- **Dossiers prioritaires (`AdminPanel`) :** sélecteur de filière (dépendant
  de la faculté choisie) ajouté au formulaire de création ; compteur de
  ressources affiché sur chaque dossier de la liste.
- **Journaux d'activité (`AdminPanel`) :** filtre "par utilisateur"
  implémenté via recherche + sélection (réutilise `searchUsers`, résout un
  nom en `user_id` avant d'appeler `listActivityLogs`).
- **Mobile Panel Admin :** sous-onglets en défilement horizontal (chips),
  formulaires de création/attribution (Administrateurs, Dossiers
  prioritaires, Matricules) masqués sur mobile avec une note renvoyant vers
  le desktop — choix explicitement indiqué par le canvas source
  (`Canvas-2.dc.html` : "formulaires de création/attribution omis — desktop
  reste l'outil principal"), pas une simplification arbitraire.
- **Mobile Espace communautaire :** nouveau composant `ResourceRow` (ligne
  compacte avec vignette 56px), catalogue et ressources similaires basculent
  sur cette vue liste au lieu de la grille desktop ; chips de facettes
  (catégorie/faculté/niveau) en défilement horizontal — reproduit la
  structure de `Canvas.dc.html` section Catalogue mobile.
- Build de production revérifié après chaque étape : compile toujours sans
  erreur. `node --check` OK sur tout le backend.

**Ce qui reste en suspens (hors de portée sans déploiement, ou non
demandé) :**
- Connexion : étapes 2 et 3 du mobile restent une extrapolation du style de
  l'étape 1 (seule étape présente dans le canvas) — pas de source à
  reproduire plus fidèlement.
- Toujours aucun test contre un vrai Nextcloud/MySQL en production — seule
  la compilation a été vérifiée à chaque étape de toute la session.
- Onglet "Espace communautaire" du Panel Admin (table de modération dédiée
  dans le Panel Admin, distincte des actions déjà présentes dans
  `CommunitySpace`) toujours pas construit — recoupement jugé suffisant
  avec la modération déjà en place côté fiche détail.

---

## 2026-09-05 (suite) — Modération, couverture réelle, Panel Admin base (Utilisateurs/Matricules), fidélité Explorateur/Soumissions

**Contexte :** suite directe de la session précédente le même jour, Victoire
demande d'aller au bout ("ne te limite pas, termine toutes les tâches").

**Ce qui a été fait :**
- **Backend — image de couverture :** nouvelle route
  `GET /api/community/resources/:id/cover` (`communityController.
  getResourceCover`) — authentifiée comme le reste (jamais de client WebDAV
  admin), Content-Disposition inline. Le frontend la consomme en blob
  authentifié (`getCommunityResourceCover` + `<img>` sur URL objet), pas de
  `<img src>` direct qui n'enverrait pas le header d'autorisation.
  `CommunitySpace.jsx` affiche maintenant les vraies couvertures quand elles
  existent, repli générique sinon.
- **Actions de modération dans `CommunitySpace` :** "Marquer vérifié" /
  "Marquer dangereux" (catégorie Logiciel, permission `verifier_logiciels`
  ou super admin) et "Supprimer (modération)" (`moderer_communautaire` ou
  super admin), maintenant possibles car `profile.is_admin`/`admin_level`/
  `permissions` sont exposés depuis la veille.
- **Panel Admin base — Utilisateurs et Matricules construits**, pas prévus
  dans le périmètre D2 initial mais présents dans le canvas "Core Modules"
  (`Panel Admin - Utilisateurs`/`Panel Admin - Matricules`) et déjà
  attendus par les permissions `gerer_utilisateurs`/`gerer_matricules`
  définies depuis le début mais jamais consommées :
  - Backend : `adminController.listUsers`/`toggleUserActive` (nouveau,
    permission `gerer_utilisateurs`), `listMatricules`/`addMatricule`/
    `deleteMatricule` (nouveau, permission `gerer_matricules`,
    `listMatricules` fait un `LEFT JOIN users` pour savoir si un matricule
    de la liste blanche est déjà "Utilisé"). Route `GET /api/users/all`
    supprimée : elle était protégée par `checkRole('admin')`, un rôle qui
    n'existe pas dans l'énum (`etudiant`/`professeur`/`assistant`) — donc
    strictement inatteignable depuis toujours, code mort remplacé par les
    routes `/api/admin/users` et `/api/admin/matricules` correctement
    gérées par permission.
  - Frontend : nouveaux onglets `UsersTab`/`MatriculesTab` dans
    `AdminPanel.jsx`, visibles seulement si la permission correspondante
    est accordée (ou super admin). `AdminPanel` filtre maintenant ses
    onglets par permission plutôt que de tous les afficher.
- **Fidélité visuelle Explorateur :** bascule Liste/Grille ajoutée
  (`ExplorerRow` nouveau, vue Liste par défaut — reproduit la structure du
  canvas : icône/nom/taille/date en ligne), la vue Grille existante
  (`ExplorerCard`) reste disponible en bascule. Le panneau "Menu
  contextuel" du canvas (Renommer/Déplacer/Partager) n'a pas été repris :
  ce sont des actions non implémentées côté backend, les ajouter aurait
  affiché des boutons qui ne font rien.
- **Fidélité Soumissions étudiant :** statut "En retard" calculé
  côté client (échéance dépassée + pas encore rendu) avec badge rouge,
  en plus de "À rendre"/"Rendu" déjà là — correspond aux 3 états du canvas.
- Un bug de syntaxe introduit pendant l'édition (accolade de fermeture en
  double après le badge "En retard") a été détecté par le build de
  production (`npx react-scripts build`), pas par la seule vérification de
  parenthèses équilibrées — rappel que le build reste la vérification de
  référence pour du JSX, l'équilibrage de caractères seul ne suffit pas.
- Build de production revérifié après chaque étape : compile toujours sans
  erreur. `node --check` OK sur tout le backend.

**Ce qui reste en suspens (limites assumées, pas oubliées) :**
- Aucune version mobile dédiée pour Espace communautaire, Panel Admin (tous
  onglets) et Connexion au-delà de l'étape 1 — le rendu reste responsive
  (s'adapte à l'écran) mais ne reproduit pas les maquettes mobile
  spécifiques de ces écrans.
- Cours partagés et Paramètres restent tels que construits la veille
  (retokenisés, contenu déjà proche de la source d'après vérification
  rapide — pas de reconstruction supplémentaire jugée nécessaire).
- Toujours aucun test contre un vrai Nextcloud/MySQL en production.
- Filière absente du formulaire "Créer un dossier prioritaire" (toujours
  pas d'endpoint backend pour lister `faculty_filieres` séparément).

---

## 2026-09-05 — Connexion, Espace communautaire (D1.9) et Panel Admin avancé (D2.5) construits

**Contexte :** suite directe de la session du 2026-09-04 (refonte
`Dashboard.jsx`), Victoire demande de continuer à construire ce qui manque.

**Ce qui a été fait :**
- **Login/Register réécrits** sur les tokens Slate & Citrus. `Login.jsx`
  reconstruit fidèlement depuis la section "Connexion" du canvas
  `Core Modules.dc.html` : flux 3 étapes (matricule →
  `verifyMatricule` pour détecter le rôle → mot de passe → `login`).
  `Register.jsx` n'a pas de maquette dédiée dans le canvas ; reprend le
  même système visuel et la mécanique 2 étapes déjà en place (vérification
  matricule puis compte), par extrapolation assumée. Deux corrections au
  passage : `Register` redirigeait vers `/login`, une route qui n'existe
  pas dans `App.jsx` (seule `/` est définie pour la connexion) — bug
  préexistant, jamais remarqué ; le champ "Nom d'affichage" du formulaire
  d'inscription a été retiré, `authController.register` ne l'a jamais lu
  côté serveur (`nom`/`prenom` viennent de la table `matricules`).
- **D1.9 Espace communautaire :** nouveau `components/CommunitySpace.jsx`,
  reconstruit depuis `Canvas.dc.html` (desktop) — catalogue à facettes
  (faculté/niveau/catégorie combinables + recherche), fiche détail
  (badges, uploader, statut de vérification, ressources similaires,
  téléchargement, signalement), formulaire de dépôt (fichier + couverture
  optionnelle par sélection de fichier — pas de vrai glisser-déposer).
  6 fonctions ajoutées à `api.js` pour consommer l'API D1.7 déjà codée la
  veille. Les actions de modération (vérifier/marquer dangereux/supprimer)
  n'ont pas été incluses dans cette fiche détail : elles dépendaient de
  savoir si l'utilisateur est admin, information que le frontend n'avait
  pas encore (voir point suivant) — j'ai préféré construire d'abord D2.5
  puis revenir dessus plutôt que deviner les permissions.
- **Découverte en cours de route :** le frontend n'avait aucun moyen de
  savoir si l'utilisateur connecté est administrateur — `GET
  /api/users/profile` ne renvoyait ni `is_admin`, ni `admin_level`, ni les
  permissions déléguées, alors que `authMiddleware` les connaît déjà côté
  serveur depuis la veille. Corrigé : la route renvoie maintenant ces
  champs (permissions calculées uniquement pour un admin simple, un super
  admin a tout implicitement).
- **D2.5 Panel Admin avancé :** nouveau `components/AdminPanel.jsx`,
  reconstruit depuis `Canvas-2.dc.html` (desktop) — 3 onglets :
  Administrateurs (table + recherche d'utilisateur + attribution de
  niveau/permissions, vue réduite en lecture seule pour un admin simple),
  Dossiers prioritaires (liste + création), Journaux d'activité (filtres
  action/dates + liste chronologique avec libellés lisibles par type
  d'action). Entrée "Administration" ajoutée à la navigation de
  `Dashboard.jsx`, visible uniquement si `profile.is_admin`. 10 fonctions
  ajoutées à `api.js`. Simplifications assumées, documentées dans
  `ROADMAP.md` : pas de sélecteur de filière pour les dossiers prioritaires
  (pas d'endpoint backend pour lister `faculty_filieres`), pas de compteur
  de ressources par dossier (non calculé côté backend), filtre "par
  utilisateur" des journaux non implémenté (le backend attend un id
  numérique, pas une recherche par nom).
- Build de production revérifié après chaque ajout (`npx react-scripts
  build`) : compile toujours sans erreur.

**Ce qui reste en suspens :**
- Actions de modération dans la fiche détail communautaire (maintenant que
  `is_admin`/permissions sont exposés, ce point est débloqué pour la
  prochaine session).
- Explorateur/Soumissions/Cours partagés/Paramètres toujours retokenisés
  seulement, pas reconstruits pixel-exact depuis le canvas.
- Aucune fidélité mobile pour Connexion (au-delà de l'étape 1 déjà dans le
  canvas), Espace communautaire, Panel Admin — desktop uniquement pour
  l'instant.
- Endpoint backend manquant pour servir une image de couverture
  séparément du fichier principal — les vignettes utilisent toujours le
  repli générique, même quand une couverture a été fournie à l'upload.
- Onglets "Utilisateurs"/"Matricules"/"Espace communautaire" du Panel Admin
  de base (visibles dans le canvas, hors périmètre D2) pas construits.
- Toujours aucun test réel contre un Nextcloud/MySQL en production pour
  quoi que ce soit codé depuis le 2026-09-04.

---

## 2026-09-04 — Refonte frontend Slate & Citrus (Dashboard.jsx) + Corbeille branchée

**Contexte :** Victoire analyse le dossier `Claude design prompts/` avec
Claude Code : points positifs/négatifs des prompts, puis inspection des
rendus réels (images) — un bug de chevauchement de texte trouvé sur les 6
rendus du Prompt 1, un écart entre le mockup Corbeille (compte à rebours de
purge) et le backend réel, un problème d'espacement mobile relevé sur un
nouveau canvas "Core Modules" en cours de génération. Points consignés dans
`ROADMAP.md`. Peu après, Victoire valide ce canvas et demande de "build
tout ce qui reste".

**Constat de départ important :** le frontend en production tournait encore
entièrement sur l'ancienne palette "Nebula Dark" (`Dashboard.jsx`, variable
`N`) — aucune des directions visuelles explorées (Aurora/Meridian/Slate &
Citrus) n'avait jamais été intégrée au code réel, malgré les maquettes
validées. Toute la refonte visuelle restait jusqu'ici purement côté Claude
Design.

**Ce qui a été fait :**
- Lecture directe du fichier source `Gougoul Holocron - Core Modules.dc.html`
  (Claude Design, HTML/CSS réel avec valeurs exactes, pas juste du texte de
  prompt) pour en extraire les tokens Slate & Citrus (clair/sombre) et la
  structure exacte des écrans Dashboard/Corbeille.
- Nouveau `frontend/src/theme/tokens.js` : tokens clair/sombre extraits
  fidèlement du canvas (bg, surface, accent citron unique, texte, succès,
  danger — un seul accent dans toute l'interface, statuts en palette
  neutre par défaut, conformément à DECISIONS.md D-2026-07-14-02).
- **Réécriture complète de `Dashboard.jsx`** (897 → ~970 lignes) :
  - Nouvelle coquille : sidebar desktop (7 entrées : Accueil, Mes fichiers,
    Soumissions, Cours partagés, Espace communautaire, Corbeille,
    Paramètres) remplace l'ancienne top bar ; barre inférieure mobile à 4
    icônes (Accueil/Fichiers/Plus/Profil) avec feuille "Plus" pour le
    reste — remplace l'ancienne barre à 4 onglets fixes.
  - Bascule clair/sombre réelle et persistée (`localStorage`), pas
    seulement visuelle comme dans l'ancien design.
  - Accueil et Corbeille reconstruits à l'identique de la source (desktop) :
    Stockage, Fichiers récents (**données réelles**, `listFiles('/')`
    triées par date de modification — remplace l'ancien tableau statique
    `RECENT_FILES` qui n'avait jamais été branché), Dossiers partagés,
    Devoirs à rendre / Soumissions récentes, état vide Espace communautaire.
  - **Corbeille (B1) branchée** : 4 fonctions ajoutées à `api.js`
    (`getTrash`, `restoreTrash`, `purgeTrashItem`, `emptyTrash`), nouvel
    onglet complet (lister/restaurer/purger un élément/vider). Décision
    volontaire : pas de compte à rebours de purge affiché puisque le
    backend ne le calcule pas — évite de reproduire l'écart mockup/réalité
    relevé plus tôt dans la session plutôt que d'inventer un délai.
  - Nouvel onglet **Cours partagés** (réutilise les dossiers partagés déjà
    chargés, navigation directe vers l'Explorateur).
  - Onglet **Espace communautaire** ajouté à la navigation avec un état
    "Bientôt disponible" — le backend (D1.7) est prêt mais l'écran complet
    (catalogue/fiche/dépôt/modération, source `Canvas.dc.html`) n'a pas été
    construit dans cette passe, volume de travail trop important pour la
    combiner avec le reste sans sacrifier la qualité.
  - Explorateur, Soumissions et Paramètres migrés vers les nouveaux tokens
    et la nouvelle coquille — **toutes les fonctionnalités existantes
    préservées** (upload + annulation, suppression équilibrée B2,
    changement de mot de passe C1) — mais retokenisés plutôt que
    reconstruits pixel-exact depuis leurs sections du canvas (pas extraites
    dans cette passe, faute de temps).
  - Bug de chevauchement de texte corrigé (titre de devoir : 1 ligne +
    ellipsis, texte complet dans un `title` HTML au survol).
  - Espacement mobile corrigé : `max(20px, env(safe-area-inset-top))` en
    haut du contenu, `env(safe-area-inset-bottom)` sur la barre inférieure
    — au lieu des 18px bruts jugés trop serrés par Victoire.
  - Widget "Assistant IA" et bouton flottant retirés : absents du design
    validé, et l'ancien message "pas encore branché" n'avait plus lieu
    d'être une fois le reste de l'interface honnête sur ce qui existe.
  - `public/index.html` : couleur de fond et `theme-color` alignés sur la
    nouvelle palette sombre (évite un flash de l'ancienne couleur au
    chargement), titre renommé "Holocron".
- **Vérification :** `npm install` (1302 paquets, aucun n'était installé
  jusque-là) puis `npx react-scripts build` — compile sans erreur ni
  avertissement. Pas de vérification visuelle en navigateur avec données
  réelles (aucun serveur Nextcloud/MySQL accessible depuis cet
  environnement) — uniquement une vérification de compilation.

**Ce qui reste en suspens :**
- Login/Register toujours sur l'ancien style (hors périmètre de cette
  passe, la section "Connexion" du canvas n'a pas été reprise).
- Espace communautaire (D1.9) et Panel Admin avancé (D2.5) : backend prêt,
  UI complète pas construite — chacun mérite sa propre passe dédiée
  (`Canvas.dc.html` et `Canvas-2.dc.html` comme sources).
- Explorateur/Soumissions/Cours partagés/Paramètres : à reprendre pixel-exact
  depuis les sections t3/t4/t5/t6/t8 du canvas si une fidélité complète est
  souhaitée (actuellement cohérents visuellement mais pas identiques à la
  source).
- Fidélité mobile : seuls Accueil et Corbeille suivent exactement les
  maquettes mobile de la source ; les autres écrans sont responsive
  (réutilisent `isMobile`) mais pas recomposés selon les maquettes mobile
  spécifiques du canvas.
- Aucun test réel en conditions de production pour toute cette session
  (B1/B2/B3/C1/D1/D2 backend + toute la refonte frontend) — premier test
  réel à faire par Victoire après déploiement.
- Contraste des badges de statut Slate & Citrus toujours pas revérifié
  avec un outil dédié (point de vigilance #2, toujours ouvert).

---

## 2026-09-04 — Backend complet D1 (Espace communautaire) + D2 (Panel Admin avancé) + B3

**Contexte :** suite à B1/B2/C1 (session précédente le même jour), Victoire
demande de "continuer et tout builder". Les specs techniques de D1 (D1.7) et
D2 (D2.3) étaient déjà écrites par Claude (conversation) dans `ROADMAP.md` ;
D1 et D2 sont liés (les endpoints de modération communautaire — vérification
logiciel, suppression — nécessitent le système de permissions admin de D2),
donc D2 backend a été fait en premier.

**Ce qui a été fait :**
- **B3 Téléchargement direct :** `fileController.downloadFile` lit
  maintenant directement le disque monté en lecture seule (`NC_DATA_DIR`,
  même volume que `submissionController`) pour les fichiers de l'espace
  personnel — élimine l'aller-retour WebDAV. Confinement de chemin ajouté
  explicitement (`baseDir`/`startsWith`) car le disque n'a plus les
  permissions Nextcloud pour se protéger tout seul contre une traversée de
  chemin. Repli WebDAV inchangé pour les Team Folders `Cours-*` et tout cas
  où le fichier n'est pas trouvé sur le disque.
- **Migrations SQL :** nouveau dossier `database/migrations/`, fichier
  `2026-09-04_communautaire_et_panel_admin.sql` (ALTER `users` +
  `admin_permissions`, `faculties`, `levels`, `faculty_filieres`,
  `community_priority_folders`, `activity_logs`, `community_resources`,
  `community_reports`, seed niveaux L1-L5 + faculté "Sciences
  Informatiques" + ses 3 filières, promotion de Victoire en super admin) —
  **à exécuter manuellement par Victoire sur le MySQL de production**,
  `init.sql` ne se rejouant jamais sur une base déjà initialisée.
  `database/init.sql` mis à jour en parallèle avec le même schéma (colonnes
  admin directement dans `CREATE TABLE users`) pour toute future
  installation neuve.
- **D2 backend (Panel Admin avancé) :** `authMiddleware.js` attache
  désormais `is_admin`/`admin_level` à `req.user` et exporte deux nouveaux
  middlewares : `checkAdmin` (tout admin) et `checkPermission(permission)`
  (super admin bypass implicite, admin simple vérifie `admin_permissions`
  en BDD). Nouveau `adminController.js` + `routes/admin.js`
  (`/api/admin/*`) : liste/recherche d'utilisateurs, attribution/retrait de
  droits admin (**réservé aux super admins**, vérifié explicitement dans le
  contrôleur — pas délégable via une permission, et un super admin ne peut
  pas se retirer ses propres droits), dossiers prioritaires (CRUD,
  `gerer_dossiers`), journal d'activité (`voir_logs`). Chaque action
  sensible écrit dans `activity_logs` via un nouvel utilitaire partagé
  `utils/activityLog.js` (`logActivity`, erreur non bloquante).
- **D1 backend (Espace communautaire) :** nouveau `communityController.js`
  + `routes/community.js`, monté sur `/api` (`GET /api/faculties`,
  `/api/levels`, tout le reste sous `/api/community/resources*`).
  Classification à 3 facettes (faculté/niveau/catégorie, combinables,
  `NULL` = "Général"/"Tous niveaux"). Dépôt en 2 temps (INSERT pour obtenir
  l'id auto-incrémenté, puis PUT WebDAV vers
  `/Communautaire/{Cours|Logiciels|Medias|Autre}/{id}_{nom}`, MKCOL défensif
  des sous-dossiers). Post-modération : tout dépôt est visible/téléchargeable
  immédiatement ; badge `non_verifie` par défaut uniquement pour la
  catégorie Logiciel. **Point important respecté depuis les décisions
  d'architecture :** un fichier marqué `dangereux` reste VISIBLE dans le
  catalogue (avec son badge) — seul le téléchargement est bloqué (403) ;
  j'avais initialement filtré ces ressources hors de la liste par erreur de
  lecture rapide de la spec, corrigé avant d'écrire le fichier final. Le
  téléchargement, la vérification et la suppression réutilisent le même
  client WebDAV per-user que le reste du projet (jamais de client admin
  unique). Signalement persisté dans une nouvelle table `community_reports`
  (pas explicitement listée dans `CONTEXT.md` section 4 à l'origine — ajout
  nécessaire pour implémenter l'endpoint déjà spécifié).
- Nouvelles routes enregistrées dans `index.js`. `node --check` OK sur tous
  les fichiers backend (nouveaux et modifiés).
- **Pas touché au frontend pour D1/D2** : Victoire a explicitement demandé,
  plus tôt dans la même session, de ne pas attaquer l'Espace communautaire
  ni le Panel Admin avancé côté écrans tant que le mobile et la validation
  du design ne sont pas prêts. Seul le backend (spec déjà écrite, pas de
  dépendance à un rendu visuel) a été construit, sur le même principe que
  B1 (Corbeille) plus tôt dans la journée.

**Ce qui reste en suspens :**
- **Rien de D1/D2/B3 n'a été testé contre un vrai Nextcloud/MySQL.** À
  vérifier en priorité au premier déploiement réel :
  - Exécuter `database/migrations/2026-09-04_communautaire_et_panel_admin.sql`
    sur le MySQL de production (init.sql ne le fera pas tout seul).
  - Créer manuellement le Team Folder Nextcloud `Communautaire` (D1.8,
    écriture ouverte aux 3 groupes) — les sous-dossiers par catégorie se
    créent seuls au premier dépôt, mais pas le Team Folder racine.
  - Confirmer que la lecture directe sur disque (B3) trouve bien les
    fichiers à l'emplacement attendu (`{NC_DATA}/{username}/files/{chemin}`)
    en conditions réelles, comme c'est déjà le cas pour les soumissions.
  - Confirmer que `POST /api/auth/change-password` (C1, session précédente)
    fonctionne bien en réel — toujours pas vérifié non plus.
- Frontend : intégration de la Corbeille (B1), de l'Espace communautaire
  (D1.9) et du Panel Admin avancé (D2.5) — tout est prêt côté backend, mais
  bloqué sur des écrans à valider par Victoire (mobile + confirmation du
  design Panel Admin).
- Aucune donnée de test insérée pour `community_resources` — la première
  vérification réelle nécessitera un dépôt de bout en bout.

---

## 2026-09-04 — Axe B : suppression équilibrée + backend Corbeille

**Contexte :** Victoire demande de démarrer l'Axe B (finitions gestion de
fichiers) plutôt que l'Espace communautaire ou le Panel Admin avancé, qui
attendent encore les écrans mobile / le design côté Claude Design.

**Ce qui a été fait :**
- **B2 Suppression équilibrée :** la route `DELETE /files/delete` n'était
  accessible qu'aux profs/assistants (`checkRole`). Restriction retirée de
  la route ; le contrôle est désormais fait dans
  `fileController.deleteFile` : un étudiant reçoit un 403 explicite s'il
  tente de supprimer dans un Team Folder `Cours-*`, mais peut supprimer
  librement dans son propre espace personnel. Côté frontend
  (`Dashboard.jsx`), le bouton supprimer de l'Explorateur (`ExplorerCard`)
  utilise maintenant une prop `canDelete` (prof/assistant partout, étudiant
  hors dossiers de cours) au lieu de l'ancien `isProf` qui bloquait tout
  étudiant. Effet de bord positif : l'annulation d'upload en cours
  (suppression du fichier partiel) fonctionne maintenant aussi pour les
  étudiants, alors qu'elle échouait silencieusement avant (le `try/catch`
  autour de `deleteFile` avalait le 403).
- **B1 Corbeille (backend uniquement) :** 4 routes ajoutées, toutes basées
  sur l'API DAV trashbin native de Nextcloud (le DELETE WebDAV classique
  alimentait déjà la corbeille sans route pour l'exploiter) :
  `GET /files/trash` (liste, avec nom/chemin d'origine/date de suppression),
  `POST /files/trash/restore` (`{trashPath}`),
  `DELETE /files/trash/item` (`{trashPath}`, suppression définitive d'un
  élément), `DELETE /files/trash/empty` (vide toute la corbeille). Pas
  d'écran frontend — B1 attend explicitement la maquette Slate & Citrus
  (non prioritaire ce jour, voir `ROADMAP.md`).
- `node --check` OK sur `fileController.js` et `routes/files.js`.

- **C1 API changement de mot de passe :** route `POST /api/auth/change-password`
  ajoutée (`authController.changePassword`), protégée par `authMiddleware`.
  Vérifie le mot de passe actuel via bcrypt, puis met à jour dans cet
  ordre : (1) mot de passe Nextcloud via OCS (nouveau helper
  `setUserPassword` dans `config/nextcloud.js`), (2) `users.password`
  (hash bcrypt) et `users.nc_password` (clair) — l'ordre est volontaire :
  si l'appel Nextcloud échoue, la BDD n'est pas touchée, pour ne jamais
  désynchroniser `nc_password` du vrai mot de passe Nextcloud (rappel :
  `nc_password` est ce que `userWebdav()` utilise pour toutes les
  opérations fichiers). Formulaire déjà présent dans Settings (jusque-là
  non branché) connecté : validation client (champs requis, confirmation
  identique, 6 caractères minimum), retour d'erreur/succès affiché,
  `changePassword()` ajoutée à `api.js`.

**Ce qui reste en suspens :**
- Écran Corbeille (frontend) à faire une fois la maquette Slate & Citrus
  validée par Victoire.
- B3 (téléchargement direct des gros fichiers) pas commencé.
- Pas de test manuel en conditions réelles (serveur Nextcloud) effectué
  dans cette session, pour B1/B2/C1 — à valider par Victoire avant
  déploiement. En particulier à vérifier au premier test réel : que l'OCS
  Nextcloud accepte bien un changement de mot de passe déclenché par
  l'utilisateur lui-même (pas seulement l'admin) sur cette instance.

---

## 2026-09-04 — Panel Admin avancé conçu et maquetté + spec technique écrite

**Contexte :** suite à la conception de l'Espace communautaire (même
journée), Victoire demande la conception du Panel Admin avancé : gestion
déléguée des droits admin, dossiers prioritaires, traçabilité.

**Ce qui a été fait :**
- Décisions actées : deux niveaux d'admin (super/simple) avec permissions
  à la carte, dossiers prioritaires comme attribut d'un dossier existant
  (pas un type séparé), journal d'activité pour la traçabilité — voir
  `DECISIONS.md` D-2026-09-04-05 à 07.
- Claude Design a livré les 3 nouveaux onglets du Panel Admin
  (Administrateurs, Dossiers prioritaires, Journaux d'activité), desktop
  1440px, clair + sombre, dans le système Slate & Citrus déjà établi.
- Claude a écrit la spec technique correspondante (endpoints, contrats,
  modèle de données) pour l'Espace communautaire (D1.7) et le Panel Admin
  avancé (D2.3) dans `ROADMAP.md`, prête pour Claude Code.

**Ce qui reste en suspens :**
- Aucune implémentation backend/frontend commencée sur ces deux chantiers
  (D1, D2) — attend que Claude Code s'en saisisse.
- Versions mobile et états vide/chargement/erreur toujours pas faits pour
  l'Espace communautaire ; Soumissions/Cours partagés/Corbeille toujours en
  Meridian, pas en Slate & Citrus.

---

## 2026-07-14 — Nouvelle méthode de travail + lancement de la refonte UI

**Contexte :** au lendemain de la soutenance (réussie, bien accueillie par
le Doyen Bagula et les assistants), passage d'une approche "correctifs au
fil de l'eau" à une approche structurée.

**Décisions actées :**
- Mise en place du système `docs/*.md` (ce fichier + `CONTEXT.md` +
  `ROADMAP.md` + `DECISIONS.md`) comme mémoire partagée entre Claude
  (stratégie), Claude Code (build/debug dans VS Code) et Claude Design (UI).
- Refonte complète de l'interface décidée : on repart du login jusqu'à la
  dernière fonctionnalité, sans s'attacher à l'existant. Voir
  `DECISIONS.md` D-2026-07-14-01.
- Le supercalculateur universitaire est mis de côté : on finit d'abord le
  système sur l'infrastructure actuelle (UC + TrueNAS + Nextcloud), la
  migration sera un chantier séparé plus tard.
- 3 directions visuelles explorées en parallèle (Aurora / Meridian /
  Slate & Citrus), chacune en clair + sombre réversible. Prompts rédigés
  dans `Prompts_ClaudeDesign_3_Directions.md`.
- Architecture d'information validée : 3 expériences distinctes par rôle
  (étudiant / prof-assistant / admin), desktop et mobile à égalité.

**Ce qui reste en suspens à la prochaine session :**
- Récupérer les 6 rendus du Prompt 1 (exploration comparative) et choisir
  une direction avec le groupe.
- Le fichier des matricules (export propre Excel/PDF/CSV) demandé par
  Victoire n'a pas été finalisé — format et décision sur le matricule
  douteux de Nephtali (`ETU-29243863` vs `20243863`) toujours en attente.

---

## 2026-07-13 — Reconstruction complète après panne disque + redéploiement + soutenance

**Contexte :** le disque de stockage 1 To (pool `Holocron_sith`) est tombé
en panne irréversible. Le SFTP étant unidirectionnel, ~6 semaines de code
développé côté serveur n'avaient jamais été rapatriées sur le PC — la
sauvegarde locale s'est révélée être un instantané de début juin.

**Diagnostic et reconstruction :**
- Confirmation de la mort physique du disque (test en boîtier externe :
  ne démarre plus).
- Reconstruction intégrale du code (backend + frontend + infra) à partir
  de trois sources croisées : le zip de juin (base), les fichiers d'état
  détaillés (3 et 12 juillet), et l'historique des sessions de
  développement (récupération de fragments verbatim).
- Fichiers reconstruits : `authController.js`, `authMiddleware.js`,
  `fileController.js` (client WebDAV per-user), `submissionController.js`
  et `routes/submissions.js` (module Submissions complet, neuf),
  `routes/files.js`, `routes/users.js` (fix matricule "—"), `init.sql`
  (colonne `nc_password`, tables `assignments`/`submissions`), les deux
  `docker-compose.yml`, `holocron-boot.sh`, `Dashboard.jsx` (Submissions
  réel, quota/stats réels, IA honnête), `api.js`.
- Tout validé syntaxiquement avant livraison (`node --check` + Babel).

**Récupération de l'infrastructure (avec l'aide ponctuelle de DeepSeek pour
la base, puis reprise et corrections avec Claude) :**
- Nouveau disque 500 Go, pool `Holocron_sith` recréé — mais créé en CLI
  (non enregistré par TrueNAS) → **importé via l'interface web** pour
  garantir le remontage automatique (cachefile confirmé).
- Montage corrigé (`/mnt/mnt/Holocron_sith` → `/mnt/Holocron_sith` via
  `zfs set mountpoint=/Holocron_sith`, sans le préfixe `/mnt/`).
- Docker repointé sur le pool (`daemon.json` patché via `jq`, en
  préservant la config TrueNAS existante).
- `holocron-boot.sh` réécrit et **testé avec succès** en conditions
  réelles, puis enregistré en POSTINIT TrueNAS (600s timeout).
- Webapp déployée depuis zéro : erreurs corrigées en cours de route
  (`nginix.conf` vs `nginx.conf` dans le Dockerfile, `frontend/package.json`
  et `frontend/public/index.html` manquants côté PC — recréés).
- Droits SFTP corrigés (`chown -R truenas_admin` sur `/webapp`, qui
  appartenait à `root`).

**Fonctionnalités posées après redéploiement :**
- Toute la promotion (65 étudiants + 1 assistant, extraits des 3 PDF de
  filière) insérée dans `matricules`, en plus des 17 déjà présents.
- Groupes Nextcloud créés (`Etudiants`, `Professeurs`, `Assistants` + 3
  filières) — absents jusque-là, ce qui expliquait un échec silencieux à
  l'inscription.
- 3 Team Folders de cours créés et liés : filière en lecture seule,
  `Professeurs`/`Assistants` en lecture + écriture sur les 3.
- Fichiers de bienvenue Nextcloud désactivés (`skeletondirectory` vidé).
- `getSharedFolders` enrichi (taille réelle + nombre de fichiers via
  propriétés Nextcloud `oc:size` / `nc:contained-file-count`).
- Dashboard rendu réellement responsive (grille à une colonne sous
  768px, badge serveur allégé sur mobile) — les mocks de dossiers
  partagés supprimés au profit des vrais dossiers avec état vide honnête.
- Annulation d'upload en cours (AbortController + suppression du fichier
  partiel côté prof/assistant).

**Sauvegarde définitive mise en place :**
- Dépôt Git privé créé et poussé sur GitHub
  (`VictoireNdala/gougoul-holocron`).
- Snapshot ZFS pris (`Holocron_sith@systeme-ok-2026-07-13`).

**Soutenance (même jour, 9h) :**
- Rapport Word complet généré selon la grille méthodologique du Doyen
  Bagula (HLD/LLD, UML, ERD, séquence, tests, coûts, discussion des
  problèmes rencontrés).
- Devis du projet : 330 USD (UC 200 $, connexion/données 40 $, imprévus
  40 $, ressources de débogage dont abonnement Claude 50 $).
- Brief de présentation PowerPoint rédigé pour Claude Design.
- **Soutenance réussie**, bien accueillie par le Doyen et les assistants.

---

## Avant le 13 juillet 2026

Historique antérieur non détaillé dans ce fichier (créé a posteriori). Pour
mémoire, les grandes étapes précédentes incluaient : la conception initiale
du projet, le choix de l'architecture v2 (résolution du problème de
régénération de `daemon.json` par TrueNAS à chaque boot), le développement
initial du module Submissions, et la constitution progressive de la base de
matricules. Voir `DECISIONS.md` pour les choix d'architecture actés durant
cette période.
