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
> depuis "Gougoul Holocron" le 2026-09-04). Quelques identifiants
> **techniques** créés avant ce renommage contiennent encore l'ancien nom
> et ne doivent PAS être renommés dans le code sans effectuer le changement
> réel correspondant côté serveur/GitHub : le mot de passe admin Nextcloud
> `TheGougoulHolocron8@` (section 5) et le dépôt GitHub
> `VictoireNdala/gougoul-holocron` (section 11). Renommer ces chaînes dans
> les fichiers sans changer la vraie ressource casserait la connexion.

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
  Moteur de stockage invisible, Team Folders (cours partagés)
  + PostgreSQL + Redis
        │
        ▼
COUCHE 2 — TrueNAS SCALE + ZFS
  Pool "Holocron_sith", Docker (overlay2), snapshots
        │
        ▼
COUCHE 1 — Matériel reconditionné
  Dell OptiPlex 9020, i5-4670, 8 Go RAM, disques SATA
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
| `users` | Comptes inscrits (+ `nc_password` en clair, requis pour le WebDAV per-user) |
| `sessions` | Jetons JWT actifs |
| `assignments` | Devoirs créés par profs/assistants |
| `submissions` | Rendus déposés par les étudiants |

Filières valides (chaînes exactes utilisées partout — DB, groupes Nextcloud,
frontend) : `Genie Logiciel`, `Intelligence Artificielle`,
`Systemes Informatiques`.

Rôles valides : `etudiant`, `professeur`, `assistant`. Quotas par rôle :
étudiant 2 Go, professeur 10 Go, assistant 5 Go.

**Espace communautaire** (conception validée le 2026-09-04, implémentation
pas encore commencée) — tables supplémentaires :

| Table | Rôle |
|---|---|
| `faculties` | Liste des facultés (id, nom) — extensible par l'admin |
| `levels` | Niveaux (id, nom, ordre) — L1 à L5, reutilisables entre facultés |
| `community_resources` | id, titre, description, categorie (Cours/Logiciel/Media/Autre), faculty_id (nullable = "Général/toutes facultés"), level_id (nullable = "Tous niveaux"), cover_image_path (upload manuel, facultatif), fichier_path, fichier_nom, taille, uploader_id, downloads_count, verification_status (non_concerne/non_verifie/verifie/dangereux), verified_by, verified_at, status (visible/masque), created_at |

Classification par **3 facettes combinables** (Faculté / Niveau / Catégorie),
pas de dossiers imbriqués — voir DECISIONS.md D-2026-09-04-01. Quota de
l'espace communautaire **séparé** des quotas personnels des utilisateurs.
Stockage physique : Team Folder Nextcloud dédié `Communautaire`, écriture
ouverte à tous les rôles, sous-dossiers par catégorie
(`/Communautaire/{Cours|Logiciels|Medias|Autre}/{resource_id}_{nom}`).

**Panel Admin avancé** (conception validée le 2026-09-04, implémentation pas
encore commencée) — tables supplémentaires :

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
`gerer_dossiers`, `voir_logs`. Voir DECISIONS.md D-2026-09-04-05/06/07 et
`ROADMAP.md` axe D2 pour les endpoints prévus.

---

## 5. Comptes et identifiants actuels

| Service | Identifiant | Mot de passe / valeur |
|---|---|---|
| Nextcloud admin | `admin` | `TheGougoulHolocron8@` |
| MySQL app | `academic_user` | `academic1234` (base `academic_nas`) |
| MySQL root | `root` | `root1234` |
| Postgres (Nextcloud) | `nextcloud` | `nextcloud123` |
| JWT secret | — | `holocron_secret_2024` |
| SSH serveur | `truenas_admin` @ `192.168.1.4` | clé SSH (`~/.ssh/id_ed25519`) |

> ⚠️ Si un identifiant change, mettre à jour cette table immédiatement.

---

## 6. Groupes et Team Folders Nextcloud

Groupes créés : `Etudiants`, `Professeurs`, `Assistants`, `Genie Logiciel`,
`Intelligence Artificielle`, `Systemes Informatiques`.

Team Folders (dossiers de cours partagés) :
| Dossier | ID | Groupe filière | Profs/Assistants |
|---|---|---|---|
| Cours-Genie-Logiciel | 1 | `Genie Logiciel: read` | `Professeurs/Assistants: read, write` |
| Cours-Intelligence-Artificielle | 2 | idem | idem |
| Cours-Systemes-Informatiques | 3 | idem | idem |

Règle de permission : **étudiants en lecture seule, profs/assistants en
lecture + écriture**, sur les 3 dossiers.

Les fichiers de bienvenue Nextcloud (skeleton) sont **désactivés**
(`skeletondirectory` vidé) — les nouveaux comptes démarrent avec un espace vide.

---

## 7. Fonctionnalités déjà implémentées et validées

- Inscription par matricule → attribution auto du rôle/filière/quota,
  création du compte MySQL + Nextcloud + groupe.
- Connexion (JWT), déconnexion.
- Explorateur de fichiers personnel (liste, upload avec progression et
  **annulation** via AbortController, download, créer dossier, supprimer).
- Module Soumissions complet : création de devoir (prof/assistant), dépôt
  (étudiant), consultation + téléchargement des rendus (prof/assistant, via
  lecture disque directe en lecture seule).
- Dossiers de cours partagés par filière avec permissions différenciées.
- Dashboard avec quota réel, stats réelles, dossiers partagés réels.
- Interface responsive (empilement mobile sous 768px).
- Sauvegarde : dépôt Git privé sur GitHub, snapshots ZFS, script de
  démarrage automatique (`holocron-boot.sh`) enregistré en POSTINIT TrueNAS.

## 8. Fonctionnalités PAS encore implémentées (à faire)

Voir le détail et l'ordre dans `ROADMAP.md`. Liste de référence :
- Corbeille (API trashbin Nextcloud)
- Suppression équilibrée (étudiant supprime ses propres fichiers uniquement)
- API de changement de mot de passe (le formulaire existe déjà, pas branché)
- Téléchargement direct des gros fichiers (perf, éviter le passage par le backend)
- Interface d'administration web (panel admin)
- Espace libre communautaire (dépôt ouvert : cours, logiciels, médias)
- Notifications (cloche), page stockage dédiée
- Nom de domaine local (`holocron.local`)
- Redondance renforcée (miroir ZFS, snapshots planifiés, SMART)
- *(entre parenthèses, long terme)* Assistant IA local (Ollama)
- *(entre parenthèses, long terme)* Migration vers le supercalculateur universitaire

## 9. Refonte d'interface en cours

Une refonte complète de l'interface (login → toutes les fonctionnalités) est
en cours via Claude Design, indépendamment du code existant. Trois
directions visuelles explorées : **Aurora** (calme/premium), **Meridian**
(institutionnel/sérieux), **Slate & Citrus** (épuré/pro 2026). Chaque
direction supporte un mode clair ET sombre réversible. Voir
`Prompts_ClaudeDesign_3_Directions.md` pour les prompts, et la section
« Direction visuelle retenue » ci-dessous une fois le choix fait.

**Direction visuelle retenue :** **Slate & Citrus** — fond gris vrai (`#0B0B0C`
sombre / `#FAFAFA` clair), surfaces sans bordure (élévation par luminosité
uniquement), un seul accent citron `#C4F042` utilisé avec parcimonie (actions
principales, indicateurs actifs), typographie minimaliste (Inter), coins
arrondis discrets. Validée sur : dashboard étudiant, connexion (flux 3 étapes
par matricule), explorateur de fichiers (avec upload + annulation), panel
admin (table utilisateurs), paramètres (profil + mot de passe). Restent à
compléter en cette même direction : Soumissions (étudiant + prof), Cours
partagés, Corbeille, dashboards Professeur/Admin, toutes les versions mobile
(390px), et les états chargement/vide/erreur — voir
`Prompt_Completion_Slate_Citrus.md`.

**Architecture d'information retenue :** 3 expériences distinctes par rôle
(étudiant / professeur-assistant / admin), navigation adaptative (barre
latérale desktop, barre inférieure + menu mobile). Priorité mobile et
desktop à égalité (pas de mobile-first strict).

**Avancement par écran (Slate & Citrus, desktop 1440px, clair+sombre) :**
- ✅ Fait : Dashboard étudiant, Connexion, Explorateur, Panel Admin,
  Paramètres, le module complet **Espace communautaire** (Catalogue,
  Fiche détail, Formulaire de dépôt, Modération admin), et les **3 onglets
  Panel Admin avancé** (Administrateurs, Dossiers prioritaires, Journaux
  d'activité — voir DECISIONS.md D-2026-09-04-05/06/07).
- ⬜ Pas fait : Soumissions (étudiant + prof), Cours partagés, Corbeille
  (existent seulement en Meridian — prompt de complétion déjà écrit,
  `Prompt_Completion_Slate_Citrus.md`, pas encore relancé), dashboards
  Professeur et Admin, **toutes les versions mobile (390px)**, états
  chargement/vide/erreur sur l'ensemble des écrans.
- Bug de nav corrigé : entrée "Administration" dédiée dans la barre
  latérale (ne surligne plus "Paramètres" par erreur).

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

---

## 11. Stratégie de sauvegarde (post-incident)

Trois niveaux indépendants, tous actifs :
1. **Git** — dépôt privé GitHub (`VictoireNdala/gougoul-holocron`), commit
   après chaque session de modification.
2. **Snapshots ZFS** — sur le pool `Holocron_sith`, à prendre après chaque
   étape stable.
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
  serveur → commit Git.
- Travail pas à pas, une commande/tâche validée avant la suivante.
- Ce système de fichiers `.md` (`docs/`) est la mémoire partagée entre tous
  les outils — à tenir à jour à chaque session.
