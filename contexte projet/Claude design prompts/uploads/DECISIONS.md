# DECISIONS.md — Holocron

> Chaque décision structurante est enregistrée ici, avec sa date, son
> contexte, l'option retenue, les alternatives écartées et pourquoi. But :
> ne jamais refaire le même débat deux fois, et comprendre pourquoi le
> système est fait comme il est fait.
>
> Format d'identifiant : `D-AAAA-MM-JJ-NN`.

---

### D-2026-07-14-01 — Refonte complète de l'interface, sans s'attacher à l'existant

**Contexte :** après la soutenance, décision de revoir l'expérience
utilisateur de fond en comble plutôt que d'itérer sur l'interface actuelle.

**Décision :** repartir du login jusqu'à la dernière fonctionnalité en
anticipant tout ce qui sera ajouté (espace communautaire, admin, etc.),
sans contrainte de compatibilité avec le design existant.

**Alternative écartée :** itérer progressivement sur le Dashboard actuel
(« Nebula »). Écartée car le projet va gagner plusieurs écrans structurants
(panel admin, espace communautaire) qui n'ont pas d'équivalent dans le
design actuel — repartir de zéro permet une cohérence globale.

**Conséquence :** 3 directions visuelles explorées en parallèle (voir
D-2026-07-14-02), 3 expériences distinctes par rôle (voir D-2026-07-14-03).

---

### D-2026-07-14-02 — Exploration de 3 directions visuelles, mode clair/sombre réversible obligatoire

**Contexte :** choix de l'identité visuelle pour la refonte.

**Décision :** explorer 3 directions distinctes (Aurora, Meridian,
Slate & Citrus), chacune conçue nativement en clair ET sombre avec bascule
réversible — pas un thème unique avec une inversion automatique des
couleurs (source de rendus dégradés selon les retours d'expérience du
secteur).

**Alternatives écartées :**
- Garder le thème sombre unique actuel → écarté, un toggle clair/sombre est
  désormais un standard attendu.
- Un thème unique inversé algorithmiquement pour l'autre mode → écarté,
  produit des rendus de mauvaise qualité (contrastes ratés, halos).

**Conséquence :** chaque direction doit livrer un système de tokens
sémantiques (fond, surface, accent, texte, bordure...) décliné dans les
deux modes dès la conception, pas ajouté après coup.

---

### D-2026-07-14-03 — Trois expériences distinctes par rôle (étudiant / prof-assistant / admin)

**Contexte :** le nombre de fonctionnalités augmente (espace communautaire,
panel admin) ; une interface unique adaptative devient difficile à garder
lisible pour tous les rôles.

**Décision :** concevoir 3 tableaux de bord et navigations distincts par
rôle, plutôt qu'une interface unique qui masque/affiche des éléments selon
le rôle connecté.

**Alternative écartée :** interface unique adaptative (cacher/afficher des
blocs selon le rôle). Écartée : risque de surcharge visuelle et de
confusion à mesure que les fonctionnalités s'ajoutent.

**Conséquence :** la navigation (barre latérale / barre mobile) affiche des
entrées différentes selon le rôle connecté (voir `CONTEXT.md` section 9).

---

### D-2026-07-14-04 — Priorité mobile et desktop à égalité (pas de mobile-first strict)

**Contexte :** les recherches UX 2026 recommandent souvent le mobile-first,
mais l'usage réel du portail (étudiants, profs) varie selon le contexte
(urgence sur mobile, travail de fond sur desktop).

**Décision :** concevoir les deux formats à parts égales, sans sacrifier
l'un pour l'autre.

**Conséquence :** chaque écran produit par Claude Design doit être livré en
version desktop (~1440px) ET mobile (~390px), pas juste adapté après coup.

---

### D-2026-07-14-05 — Le supercalculateur universitaire est mis de côté pour l'instant

**Contexte :** l'université dispose désormais d'un supercalculateur ;
question de savoir si le projet doit y migrer.

**Décision :** terminer entièrement le système sur l'infrastructure
actuelle (Dell OptiPlex + TrueNAS + Nextcloud) avant d'envisager toute
migration. La migration sera un chantier séparé, traité le moment venu.

**Raison :** l'architecture optimale dépend fortement de la cible
(permissions disponibles sur le HPC, possibilité d'un service permanent,
gestionnaire de ressources en place — informations non réunies à ce jour).
Refondre l'architecture avant de connaître ces contraintes serait un travail
possiblement jeté. Un système fini se migre mieux qu'un système inachevé.

**Conséquence :** `ROADMAP.md` classe ce chantier "entre parenthèses" — ne
pas s'y engager sans décision explicite ultérieure.

---

### D-2026-07-14-06 — Adoption d'un système de fichiers `.md` comme mémoire partagée

**Contexte :** besoin de coordonner le travail entre Claude (stratégie),
Claude Code (build/debug) et Claude Design (UI), sans perdre le fil d'une
session à l'autre.

**Décision :** créer `docs/CONTEXT.md`, `docs/ROADMAP.md`, `docs/JOURNAL.md`,
`docs/DECISIONS.md` et `CLAUDE.md` à la racine du dépôt, versionnés avec
Git, mis à jour à chaque session significative.

**Conséquence :** avant toute tâche, Claude Code doit lire `CLAUDE.md` (qui
pointe vers les autres fichiers). Toute décision structurante future doit
être ajoutée ici, tout changement d'état à `ROADMAP.md`, tout résumé de
session à `JOURNAL.md`.

---

### D-2026-09-04-01 — Espace communautaire : classification à 3 facettes combinables

**Contexte :** les ressources déposées doivent être retrouvables par faculté,
niveau et catégorie, y compris celles qui ne relèvent d'aucune faculté
précise.

**Décision :** classification **facettée** (Faculté / Niveau / Catégorie),
chaque facette filtrable indépendamment et combinable, plutôt qu'une
arborescence de dossiers imbriqués. "Général — toutes facultés" et "Tous
niveaux" sont des valeurs explicites et visibles dans les filtres, pas des
champs vides.

**Alternative écartée :** arborescence Faculté → Niveau → Catégorie en
dossiers imbriqués. Écartée : échoue dès qu'une ressource est transverse
(ex. un logiciel utile à toutes les facultés) ou multi-niveaux.

---

### D-2026-09-04-02 — Espace communautaire : post-modération avec badges de vérification pour les logiciels

**Contexte :** équilibrer fluidité des dépôts et sécurité, en particulier
pour les fichiers exécutables (catégorie Logiciel).

**Décision :** **post-modération** — tout dépôt est visible et
téléchargeable immédiatement. Uniquement pour la catégorie Logiciel, un
badge de statut s'applique : `non_verifie` (défaut) / `verifie` (testé et
approuvé par un admin) / `dangereux` (testé et rejeté par un admin — fichier
alors dépublié du téléchargement mais reste visible avec l'alerte). Aucun
badge pour Cours/Média/Autre.

**Alternative écartée :** pré-modération (caché jusqu'à validation admin).
Écartée : dépend de la disponibilité régulière d'un admin, risque de
décourager les dépôts spontanés.

---

### D-2026-09-04-03 — Espace communautaire : quota séparé des quotas personnels

**Décision :** les dépôts dans l'espace communautaire ne consomment pas le
quota personnel de l'utilisateur (2/10/5 Go selon rôle) — quota dédié et
global à l'espace communautaire.

**Raison :** un quota personnel partagé aurait dissuadé les dépôts (chacun
"sacrifierait" son propre espace pour contribuer collectivement).

---

### D-2026-09-04-04 — Espace communautaire : image de couverture manuelle avec repli automatique

**Décision :** chaque ressource peut recevoir une image de couverture
ajoutée manuellement par le déposant à l'upload (facultatif). En son
absence, une "affiche" générée automatiquement (dégradé + icône de
catégorie) s'affiche à la place — jamais de vignette vide.

**Raison :** Nextcloud ne peut générer d'aperçu automatique que pour
certains types (images, PDF avec les providers activés) ; les logiciels et
archives n'ont pas de rendu visuel naturel. L'upload manuel comble ce vide
sans bloquer le dépôt si l'utilisateur ne fournit rien.

---

### D-2026-09-04-05 — Panel Admin : deux niveaux (super admin / admin simple) avec permissions a la carte

**Contexte :** Victoire (compte etudiant) doit administrer le systeme et
pouvoir deleguer certaines taches (ex. verification des logiciels deposes)
sans donner un acces total.

**Decision :** pas de role `admin` separe — un champ `is_admin` (bool) +
`admin_level` (`super`/`simple`) sur `users`. Un **super admin** a tous les
droits implicitement. Un **admin simple** recoit des permissions
individuelles, choisies une a une par un super admin :
`verifier_logiciels`, `moderer_communautaire`, `gerer_matricules`,
`gerer_utilisateurs`, `gerer_dossiers`, `voir_logs`. Un super admin peut
aussi **promouvoir** un admin simple (ou tout utilisateur) directement au
rang super admin — action reservee aux super admins, journalisee.

```
users : + is_admin (bool), admin_level (super|simple, nullable)
admin_permissions : id, user_id, permission, granted_by, granted_at
```

Flux d'attribution : le super admin recherche un utilisateur (nom/matricule)
puis coche les permissions a accorder — pas de formulaire de creation de
compte separe, ca s'applique a un compte existant.

**Alternative ecartee :** role `admin` unique et binaire. Ecartee : Victoire
veut deleguer des taches precises (ex. a Ortega) sans donner acces a tout
(matricules, utilisateurs...).

---

### D-2026-09-04-06 — Dossiers prioritaires : un badge sur un dossier normal, pas un type separe

**Decision :** un "dossier prioritaire" (ex. Informatique > Genie Logiciel >
L2, cree a l'avance par un admin ayant la permission `gerer_dossiers`) est
techniquement un dossier normal avec un marqueur `is_priority = true`. Il
s'affiche avec un badge visuel distinctif et remonte en tete du catalogue,
mais suit la meme mecanique de classification a facettes (D-2026-09-04-01)
que les regroupements dynamiques.

```
community_priority_folders : id, faculty_id, filiere_id (nullable),
  level_id (nullable), is_priority (bool default true), created_by, created_at
faculty_filieres : id, faculty_id, nom
```

**Raison :** evite de dupliquer la logique de filtrage/affichage pour un
"type" de dossier different — c'est un attribut, pas une nouvelle entite.

---

### D-2026-09-04-07 — Journal d'activite (tracabilite)

**Decision :** table `activity_logs` (id, user_id, action, cible_type,
cible_id, details, created_at) enregistrant au minimum : upload, download,
delete, verifier_logiciel, marquer_dangereux, attribution/retrait de
permission admin, promotion super admin. Ecran admin dedie (permission
`voir_logs`), filtrable par utilisateur / type d'action / periode.

**Raison :** repond au besoin explicite de tracabilite ("qui a uploade
quoi, quand") et audite les actions sensibles (gestion des droits admin).

---

## Décisions antérieures (architecture v2, résumées)

### D-2026-07-03-01 — Data-root Docker déplacé sur le pool ZFS du projet

**Contexte :** TrueNAS régénère `/etc/docker/daemon.json` à chaque boot,
écrasant toute configuration personnalisée et faisant perdre les conteneurs.

**Décision :** patcher `daemon.json` via un script (`holocron-boot.sh`)
enregistré en POSTINIT, forçant `data-root` sur
`/mnt/Holocron_sith/docker-data` et `storage-driver: overlay2`, en
préservant le reste de la configuration TrueNAS (IPv6, cgroups) via `jq`
plutôt que d'écraser le fichier.

**Alternative écartée :** driver `vfs` et systemd drop-ins
(`vfs-patch.conf`, `holocron.service`) — anciens correctifs explicitement
abandonnés, à ne jamais recréer.

---

### D-2026-07-12-01 — WebDAV per-user plutôt qu'un client admin unique

**Contexte :** Nextcloud 33 interdit l'écriture cross-user par le compte
administrateur.

**Décision :** chaque opération sur les fichiers utilise les identifiants
propres de l'utilisateur connecté (`userWebdav(req)`), nécessitant de
stocker un mot de passe applicatif en clair (`nc_password`) en base.

**Conséquence acceptée :** compromis de sécurité assumé pour ce contexte de
campus fermé — à réévaluer si le système s'ouvre au-delà du réseau local.

---

### D-2026-07-12-02 — Téléchargement des rendus par lecture disque directe

**Contexte :** même restriction Nextcloud 33 empêche un professeur de lire
via WebDAV les fichiers déposés par un étudiant.

**Décision :** le backend monte les données Nextcloud en lecture seule
(`/nextcloud-data:ro`) et lit directement sur disque pour servir le
téléchargement d'un rendu à un professeur/assistant.
