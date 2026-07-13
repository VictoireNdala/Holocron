# Gougoul Holocron — Reconstruction complète & redéploiement

> Généré le 13 juillet 2026, après la perte irréversible du disque 1 To
> (Seagate ST31000524AS). Ce dossier est la reconstruction du code à son
> **état du 12 juillet 2026**, à partir de trois sources : le zip de juin (base
> inchangée), les fichiers d'état des 3 et 12 juillet, et l'historique des
> sessions (fragments de code récupérés verbatim).

---

## 1. Ce qui s'est passé

Le disque de stockage 1 To est **mort** (ne tourne même plus). Le pool ZFS
`Holocron_sith` vivait dessus, sans redondance. Le workflow SFTP était
**unidirectionnel** (push PC → serveur uniquement) : environ six semaines de
développement faites directement dans le Shell du serveur ne sont jamais
redescendues sur le PC. Le zip de sauvegarde s'est donc révélé être un
instantané figé au **3-4 juin**.

**Conséquence** : ce n'était pas que des comptes de test qui manquaient, mais
du **code source** : tout le module Submissions, les corrections de juillet, la
config d'infrastructure v2. Ce dossier reconstruit tout cela.

---

## 2. Inventaire de la reconstruction (provenance de chaque fichier)

Légende : **[BASE]** repris tel quel du zip de juin (fonctionnel, inchangé) ·
**[SPEC]** reconstruit d'après les fichiers d'état + fragments récupérés ·
**[FIX]** base de juin corrigée pour l'état du 12 juillet · **[NEUF]** créé de
zéro (n'existait plus nulle part).

### Backend
| Fichier | Provenance | Notes |
|---|---|---|
| `backend/Dockerfile` | [BASE] | inchangé |
| `backend/package.json` | [BASE] | contient déjà `multer` |
| `src/config/db.js` | [BASE] | pool mysql2 |
| `src/config/nextcloud.js` | [BASE] | client OCS admin (create/group/quota) |
| `src/index.js` | [FIX] | enregistre `/api/submissions` |
| `src/middleware/authMiddleware.js` | [FIX] | récupère `nc_password`+`filiere` en BDD → `req.user` |
| `src/controllers/authController.js` | [FIX] | `verifyMatricule` → table `matricules` ; `register` stocke `nc_password` ; quotas **2 / 10 / 5 Go** |
| `src/controllers/fileController.js` | [SPEC] | `userWebdav(req)` per-user ; `getQuota` (OCS) ; `getSharedFolders` |
| `src/controllers/submissionController.js` | [NEUF/SPEC] | 6 handlers ; download prof = lecture disque directe |
| `src/routes/auth.js` | [BASE] | `verify-matricule` reste **GET /:matricule** |
| `src/routes/files.js` | [FIX] | ajout `/quota` et `/shared` |
| `src/routes/users.js` | [FIX] | `/profile` SELECT inclut **`matricule`** ; ajout `/stats` |
| `src/routes/submissions.js` | [NEUF/SPEC] | 6 routes (partiellement récupéré verbatim) |

### Base de données
| Fichier | Provenance | Notes |
|---|---|---|
| `database/init.sql` | [FIX] | colonne `nc_password` ; tables `assignments` + `submissions` ; seed test **+ promo réelle** |

### Frontend
| Fichier | Provenance | Notes |
|---|---|---|
| `src/context/AuthContext.jsx` | [FIX] | **déplacé** de `services/` → `context/` (les imports pointaient là ; c'était cassé dans le zip) |
| `src/services/api.js` | [FIX] | ajout `getQuota`, `getStats`, `getSharedFolders` + 6 fonctions submissions |
| `src/pages/Dashboard.jsx` | [SPEC] | module Submissions **réel** (étudiant + prof), quota/stats réels, IA honnête, fausse vitesse retirée, settings depuis `profile` (vrai matricule) |
| `src/App.jsx`, `Home.jsx`, `index.css`, `index.js` | [BASE] | inchangés |
| `src/pages/Login.jsx`, `Register.jsx` | [BASE] | inchangés (voir §3) |

### Infrastructure
| Fichier | Provenance | Notes |
|---|---|---|
| `docker-compose.yml` (webapp) | [FIX] | bind-mount `mysql-data` + montage RO `/nextcloud-data` |
| `nexcloud/docker-compose.yml` | [NEUF/SPEC] | `nextcloud:33` épinglé + Postgres + Redis + bind-mounts |
| `holocron-boot.sh` | [NEUF/SPEC] | patch `daemon.json` (overlay2 + data-root pool) + `up` des 2 stacks |

Tout le code a été validé syntaxiquement (backend : `node --check` OK sur 11
fichiers ; frontend : Babel OK sur 6 fichiers).

---

## 3. Détails reconstruits « au jugé » — À VÉRIFIER

Ces points n'étaient récupérables nulle part de façon certaine. Ils sont
fonctionnels, mais vérifie-les :

1. **Mot de passe Postgres du stack Nextcloud** = `nextcloud_secret_2024`
   (dans `nexcloud/docker-compose.yml`). Comme le disque est neuf, Nextcloud
   sera **réinstallé de zéro** : cette valeur devient la nouvelle vérité, aucun
   conflit possible. Garde-la telle quelle.
2. **Découpage nom / prénom de la promo réelle** dans `init.sql` : j'ai appliqué
   la convention « prénom en dernier » (ex. `Ndala Mwenze` / `Victoire`).
   Ajuste si l'état civil officiel diffère.
3. **Cartes « Vos dossiers partagés » du Dashboard** : restées en données
   statiques (`SHARED_FOLDERS` / `COURSE_FOLDERS`). C'était encore le cas au
   12 juillet — l'endpoint réel `getSharedFolders` existe côté backend mais
   n'était pas encore branché à ces cartes. Fidèle à l'état réel.
4. **`RECENT_FILES`** (Ressources Récentes) : idem, encore statique au 12 juillet.

---

## 4. Redéploiement complet sur un disque NEUF

> Important : disque neuf = **Nextcloud vierge**. Aucun utilisateur, aucun
> groupe, aucun Team Folder ne survit. Il faut tout recréer (étapes C et E).
> On travaille **une commande à la fois**, comme d'habitude.

### A. Disque + pool ZFS (avec redondance cette fois)
1. Installer le(s) nouveau(x) disque(s). **Recommandé : deux disques en miroir**
   (`mirror`) — c'est la leçon de cette panne.
2. TrueNAS → Storage → Create Pool, nom **exact** `Holocron_sith`, topologie
   `mirror` si deux disques.
3. Recréer l'arborescence :
   ```bash
   mkdir -p /mnt/Holocron_sith/webapp /mnt/Holocron_sith/nexcloud /mnt/Holocron_sith/docker-data
   ```
4. Copier ce dossier reconstruit dans `/mnt/Holocron_sith/webapp/` et le
   `nexcloud/docker-compose.yml` dans `/mnt/Holocron_sith/nexcloud/`, puis
   `holocron-boot.sh` à la racine du pool. Corriger les droits SFTP :
   ```bash
   sudo chown -R truenas_admin:truenas_admin /mnt/Holocron_sith/webapp
   ```

### B. Docker data-root + script de démarrage (architecture v2)
1. Copier `holocron-boot.sh` dans `/mnt/Holocron_sith/`, le rendre exécutable :
   `chmod +x /mnt/Holocron_sith/holocron-boot.sh`.
2. TrueNAS → **System → Advanced Settings → Init/Shutdown Scripts → Add** :
   - Type = **Script**, Script = `/mnt/Holocron_sith/holocron-boot.sh`
   - When = **POST INIT**, Timeout = **600**, Enabled = coché.
3. **Ne jamais** recréer les anciens correctifs supprimés (`vfs-patch.conf`,
   `holocron.service`) ni repasser en driver `vfs`.
4. Lancer le script une première fois à la main pour valider :
   `bash /mnt/Holocron_sith/holocron-boot.sh` puis lire `/mnt/Holocron_sith/boot.log`.
   `docker info` doit montrer `Storage Driver: overlay2` et
   `Docker Root Dir: /mnt/Holocron_sith/docker-data`.

### C. Stack Nextcloud (FRESH) — puis reconstruire groupes & Team Folders
1. Démarrer : `cd /mnt/Holocron_sith/nexcloud && docker compose up -d`.
   L'install auto crée l'admin `admin` / `gougoul123` (attendre ~1 min).
2. Vérifier l'accès : `http://192.168.1.4:8080` (login admin).
3. **Recréer les groupes** (Nextcloud → Users → groupes, ou en `occ`) :
   - Rôles : `Etudiants`, `Professeurs`, `Assistants`
   - Filières (noms **exacts**, = colonne `filiere` de `init.sql`) :
     `Genie Logiciel`, `Intelligence Artificielle`, `Systemes Informatiques`
   ```bash
   for g in Etudiants Professeurs Assistants "Genie Logiciel" "Intelligence Artificielle" "Systemes Informatiques"; do
     docker exec -u www-data $(docker ps -qf name=nextcloud) php occ group:add "$g"
   done
   ```
4. **Installer/activer l'app Team Folders (groupfolders)** :
   ```bash
   docker exec -u www-data $(docker ps -qf name=nextcloud) php occ app:install groupfolders
   docker exec -u www-data $(docker ps -qf name=nextcloud) php occ app:enable  groupfolders
   ```
5. **Recréer les Team Folders** `Cours-Informatique`, `Cours-Medecine`,
   `Cours-Droit`, `Cours-Architecture` (Nextcloud → Team folders) et les
   assigner aux groupes voulus avec les permissions. (Ce sont ces dossiers que
   `getSharedFolders` détecte via le préfixe `Cours-`.)

### D. Stack Webapp
1. Démarrer : `cd /mnt/Holocron_sith/webapp && docker compose up -d --build`.
   MySQL applique `init.sql` (data dir vide) → tables + matricules seed.
2. Vérifier : `curl http://192.168.1.4:5000/api/health` → `{"status":"OK"...}`.
3. Vérifier le montage RO du backend :
   `docker exec $(docker ps -qf name=webapp-backend) ls /nextcloud-data`
   doit lister les dossiers utilisateurs (nécessaire au download prof).

### E. Créer les comptes via le PORTAIL (pas à la main)
Le portail (`http://192.168.1.4:3000`) fait tout automatiquement à l'inscription
(compte MySQL + compte Nextcloud + groupe + quota + `nc_password`). **Toujours
passer par là**, jamais par un INSERT direct — sinon `nc_password` manque et le
WebDAV per-user casse.
- Inscrire d'abord un **prof/assistant** (ex. Ortega `ASS-2024004`) pour tester
  la vue prof, puis quelques étudiants.

---

## 5. Identifiants (tous)

| Service | Identifiant | Mot de passe |
|---|---|---|
| Nextcloud admin | `admin` | `gougoul123` |
| MySQL app | `academic_user` | `academic1234` (db `academic_nas`) |
| MySQL root | `root` | `root1234` |
| Postgres (Nextcloud) | `nextcloud` | `nextcloud_secret_2024` *(reconstruit)* |
| JWT secret | — | `holocron_secret_2024` |
| Serveur | `truenas_admin` @ `192.168.1.4` | (ta clé SSH) |

**Matricules de test** : `ETU-2024-001/002/003`, `PRO-2024-001/002`, `ASS-2024-001`.
**Promo réelle** : `ETU-20244936` (Victoire), `ETU-20244401`, `ETU-20244052`,
`ETU-20244721`, `ETU-20243959`, `PRO-2024001` (Doyen Bagula), `ASS-2024001`→`005`.

---

## 6. Pièges connus (ne pas se refaire avoir)

- **TrueNAS régénère `/etc/docker/daemon.json` à chaque boot** → c'est le rôle
  du script POSTINIT d'écrire notre version EN DERNIER. Ne jamais compter sur un
  daemon.json « qui tient » sans le script.
- **Bug récurrent `verifyMatricule`** : doit interroger `matricules`, jamais
  `users`. Re-vérifier après tout resync. (Corrigé ici.)
- **Bug matricule « — »** : la route inline `/profile` de `routes/users.js` doit
  inclure `matricule` dans son SELECT. (Corrigé ici.)
- **`nc_password`** : indispensable au WebDAV per-user (Nextcloud 33 bloque
  l'écriture cross-user par l'admin). Stocké en clair, alimenté à l'inscription.
- **Download prof des soumissions** : lecture **directe sur disque** via le
  montage `/nextcloud-data:ro`, PAS via WebDAV admin. Le montage doit exister.
- **Ne jamais faire confiance aux lettres de disque** (`sda`/`sdb` permutent) :
  raisonner par modèle / partuuid.
- **Épingler `nextcloud:33`** (jamais `:stable`) pour éviter les mismatches.
- **Fichiers créés en root via Shell** → `chown -R truenas_admin` pour le SFTP.

---

## 7. Nouvelle stratégie de sauvegarde (pour que ça n'arrive PLUS)

La cause racine, c'était : disque unique **sans redondance** + SFTP **push-only**.
Les deux se corrigent :

1. **Miroir ZFS** (`mirror`) : deux disques, la panne d'un seul ne perd rien.
2. **SFTP bidirectionnel** : configurer VS Code SFTP pour **sync down**
   régulièrement, ou faire un `git pull`/`scp` du serveur vers le PC après chaque
   session serveur. Le code du serveur doit toujours revenir sur le PC.
3. **Git** : mettre `webapp/` (hors `node_modules`) sous Git, commit après
   chaque session. C'est LA vraie sauvegarde du code.
4. **Snapshots ZFS** planifiés sur `Holocron_sith` (quotidiens) + rétention.
5. **Copie externe** périodique du pool (ou au moins de `webapp/` + dump MySQL +
   `nexcloud/data`) sur un support hors machine.

---

## 8. Ce qui restait « en chantier » au 12 juillet (roadmap, non implémenté)

Fidèle à l'état réel — **pas** ajouté silencieusement :
- Suppression équilibrée (l'étudiant supprime ses propres fichiers ; la route
  `DELETE /files` est encore réservée prof/assistant).
- API de changement de mot de passe (l'UI existe, le backend est à faire).
- Branchement des vrais Team Folders de filière aux cartes du dashboard.
- Annulation d'upload / corbeille.
- Assistant IA local (Ollama) — gardé « entre parenthèses ».
