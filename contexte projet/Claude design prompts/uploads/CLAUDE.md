# CLAUDE.md

> Instructions pour Claude Code travaillant sur le projet Holocron.
> Lu automatiquement au démarrage d'une session dans ce dépôt.

## Avant de commencer toute tâche

1. Lis `docs/CONTEXT.md` en entier — c'est l'état réel du système
   (architecture, identifiants, modèle de données, pièges connus).
2. Lis `docs/ROADMAP.md` section 0 ("Zones de responsabilité") — c'est ta
   zone (🟢 Claude Code) que tu dois tenir à jour toi-même, à chaque
   session : ce que tu as fait, ce que tu comptes faire, ce que tu attends
   des autres agents. Ne laisse jamais ta zone vide ou périmée.
3. Consulte le reste de `docs/ROADMAP.md` pour savoir quel step est en
   cours ou à prendre ensuite. Ne pas travailler sur un step qui n'y figure
   pas sans demander confirmation à Victoire.
4. Si une décision d'architecture doit être prise (pas juste un détail
   d'implémentation), consulte `docs/DECISIONS.md` pour voir si elle a déjà
   été tranchée, et si tu en actes une nouvelle, propose de l'y ajouter.

## Pendant le travail

- **Une tâche à la fois.** Termine et fais valider un step de
  `ROADMAP.md` avant d'en attaquer un autre, sauf instruction contraire
  explicite de Victoire.
- **Respecte les pièges connus** listés dans `CONTEXT.md` section 10 — en
  particulier : jamais de `vfs`, jamais d'édition permanente de
  `daemon.json` hors du script de boot, `verifyMatricule` doit toujours
  interroger `matricules`, le WebDAV est toujours per-user (jamais un
  client admin unique pour les opérations sur fichiers).
- **N'invente pas de valeurs.** Identifiants, chemins, noms de filières,
  ports : toujours ceux de `CONTEXT.md`. Si une valeur nécessaire n'y est
  pas, demande plutôt que de supposer.
- **Cohérence de nommage.** Filières exactement : `Genie Logiciel`,
  `Intelligence Artificielle`, `Systemes Informatiques` (sans accents,
  identiques en base, dans les groupes Nextcloud et dans le frontend).
  Rôles : `etudiant`, `professeur`, `assistant`.
- **Valide avant de livrer.** Backend : `node --check` sur chaque fichier
  modifié. Frontend : vérifier que le JSX est syntaxiquement valide avant
  de considérer une tâche terminée.
- **Ne casse pas ce qui marche.** Le système actuel est déployé et validé
  en production (voir `docs/JOURNAL.md` du 2026-07-13). Toute modification
  d'un fichier existant doit préserver le comportement déjà validé, sauf
  si le step en cours demande explicitement de le changer.

## Après une tâche significative

- Mets à jour **ta zone** dans `docs/ROADMAP.md` section 0 (Fait / À faire /
  Attend des autres) — c'est la première chose à faire, avant même de
  cocher un step individuel.
- Mets à jour `docs/ROADMAP.md` : coche le step terminé (✅) ou fais
  avancer son statut (🔶 en cours).
- Ajoute une entrée dans `docs/JOURNAL.md` (date du jour si elle n'existe
  pas encore, sinon complète l'entrée existante) : ce qui a été fait, ce
  qui a changé, ce qui reste en suspens.
- Si un identifiant, un chemin ou un comportement décrit dans
  `docs/CONTEXT.md` a changé, mets ce fichier à jour dans la même session.
- Si une décision d'architecture a été prise en cours de route, ajoute-la
  à `docs/DECISIONS.md` avec un identifiant `D-AAAA-MM-JJ-NN`.

## Déploiement

Le déploiement ne se fait PAS automatiquement par Claude Code. Une fois le
code modifié et validé localement :
1. Le transfert vers le serveur (`/mnt/Holocron_sith/webapp/`) se fait via
   SFTP (VS Code) ou selon les instructions de Victoire.
2. Le rebuild Docker (`docker compose build ... && docker compose up -d`)
   se fait sur le serveur, pas depuis l'environnement de Claude Code.
3. Ne jamais présumer qu'un fichier modifié localement est déjà en
   production tant que Victoire ne l'a pas confirmé.

## Style de code à respecter

- Backend Node/Express : contrôleurs séparés par domaine
  (auth/files/submissions), routes minces qui délèguent aux contrôleurs,
  middleware `authMiddleware` + `checkRole(...roles)` pour les permissions.
- Frontend React : le fichier `Dashboard.jsx` est volumineux et centralise
  beaucoup de logique — lors d'une refonte, privilégier une décomposition
  en composants plus petits si le step de `ROADMAP.md` le permet, mais ne
  pas refactoriser hors-scope sans qu'on te le demande.
- Commentaires en français dans le code (cohérence avec l'existant),
  identifiants de variables en anglais ou français selon ce qui existe déjà
  dans le fichier touché.

## Qui fait quoi (rappel du workflow)

- **Claude (conversation)** : réflexion, architecture, stratégie, rédaction
  de spécifications, mise à jour des `.md`.
- **Claude Code (toi)** : implémentation, build, débogage, dans VS Code sur
  le code local.
- **Claude Design** : conception des écrans/maquettes, à partir de prompts
  écrits par Claude (conversation).

Si une tâche demandée dépasse ton périmètre (design visuel, décision
stratégique non tranchée dans `docs/`), dis-le plutôt que de trancher seul.
