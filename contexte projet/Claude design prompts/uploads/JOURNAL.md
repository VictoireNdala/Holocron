# JOURNAL.md — Holocron

> Historique des sessions, en ordre chronologique (la plus récente en haut).
> Chaque entrée : date, ce qui a été fait, ce qui a changé, ce qu'il reste
> en suspens. Objectif : que n'importe qui (humain ou IA) comprenne en 2
> minutes ce qui s'est passé récemment, sans relire tout l'historique.

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
