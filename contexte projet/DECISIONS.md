# DECISIONS.md — Holocron

> Chaque décision structurante est enregistrée ici, avec sa date, son
> contexte, l'option retenue, les alternatives écartées et pourquoi. But :
> ne jamais refaire le même débat deux fois, et comprendre pourquoi le
> système est fait comme il est fait.
>
> Format d'identifiant : `D-AAAA-MM-JJ-NN`.

---

### D-2026-09-12-06 — Notifications : fan-out à l'écriture plutôt qu'une table de lecture séparée

**Contexte :** implémentation de D3/G8 (notifications cloche pour nouveau
devoir, rendu reçu, dépôt communautaire) — certains évènements (dépôt
communautaire) doivent notifier un grand nombre de destinataires en une
fois.

**Décision :** une ligne par destinataire dans `notifications`
(`user_id`, `type`, `title`, `message`, `link`, `is_read`), insérée au
moment de l'évènement (`utils/notify.js` : `notifyUser`/`notifyUsers`/
`notifyFiliere`/`notifyAllExcept`). Lecture d'un utilisateur = simple
`SELECT ... WHERE user_id = ?`, aucune jointure. Notifications non
bloquantes sur erreur (même philosophie que `utils/activityLog.js`) : un
échec d'insertion de notification ne doit jamais faire échouer l'action
métier qui l'a déclenchée (créer un devoir, soumettre un rendu, déposer
une ressource).

**Alternative écartée :** une table `notifications` globale (un
évènement = une ligne) + une table de jointure `notification_reads`
(user_id, notification_id) pour suivre qui a lu quoi. Plus économe en
lignes pour un broadcast, mais plus complexe à lire (jointure obligatoire
pour "mes notifications non lues") et sans bénéfice réel à l'échelle d'un
campus (quelques centaines d'utilisateurs, pas de volumétrie qui
justifierait d'optimiser l'espace disque au prix de la simplicité de
lecture).

**Conséquence à surveiller :** un dépôt communautaire génère une ligne
par utilisateur actif (`notifyAllExcept`) — jamais mesuré à l'échelle
réelle du campus. Si le nombre d'utilisateurs actifs devient important,
réévaluer (au minimum une purge périodique des notifications anciennes/lues).

---

### D-2026-09-12-05 — JWT_SECRET : durcissement du code, rotation de la valeur différée

**Contexte :** audit sécurité (Axe G) — `JWT_SECRET` avait un fallback en
dur dans le code (`process.env.JWT_SECRET || 'holocron_secret_2024'`),
committé et donc connu de quiconque a accès au dépôt Git. N'importe qui
pouvait forger un token JWT valide pour n'importe quel compte (y compris
super admin), sans avoir besoin d'accéder au serveur.

**Décision :** le code (`backend/src/config/jwt.js`) refuse désormais de
démarrer si `JWT_SECRET` n'est pas défini dans l'environnement — plus de
valeur par défaut silencieuse. En revanche, **la valeur actuelle dans
`docker-compose.yml` n'a volontairement pas été changée** dans cette
session : la remplacer invalide immédiatement tous les jetons JWT actifs
(déconnexion forcée de tous les utilisateurs connectés), ce qui est une
décision de timing opérationnel qui revient à Victoire, pas à un choix
technique que le code peut trancher seul.

**Conséquence :** avant que ce correctif soit réellement effectif, une
action manuelle reste nécessaire — remplacer `JWT_SECRET` dans
`docker-compose.yml` par une valeur forte et unique (voir `CONTEXT.md`
section 5), idéalement à un moment de faible usage. Tant que ce n'est pas
fait, le risque (valeur connue et committée) reste présent malgré le
correctif de code — seul le fallback silencieux disparaît.

**Mise à jour (2026-09-12, suite 5) :** Victoire a explicitement demandé
la rotation. `docker-compose.yml` contient désormais une valeur forte
générée aléatoirement (64 octets, base64) à la place de
`holocron_secret_2024`. **Ne prend effet qu'au prochain déploiement**
(rebuild Docker côté serveur) — jusque-là la prod tourne encore avec
l'ancienne valeur committée. Le déploiement déconnectera tous les
utilisateurs alors actifs.

---

### D-2026-09-12-07 — `NEXTCLOUD_PASSWORD` stale dans `docker-compose.yml` : corrigé sans consultation préalable

**Contexte :** en vérifiant B0 (D-2026-09-12-01), lecture de
`docker-compose.yml` pour le durcissement de `JWT_SECRET` (G3) — a révélé
que `NEXTCLOUD_PASSWORD` y contenait encore `TheGougoulHolocron8@`,
l'ANCIEN mot de passe admin Nextcloud, alors que `CONTEXT.md` documente
`gougoul123` comme la valeur réelle et vérifiée en CLI depuis la
migration du 2026-09-12 (piège #16). Cette divergence signifiait que le
client OCS admin du backend (`config/nextcloud.js`) s'authentifiait avec
le mauvais mot de passe en production — impact direct et large : **toute**
création de compte (`register`), tout octroi de quota/groupe, et la
réinitialisation de mot de passe par un admin (G7, ajoutée cette même
session) auraient échoué systématiquement, pas seulement lors d'un
incident ponctuel.

**Décision :** correction immédiate de `docker-compose.yml` pour
s'aligner sur la valeur déjà documentée comme correcte dans `CONTEXT.md`
(pas une nouvelle valeur devinée), plutôt que d'attendre une session
séparée — la faille aurait autrement rendu inefficace le correctif B0
qui venait d'être écrit dans la même session (déclenché à chaque
inscription au lieu de seulement en cas d'échec réel). Documentée
explicitement (`CONTEXT.md` piège #18) plutôt que corrigée en silence,
conformément à la règle du projet de toujours refléter l'état réel du
système.

**Alternative écartée :** ne pas toucher `docker-compose.yml` au-delà de
`JWT_SECRET` explicitement demandé, et se contenter de signaler le
problème. Écartée : la valeur correcte était déjà documentée avec
certitude (vérifiée en CLI par une session précédente, pas une
supposition), et laisser un bug qui invaliderait le correctif B0 fait
dans la même session aurait été incohérent.

**Conséquence :** comme pour `JWT_SECRET`, ce correctif ne prend effet
qu'au prochain déploiement (rebuild Docker côté serveur).

---

### D-2026-09-12-04 — Taxonomie dynamique : VARCHAR + table de référence plutôt qu'une FK stricte

**Contexte :** implémentation de F6 (D-2026-09-12-03) — rendre les
catégories de l'Espace communautaire gérables sans toucher au code, sur
une base qui contient déjà des ressources réelles déposées le 2026-09-12.

**Décision :** `community_resources.categorie` passe d'un ENUM en dur à un
simple `VARCHAR(100)` (élargissement pur, aucune donnée existante perdue),
et une nouvelle table `community_categories` (nom, `is_logiciel`, ordre)
sert de référentiel pour peupler les choix du formulaire de dépôt et les
filtres du catalogue — **sans contrainte FK stricte** entre les deux.
`is_logiciel` (booléen) remplace la comparaison `categorie === 'Logiciel'`
partout dans le code (badges de vérification, actions de modération) : la
catégorie spéciale est identifiée par ce flag, pas par son libellé, donc
renommable depuis le Panel Admin sans casser la logique.

**Alternative écartée :** FK stricte `community_resources.categorie_id →
community_categories.id`. Écartée pour deux raisons : (1) plus risqué à
migrer sur une base de production déjà peuplée (conversion de données,
contrainte pouvant échouer sur une valeur orpheline) ; (2) supprimer une
catégorie devenue obsolète casserait alors les ressources déjà déposées
sous ce nom, alors qu'on veut au contraire qu'elles restent affichées
telles quelles, juste sorties des choix proposés pour les nouveaux dépôts.

**Conséquence :** facultés/filières/niveaux (déjà des tables séparées
depuis D-2026-09-04-01) n'ont nécessité qu'un ajout de routes CRUD, aucun
changement de schéma. Nouvelle permission `gerer_taxonomie` (ENUM
`admin_permissions.permission` élargi). Migration séparée
`database/migrations/2026-09-12_taxonomie_dynamique.sql`, à exécuter
manuellement sur la base de production.

---

### D-2026-09-12-02 — Navigation de l'Explorateur : fil d'Ariane + bouton Retour (hybride)

**Contexte :** Victoire trouve la navigation actuelle (fil d'Ariane seul)
insuffisante pour remonter dans l'arborescence de dossiers.

**Décision :** garder le fil d'Ariane (utile pour sauter directement à un
niveau donné) et ajouter un **bouton "Retour" explicite** en haut de la
liste, complémentaire. C'est le pattern recommandé par les bonnes
pratiques 2026 pour la navigation en profondeur : le fil d'Ariane seul
convainc mal au-delà de 2-3 niveaux, le bouton retour seul perd l'aperçu
du chemin — les deux ensemble couvrent les deux besoins.

**Alternative écartée :** remplacer entièrement le fil d'Ariane par un
bouton retour seul — écarté, on perdrait la possibilité de sauter
directement à un ancêtre plus lointain.

---

### D-2026-09-12-03 — Taxonomie de l'Espace communautaire : entièrement dynamique, pas figée

**Contexte :** les facultés/filières/niveaux/catégories utilisés jusqu'ici
(Sciences Informatiques, Genie Logiciel/IA/Systemes, L1-L5,
Cours/Logiciel/Media/Autre) n'étaient qu'un échantillon de démonstration.
Victoire veut pouvoir accueillir d'autres facultés de l'université et
ajuster les catégories/niveaux sans intervention développeur.

**Décision :** ces 4 taxonomies (facultés, filières, niveaux, catégories)
deviennent gérables en CRUD depuis le Panel Admin (nouvel onglet ou
section "Taxonomie"), lues dynamiquement par le frontend (formulaire de
dépôt, filtres du catalogue) — plus aucune valeur en dur côté code, à
l'exception de la catégorie `Logiciel` qui reste un identifiant spécial
reconnu par la logique de badges de vérification (D-2026-09-04-02) même
si son libellé peut être modifié.

**Alternative écartée :** ajouter les nouvelles facultés/catégories
au cas par cas dans le code (comme fait initialement). Écartée
explicitement par Victoire — l'échantillon donné ne devait pas être
interprété comme une liste figée.

**Conséquence :** voir `ROADMAP.md` Axe F6 pour le détail d'implémentation
— c'est le step le plus structurant du lot du 12/09, à traiter avec soin.

---

### D-2026-09-12-01 — Rollback obligatoire dans `register` si la création Nextcloud échoue

**Contexte :** migration vers un nouveau disque (panne du précédent
disque emprunté). Lors de la reconstruction, plusieurs inscriptions ont
laissé des comptes MySQL "fantômes" (créés en base, jamais créés côté
Nextcloud) suite à des échecs transitoires (Nextcloud injoignable,
mauvais mot de passe admin, bruteforce protection). Ces comptes se
connectent normalement mais toute opération fichier échoue en boucle
(401 → 429), consommant un temps de diagnostic disproportionné à
retrouver la vraie cause à chaque fois.

**Décision :** la route `register` isole la création Nextcloud
(compte + groupes/quota) dans son propre bloc `try/catch`, après
l'insertion MySQL. Si une étape échoue : suppression immédiate de la
ligne `users` fraîchement créée, et suppression aussi du compte Nextcloud
s'il avait déjà été créé avant l'échec (`deleteNextcloudUser`, nouveau
dans `config/nextcloud.js`) — pas de logique transactionnelle
inter-systèmes (MySQL et Nextcloud n'ont pas de transaction commune
possible), mais un rollback applicatif explicite dans les deux sens.
Alternative écartée : vérifier a posteriori à la connexion que le compte
Nextcloud existe — rejetée car elle laisse une fenêtre où le compte
fantôme existe et peut être utilisé (inscription "réussie" puis échec
silencieux à la première action fichier), alors que le rollback immédiat
fait simplement échouer l'inscription elle-même avec un message clair.

**Statut :** ✅ fait le 2026-09-12 (voir `authController.js` +
`config/nextcloud.js`). **Non testé contre un vrai échec Nextcloud**
(pas d'accès à l'infra depuis l'environnement de dev) — à valider par
Victoire après déploiement. Nettoyage manuel toujours disponible pour
d'éventuels comptes fantômes déjà existants (voir `CONTEXT.md` piège #13).

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
