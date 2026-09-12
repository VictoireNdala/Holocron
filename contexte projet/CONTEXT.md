# CONTEXT.md — Holocron

> Ce fichier est le **contexte permanent** du projet. Il est lu en premier par
> quiconque (humain ou IA) reprend le travail. Il ne raconte pas l'historique
> (voir `JOURNAL.md`) ni les tâches en cours (voir `ROADMAP.md`) : il décrit
> **ce qu'est le système aujourd'hui**, tel qu'il tourne réellement.
>
> Règle d'or : ce fichier doit toujours refléter l'état RÉEL du système. Si le
> code change une donnée décrite ici (mot de passe, chemin, architecture),
> ce fichier doit être mis à jour dans la même session.

---

## 1. Qu'est-ce que Holocron

> **Nom du produit :** le produit s'appelle désormais **Holocron** (renommé
> depuis "Gougoul Holocron" le 2026-09-04). Le dépôt GitHub
> (`VictoireNdala/gougoul-holocron`, section 11) contient encore l'ancien
> nom dans son slug — ne PAS le renommer sans effectuer le changement réel
> côté GitHub, cela casserait le remote Git configuré partout.

Un cloud privé académique de campus : plateforme de partage de ressources
(fichiers, cours, devoirs) fonctionnant **entièrement sur le réseau local**,
sans dépendance à Internet. Portail web unique par lequel transitent toutes
les interactions ; la complexité du stockage (Nextcloud, ZFS) est invisible
pour l'utilisateur final.

**Porteuse du projet / administratrice système :** Ndala Mwenze Victoire,
matricule `ETU-20244936`, Génie Logiciel, L2, Faculté des Sciences
Informatiques.

**Groupe de projet :**
| Nom | Matricule | Filière |
|---|---|---|
| Ndala Mwenze Victoire | ETU-20244936 | Génie Logiciel |
| Mutombo Musaka Dikonzo Enock | ETU-20244401 | Intelligence Artificielle |
| Ngalula Odia Joshua | ETU-20244052 | Systèmes Informatiques |
| Mulonda Kabeya Richard | ETU-20244721 | Intelligence Artificielle |
| Kisimba Kipoka Lionel | ETU-20243959 | Génie Logiciel |

**Encadreur :** Doyen Bagula Bigomokero Antoine (`PRO-2024001`).
**Assistants inscrits :** Ortega Kabwe (`ASS-2024004`), + Joseph Mbumba
(`ASS-2024006`) et autres matricules en base (voir table `matricules`).

---

## 2. Définition de « système fini » (objectif principal)

> Le système est « fini » quand un étudiant, un professeur et un assistant
> peuvent faire tout leur travail via le portail, sans jamais toucher à
> Nextcloud directement, avec : gestion complète des fichiers (dont corbeille
> et suppression de ses propres fichiers), soumissions, cours partagés,
> changement de mot de passe, un espace communautaire, et une interface
> d'administration. Le tout stable, sauvegardé et documenté.

Cette définition peut évoluer — si elle change, la mettre à jour ici ET dans
`ROADMAP.md`.

---

## 3. Architecture actuelle (5 couches)

```
Utilisateurs (Étudiant / Professeur / Assistant)
        │
        ▼
COUCHE 5 — Frontend React.js (port 3000)
  Portail unique : inscription, explorateur, soumissions, cours, paramètres
        │  HTTP/JSON
        ▼
COUCHE 4 — Backend Node.js / Express (port 5000)
  API REST, auth JWT, intégration OCS + WebDAV per-user
  + Base MySQL (métadonnées : matricules, users, devoirs, soumissions)
        │  OCS + WebDAV
        ▼
COUCHE 3 — Nextcloud 33 (port 8080)
  Moteur de stockage invisible, Team Folders (cours partagés + communautaire)
  + PostgreSQL + Redis
        │
        ▼
COUCHE 2 — TrueNAS SCALE + ZFS
  Pool "Holocron_sith", Docker (overlay2), snapshots
        │
        ▼
COUCHE 1 — Matériel reconditionné
  Dell OptiPlex 9020, i5-4670, 8 Go RAM, disques SATA (~465 Go depuis la
  migration du 2026-09-11/12, toujours 1 seul disque, pas de redondance)
```

**Deux stacks Docker Compose distinctes :**
- `/mnt/Holocron_sith/webapp/` → MySQL (:3306) + backend (:5000) + frontend (:3000)
- `/mnt/Holocron_sith/nexcloud/` → Nextcloud (:8080) + PostgreSQL + Redis

**Réseau :** serveur à l'IP statique `192.168.1.4`, accessible depuis le
réseau local du campus uniquement.

---

## 4. Modèle de données (MySQL — `academic_nas`)

| Table | Rôle |
|---|---|
| `matricules` | Liste blanche des matricules autorisés à s'inscrire (matricule, nom, prenom, role, filiere) |
| `users` | Comptes inscrits (+ `nc_password` en clair, requis pour le WebDAV per-user ; + `is_admin`/`admin_level`, voir Panel Admin ci-dessous) |
| `sessions` | Jetons JWT actifs |
| `assignments` | Devoirs créés par profs/assistants |
| `submissions` | Rendus déposés par les étudiants |

Filières valides (chaînes exactes utilisées partout — DB, groupes Nextcloud,
frontend) : `Genie Logiciel`, `Intelligence Artificielle`,
`Systemes Informatiques`. **À généraliser** : voir `ROADMAP.md` Axe F6 —
ces valeurs (et les facultés/niveaux/catégories communautaires ci-dessous)
ne sont qu'un échantillon de départ, pas une liste figée à long terme.

Rôles valides : `etudiant`, `professeur`, `assistant`. Quotas par rôle :
étudiant 2 Go, professeur 10 Go, assistant 5 Go.

**Espace communautaire** (conception validée le 2026-09-04, **implémenté et
testé en conditions réelles le 2026-09-12** — dépôt avec image de
couverture, fiche détail, téléchargement, compteur — voir `JOURNAL.md`) —
tables supplémentaires :

| Table | Rôle |
|---|---|
| `faculties` | Facultés (id, nom) — **CRUD complet depuis le Panel Admin, Axe F6 fait le 2026-09-12** |
| `levels` | Niveaux (id, nom, ordre) — L1-L5 au départ, gérables en CRUD (Axe F6) |
| `community_categories` | Catégories de ressources (id, nom, `is_logiciel`, ordre) — **nouvelle table, Axe F6/D-2026-09-12-04** ; `is_logiciel` identifie PAR FLAG (pas par libellé) la catégorie spéciale pour les badges de vérification, renommable sans casser la logique |
| `community_resources` | id, titre, description, categorie (**VARCHAR libre depuis le 2026-09-12**, plus un ENUM — voir `community_categories` pour les valeurs proposées), faculty_id (nullable = "Général/toutes facultés"), level_id (nullable = "Tous niveaux"), cover_image_path (upload manuel, facultatif), fichier_path, fichier_nom, taille, uploader_id, downloads_count, verification_status (non_concerne/non_verifie/verifie/dangereux), verified_by, verified_at, status (visible/masque), created_at |
| `community_reports` | id, resource_id, reporter_id, raison, created_at — signalements (`POST .../report`) |
| `notifications` | id, user_id, type, title, message, link, is_read, created_at — **nouvelle table, Axe D3/G8 (2026-09-12)**, fan-out à l'écriture (une ligne par destinataire) |

Classification par **3 facettes combinables** (Faculté / Niveau / Catégorie),
pas de dossiers imbriqués — voir DECISIONS.md D-2026-09-04-01. Quota de
l'espace communautaire **séparé** des quotas personnels des utilisateurs —
satisfait naturellement par le choix de stockage (Team Folder Nextcloud, pas
l'espace personnel de l'utilisateur), aucun code de quota dédié nécessaire.
Stockage physique : Team Folder Nextcloud dédié `Communautaire` (**créé
côté serveur le 2026-09-12**, lors de la redéploiement Nextcloud complet —
voir section 6), écriture ouverte à tous les rôles, sous-dossiers par
catégorie (`/Communautaire/{Cours|Logiciels|Medias|Autre}/{resource_id}_{nom}`,
+ `/Communautaire/_covers/` pour les images de couverture), créés
automatiquement par le backend au premier dépôt (MKCOL défensif).

**D3/G8 fait (2026-09-12) :** notifications (cloche) — `notifyFiliere`
(nouveau devoir → étudiants de la filière ciblée), `notifyUser` (rendu reçu
→ professeur propriétaire du devoir), `notifyAllExcept` (dépôt
communautaire → tous les utilisateurs actifs sauf l'auteur), helpers dans
`backend/src/utils/notify.js`. Endpoints `GET /api/notifications`,
`PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`.
Frontend : composant `NotificationBell` (badge non-lus, panneau déroulant),
polling 30s. **Migration séparée à exécuter manuellement** :
`database/migrations/2026-09-12_notifications.sql` (pas encore appliquée
en production).

**F7 fait (2026-09-12) :** les dossiers prioritaires apparaissent
désormais dans une section dédiée en tête du catalogue (`GET
/community/priority-folders`, route publique), avec compteur de
ressources et clic pour appliquer les filtres correspondants.

**Panel Admin avancé + base** (conception validée le 2026-09-04,
**implémenté et accessible le 2026-09-12** — 5 onglets confirmés
fonctionnels visuellement : Utilisateurs, Matricules, Administrateurs,
Dossiers prioritaires, Journaux d'activité) — tables supplémentaires :

| Table | Rôle |
|---|---|
| `users` (+colonnes) | `is_admin` (bool), `admin_level` (`super`/`simple`, nullable) |
| `admin_permissions` | id, user_id, permission, granted_by, granted_at |
| `community_priority_folders` | id, faculty_id, filiere_id (nullable), level_id (nullable), is_priority, created_by, created_at |
| `faculty_filieres` | id, faculty_id, nom |
| `activity_logs` | id, user_id, action, cible_type, cible_id, details, created_at |

Un **super admin** a tous les droits implicitement. Un **admin simple**
reçoit des permissions individuelles parmi : `verifier_logiciels`,
`moderer_communautaire`, `gerer_matricules`, `gerer_utilisateurs`,
`gerer_dossiers`, `voir_logs`, `gerer_taxonomie` (**ajoutée le 2026-09-12**,
Axe F6 — CRUD facultés/filières/niveaux/catégories depuis un nouvel onglet
Panel Admin "Taxonomie"). Voir DECISIONS.md D-2026-09-04-05/06/07 et
`ROADMAP.md` axe D2 pour les endpoints. Attribuer/retirer les droits admin
eux-mêmes (`POST /admin/admins/:userId/grant`, `DELETE .../:userId`) est
**réservé aux super admins** (vérifié dans `adminController.js`, pas
délégable via `admin_permissions` — jugé trop sensible).

**Migration SQL** pour appliquer ce schéma sur une base déjà déployée sans
le rejouer via `init.sql` (qui ne s'exécute qu'au tout premier démarrage
MySQL) : `database/migrations/2026-09-04_communautaire_et_panel_admin.sql`
— déjà appliquée en production (base recréée lors de la migration disque du
2026-09-12, `init.sql` à jour inclut désormais ce schéma nativement).
Victoire (`ETU-20244936`) est promue super admin — **attention** : son
compte a perdu ce statut une fois pendant la migration (compte MySQL
recréé, reparti sur les valeurs par défaut) et a dû être repromu
manuellement ; à surveiller si le compte est recréé de nouveau.

---

## 5. Comptes et identifiants actuels

| Service | Identifiant | Mot de passe / valeur |
|---|---|---|
| Nextcloud admin | `admin` | `gougoul123` *(corrigé le 2026-09-12 — l'ancien `TheGougoulHolocron8@` ne correspondait plus après la migration disque ; voir CONTEXT.md piège #16 pour toujours vérifier en CLI plutôt que de supposer)* |
| MySQL app | `academic_user` | `academic1234` (base `academic_nas`) |
| MySQL root | `root` | `root1234` |
| Postgres (Nextcloud) | `nextcloud` | `nextcloud123` |
| JWT secret | — | `holocron_secret_2024` **(⚠️ à changer, voir note ci-dessous)** |
| SSH serveur | `truenas_admin` @ `192.168.1.4` | clé SSH (`~/.ssh/id_ed25519`) |

> ⚠️ Si un identifiant change, mettre à jour cette table immédiatement.

> **⚠️ Action manuelle requise (Axe G3, 2026-09-12) :** le backend refuse
> désormais de démarrer si `JWT_SECRET` n'est pas défini dans
> l'environnement (voir `backend/src/config/jwt.js`) — l'ancien fallback
> silencieux en dur dans le code a été supprimé. `docker-compose.yml`
> définit toujours `JWT_SECRET: holocron_secret_2024` pour ne pas casser
> le prochain déploiement, mais cette valeur reste faible et connue de
> quiconque a accès au dépôt. Victoire doit la remplacer par une valeur
> forte et unique dans `docker-compose.yml` — attention, changer cette
> valeur déconnecte immédiatement tous les utilisateurs actifs (jetons JWT
> existants invalidés), à faire à un moment approprié plutôt qu'en pleine
> journée d'usage.

---

## 6. Groupes et Team Folders Nextcloud

> **Redéployé à neuf le 2026-09-12** (nouvelle installation Nextcloud
> complète lors de la migration disque) — admin, groupfolders et les 4 Team
> Folders reconfigurés depuis zéro, skeleton désactivé, comme décrit
> ci-dessous.

Groupes créés (6) : `Etudiants`, `Professeurs`, `Assistants`, `Genie Logiciel`,
`Intelligence Artificielle`, `Systemes Informatiques`.

Team Folders (4) :
| Dossier | Groupe filière | Profs/Assistants |
|---|---|---|
| Cours-Genie-Logiciel | `Genie Logiciel: read` | `Professeurs/Assistants: read, write` |
| Cours-Intelligence-Artificielle | idem | idem |
| Cours-Systemes-Informatiques | idem | idem |
| **Communautaire** | écriture ouverte à `Etudiants`/`Professeurs`/`Assistants` | idem (tous rôles, voir section 4) |

Règle de permission sur les 3 dossiers `Cours-*` : **étudiants en lecture
seule, profs/assistants en lecture + écriture**. `Communautaire` est ouvert
en écriture à tous les rôles (dépôt libre, voir DECISIONS.md D-2026-09-04-02).

Les fichiers de bienvenue Nextcloud (skeleton) sont **désactivés**
(`skeletondirectory` vidé) — les nouveaux comptes démarrent avec un espace vide.

---

## 7. Fonctionnalités déjà implémentées et validées

**Testées de bout en bout en conditions réelles le 2026-09-12** (après la
migration disque, voir `JOURNAL.md`) :
- Inscription par matricule → attribution auto du rôle/filière/quota,
  création du compte MySQL + Nextcloud + groupe.
- Connexion (JWT), déconnexion.
- Explorateur de fichiers personnel (liste, upload avec progression et
  **annulation** via AbortController, download, créer dossier, dossiers).
- **Corbeille** (B1) : lister, restaurer, purger un élément confirmés
  fonctionnels.
- Module Soumissions complet : création de devoir (prof/assistant), dépôt
  (étudiant), consultation + téléchargement des rendus (prof/assistant, via
  lecture disque directe en lecture seule).
- Dossiers de cours partagés par filière avec permissions différenciées
  (mais voir bug Axe F5 : l'onglet "Cours partagés" redirige actuellement
  vers "Mes fichiers" au lieu de s'afficher).
- Dashboard avec quota réel, stats réelles, dossiers partagés réels.
- **Espace communautaire** (D1) : dépôt avec image de couverture, fiche
  détail, téléchargement, compteur de téléchargements confirmés
  fonctionnels.
- **Panel Admin** (D2) : accessible, 5 onglets (Utilisateurs, Matricules,
  Administrateurs, Dossiers prioritaires, Journaux d'activité) confirmés
  fonctionnels **visuellement** — tests approfondis action par action pas
  encore tous faits individuellement.
- Interface responsive (empilement mobile sous 768px), thème clair/sombre
  Slate & Citrus (voir section 9 pour le détail de fidélité par écran).
- Sauvegarde : dépôt Git privé sur GitHub (le `git clone` a fonctionné pour
  la migration du 2026-09-12, contrairement à l'incident de juillet),
  snapshots ZFS (dernier : `Holocron_sith@systeme-complet-2026-09-12`),
  script de démarrage automatique (`holocron-boot.sh`) enregistré en
  POSTINIT TrueNAS.

**Codées et déployées, pas explicitement re-testées action par action cette
semaine** (mais faisant partie du même build validé globalement) :
- Suppression équilibrée (étudiant supprime ses propres fichiers uniquement).
- Téléchargement direct des gros fichiers (lecture disque, espace personnel).
- API de changement de mot de passe.

**Axe G codé le 2026-09-12, build vérifié, PAS testé contre le vrai
Nextcloud/MySQL de production :**
- Rate limiting (`express-rate-limit`), en-têtes `helmet`, durcissement
  `JWT_SECRET` (fail-fast, voir section 5).
- Pagination du catalogue communautaire, renommer/déplacer un fichier
  (Explorateur), recherche locale dans "Mes fichiers".
- Réinitialisation de mot de passe par un admin (`POST
  /admin/users/:userId/reset-password`).
- Notifications (cloche) — voir section 4 pour le détail, migration
  `2026-09-12_notifications.sql` non encore appliquée en production.

## 8. Fonctionnalités PAS encore implémentées / correctifs connus (à faire)

Voir le détail et l'ordre dans `ROADMAP.md` (Axe B0 et Axe F, retour d'usage
du 2026-09-12). Liste de référence :
- **[Priorité haute] B0 — Rollback dans `register` si Nextcloud échoue.**
  Bug d'architecture actif : des comptes MySQL fantômes se créent en
  silence si la création Nextcloud échoue après l'insertion MySQL — voir
  piège #13 ci-dessous et DECISIONS.md D-2026-09-12-01.
- Axe F (8 points remontés après le premier usage réel du 2026-09-12) :
  texte "Bientôt disponible" resté figé sur le Dashboard, navigation
  Explorateur (fil d'Ariane + bouton retour), vraies prévisualisations de
  fichiers, sélection multiple + suppression groupée, bug redirection
  "Cours partagés", **taxonomie Espace communautaire entièrement
  dynamique** (le plus structurant), dossiers prioritaires invisibles dans
  le catalogue, descriptions d'aide sur le Panel Admin.
- Page stockage dédiée (D4). (Notifications/cloche : codées, voir Axe G/D3
  ci-dessus et section 7 — reste à déployer et tester réellement.)
- Nom de domaine local (`holocron.local`).
- Redondance renforcée (miroir ZFS, snapshots planifiés, SMART) — toujours
  un seul disque en stripe, aucune redondance depuis la migration du 2026-09-12.
- *(entre parenthèses, long terme)* Assistant IA local (Ollama).
- *(entre parenthèses, long terme)* Migration vers le supercalculateur universitaire.

## 9. Refonte d'interface

Refonte complète de l'interface (login → toutes les fonctionnalités) menée
via Claude Design, en parallèle du code. Trois directions visuelles
explorées : **Aurora** (calme/premium), **Meridian** (institutionnel/sérieux),
**Slate & Citrus** (épuré/pro 2026) — chacune en clair ET sombre réversible.

**Direction retenue : Slate & Citrus** — fond gris vrai (`#0B0B0C` sombre /
`#FAFAFA` clair), surfaces sans bordure (élévation par luminosité
uniquement), un seul accent citron `#C4F042` utilisé avec parcimonie,
typographie minimaliste (Inter), coins arrondis discrets. **C'est
maintenant l'interface réellement en production** (voir ci-dessous — pas
seulement une maquette validée).

**Avancement des maquettes (Claude Design) :** Dashboard étudiant, Connexion,
Explorateur, Panel Admin (base + les 3 onglets avancés), Paramètres, module
Espace communautaire complet, et le canvas **"Core Modules"** (validé par
Victoire le 2026-09-04 : Dashboard, Connexion, Explorateur, Soumissions,
Cours partagés, Corbeille, Paramètres, Panel Admin Utilisateurs/Matricules —
desktop 1440px **et** mobile 390px, clair + sombre). Pas fait côté
maquette : dashboards Professeur/Admin dédiés, mobile de l'Espace
communautaire, états chargement/vide/erreur génériques partout.

**Avancement dans le CODE RÉEL (`frontend/`) — déployé en production depuis
le 2026-09-12 :**
- ⚠️ **Piège historique à retenir** : jusqu'au 2026-09-04, le frontend en
  production tournait encore entièrement sur l'ancienne palette "Nebula
  Dark", malgré des maquettes Slate & Citrus validées depuis juillet — une
  maquette "faite" ne veut pas dire "en production". Ne plus reproduire cet
  écart : toujours vérifier ce qui tourne réellement, pas seulement ce qui
  est conçu.
- ✅ Réécrit sur les tokens Slate & Citrus réels (`frontend/src/theme/tokens.js`,
  extraits de `Core Modules.dc.html`), bascule clair/sombre fonctionnelle
  (persistée en `localStorage`). Fidèles à la source (desktop + mobile) :
  **Accueil**, **Corbeille**. Retokenisés mais pas reconstruits pixel-exact
  depuis le canvas : Explorateur (vue Liste par défaut + bascule Grille,
  ajouté le 2026-09-05), Soumissions (statut "En retard" ajouté), Cours
  partagés, Paramètres.
- ✅ `Login.jsx` (fidèle à la source, flux 3 étapes) et `Register.jsx`
  (extrapolé, pas de maquette dédiée) réécrits.
  `components/CommunitySpace.jsx` (catalogue avec vraies vignettes de
  couverture, actions de modération, fiche détail, dépôt) et
  `components/AdminPanel.jsx` (5 onglets : Administrateurs, Dossiers
  prioritaires, Journaux d'activité, Utilisateurs, Matricules, filtrés par
  permission réelle) construits et branchés sur l'API réelle.
  `GET /api/users/profile` expose `is_admin`/`admin_level`/`permissions`.
- ⬜ Pas construits ou incomplets, restent ouverts (voir `ROADMAP.md` Axe F
  pour le détail priorisé) : toute version mobile dédiée d'Espace
  communautaire/Panel Admin/Connexion (étape 1 seule) — reste responsive
  mais pas recomposé selon des maquettes mobile spécifiques ;
  pixel-fidélité complète de Cours partagés/Paramètres ; vraies
  prévisualisations de fichiers dans l'Explorateur (Axe F3) ; taxonomie
  communautaire dynamique (Axe F6) ; onglet "Espace communautaire" dédié du
  Panel Admin (table de modération séparée, jugée redondante avec la
  modération déjà présente dans `CommunitySpace`).

---

## 10. Pièges connus — ne jamais refaire ces erreurs

1. **TrueNAS régénère `/etc/docker/daemon.json` à chaque boot.** Ne jamais
   éditer ce fichier à la main de façon permanente : toujours passer par le
   script `holocron-boot.sh` (patch via `jq`, préserve la config TrueNAS,
   force `data-root` + `overlay2`).
2. **Ne jamais revenir à `vfs`** comme storage-driver, ni recréer d'anciens
   correctifs supprimés (`vfs-patch.conf`, `holocron.service` systemd).
3. **Un pool ZFS créé en CLI n'est pas enregistré par le middleware
   TrueNAS.** Toujours importer via l'interface web (Storage → Import Pool)
   pour garantir le remontage automatique.
4. **Mountpoint ZFS sous TrueNAS :** définir `mountpoint=/Holocron_sith`
   (SANS le `/mnt/` initial) — TrueNAS ajoute lui-même le préfixe `/mnt/`.
   Donner le chemin complet produit un double `/mnt/mnt/`.
5. **`verifyMatricule` doit interroger la table `matricules`**, jamais
   `users`. Un `sed` global a déjà réintroduit ce bug une fois — vérifier
   après tout remplacement de masse.
6. **La route `/profile` doit sélectionner `matricule`** dans son SELECT
   (bug historique : le "—" affiché à la place du matricule).
7. **Nextcloud 33 interdit l'écriture cross-user par l'admin.** Toute
   opération WebDAV sur les fichiers utilise les identifiants propres de
   l'utilisateur (`userWebdav(req)`), jamais un client admin unique.
8. **Le téléchargement d'un rendu par un prof/assistant lit directement sur
   disque** (montage `/nextcloud-data:ro`), pas via WebDAV admin — contourne
   la même restriction Nextcloud 33.
9. **MySQL nécessite un bind-mount explicite** (pas un volume nommé) pour
   survivre aux déplacements de data-root Docker.
10. **Image Nextcloud épinglée à `nextcloud:33`**, jamais `:stable`.
11. **SFTP est unidirectionnel** (push PC → serveur). Toujours penser à
    redescendre le code serveur vers le PC (voir section Sauvegarde) —
    c'est l'oubli qui a causé la perte de 6 semaines de code lors de la
    panne disque de juillet 2026.
12. Fichiers créés en root via Shell → toujours
    `chown -R truenas_admin:truenas_admin` avant tout transfert SFTP.
13. **`register` (création de compte) n'a PAS de rollback** si la création
    du compte Nextcloud échoue après l'insertion MySQL. Résultat : un
    utilisateur "existe" en base (`users`) mais pas côté Nextcloud —
    connexion possible mais toute opération fichier échoue en boucle
    (401 puis 429 bruteforce). **Bug d'architecture non corrigé** — voir
    `ROADMAP.md` Axe B0, à corriger en priorité (transaction ou vérification
    + suppression automatique en cas d'échec Nextcloud). En attendant, un
    compte fantôme se nettoie à la main :
    ```sql
    DELETE FROM community_resources WHERE uploader_id=(SELECT id FROM users WHERE matricule='X');
    DELETE FROM users WHERE matricule='X';
    ```
    (vérifier les FK dépendantes avant, `community_resources` notamment).
14. **Nextcloud a son propre bruteforce protection** par IP ET par
    username, indépendant de tout ce qu'on configure. Un 401 répété (ex.
    mot de passe périmé) dégénère vite en 429 qui bloque même les requêtes
    ensuite valides. Diagnostic : différencier un vrai 401 (mauvais
    identifiants) d'un 429 (bloqué temporairement) AVANT de conclure. Reset
    ciblé : `occ security:bruteforce:reset <IP>` — mais reset seul ne suffit
    pas si la cause (mauvais mot de passe) n'est pas corrigée : le cycle
    401→429 repart aussitôt.
15. **Après un `docker compose down && up` (recréation complète, pas un
    simple `restart`), les IP internes des conteneurs changent** (nouveau
    réseau Docker) et les règles **NAT iptables** peuvent se désynchroniser
    de l'IP réelle du conteneur — symptôme : `curl` externe donne
    "No route to host" alors que le conteneur répond en interne
    (`docker exec <c> curl localhost` fonctionne). Diagnostic :
    `docker inspect <conteneur> | grep IPAddress` vs
    `iptables -t nat -L DOCKER -n | grep <port>` — si les IP ne
    correspondent pas, faire `docker compose down && up` (pas `restart`)
    sur la stack concernée pour régénérer proprement le NAT.
16. **Le mot de passe admin Nextcloud n'est PAS forcément celui du
    fichier `docker-compose.yml`** (`NEXTCLOUD_ADMIN_PASSWORD`) si
    Nextcloud a déjà été installé une fois avec une autre valeur — la
    variable d'environnement ne s'applique qu'à la création initiale du
    compte. Après une reconstruction de disque, **toujours vérifier en
    CLI** avant de supposer :
    ```bash
    curl -s -H "OCS-APIREQUEST: true" -o /dev/null -w "%{http_code}\n" \
      -u "admin:<mdp_a_tester>" "http://<ip>:8080/ocs/v1.php/cloud/users?format=json"
    ```
    (200 = bon mot de passe ; 401 = faux ; 412 = header OCS manquant, pas
    un souci d'identifiants ; 429 = bruteforce, pas concluant).
17. **Un routeur Express monté sur un préfixe large (`app.use('/api', ...)`)
    intercepte tout ce qui suit ce préfixe, y compris des routes définies
    plus bas dans `index.js`.** Découvert le 2026-09-12 :
    `communityRoutes` monté sur `/api` interceptait `/api/health` définie
    plus bas dans le fichier, renvoyant 401 au lieu du statut attendu.
    Toujours définir les routes "globales" sans auth (`/api/health`) avant
    tout `app.use(...)` de routeur à préfixe large, ou donner à ce dernier
    un préfixe plus spécifique (`/api/community` par exemple, au lieu de
    `/api`). **Corrigé le 2026-09-12** — `/api/health` déplacé avant tous
    les `app.use('/api/...')` dans `index.js`.

---

## 11. Stratégie de sauvegarde (post-incident)

Trois niveaux indépendants, tous actifs :
1. **Git** — dépôt privé GitHub (`VictoireNdala/gougoul-holocron`), commit
   après chaque session de modification. **Validé en conditions réelles** :
   la migration du 2026-09-12 a récupéré le code par simple `git clone`,
   sans reconstruction manuelle (contrairement à l'incident de juillet).
2. **Snapshots ZFS** — sur le pool `Holocron_sith`, à prendre après chaque
   étape stable. Dernier snapshot : `Holocron_sith@systeme-complet-2026-09-12`.
3. **Copie PC ↔ serveur bidirectionnelle** — ne plus se fier au seul push
   SFTP ; vérifier régulièrement que le code serveur redescend vers le PC.

---

## 12. Outils et conventions de travail

- Développement backend/frontend : **Claude Code** dans VS Code (accès
  direct au code local + terminal).
- Réflexion, architecture, stratégie, rédaction de specs : **Claude**
  (conversation).
- Design d'interface : **Claude Design**, piloté par des prompts écrits.
- Déploiement : VS Code + extension SFTP (`remotePath:
  /mnt/Holocron_sith/webapp`, `uploadOnSave: false`) → rebuild Docker côté
  serveur → commit Git. Rester sur l'onglet Shell TrueNAS pendant un build
  long (naviguer ailleurs tue le process en cours, voir incident du
  2026-09-12).
- Travail pas à pas, une commande/tâche validée avant la suivante.
- Ce système de fichiers `.md` (`contexte projet/`) est la mémoire partagée
  entre tous les outils — à tenir à jour à chaque session, en **fusionnant**
  les mises à jour plutôt qu'en écrasant le fichier existant (voir incident
  du 2026-09-12 où une régénération partielle a fait perdre plusieurs jours
  de documentation avant d'être détectée et réparée).
