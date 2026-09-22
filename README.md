# Gougoul Holocron

Gougoul Holocron est une plateforme académique de gestion de fichiers et de soumissions, conçue pour un environnement campus ou institutionnel. Elle combine :

- un frontend React pour l’interface utilisateur,
- un backend Node.js / Express pour l’API,
- une base MySQL pour la logique applicative,
- une intégration Nextcloud pour le stockage, les dossiers partagés et le WebDAV,
- une orchestration Docker pour le déploiement local ou serveur.

Le projet intègre des fonctionnalités de gestion des utilisateurs, des filières, des devoirs, des soumissions, des ressources communautaires, des quotas, ainsi qu’un espace administrateur avancé.

## Aperçu du projet

Le système est structuré autour de plusieurs briques :

- authentification et gestion des comptes,
- validation des matricules,
- création et suivi des devoirs,
- dépôt et consultation des soumissions,
- quotas de stockage et dossiers partagés Nextcloud,
- espace communautaire avec ressources, catégories et signalements,
- notifications et journalisation d’activité,
- administration avec permissions granulaires.

## Stack technique

### Frontend
- React 18
- React Router DOM
- Axios
- CRA / react-scripts

### Backend
- Node.js
- Express
- MySQL2
- JWT
- bcryptjs
- Multer
- CORS, Helmet, express-rate-limit

### Infra / DevOps
- Docker
- Docker Compose
- Nextcloud
- PostgreSQL pour la base Nextcloud
- Redis

## Structure du dépôt

```text
.
├── .gitignore
├── .vscode/
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       ├── utils/
│       └── index.js
├── database/
│   └── init.sql
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── package-lock.json
│   ├── public/
│   └── src/
│       ├── App.jsx
│       ├── Home.jsx
│       ├── index.js
│       ├── index.css
│       ├── components/
│       ├── context/
│       ├── pages/
│       ├── services/
│       └── theme/
├── nexcloud/
│   └── docker-compose.yml
├── docker-compose.yml
├── holocron-boot.sh
├── RECONSTRUCTION_ET_DEPLOIEMENT.md
└── README.md
```

## Fonctionnalités principales

### Authentification et comptes
- inscription d’utilisateurs,
- validation de matricule,
- stockage de mot de passe Nextcloud,
- rôles : étudiant, professeur, assistant,
- gestion des permissions d’administration.

### Gestion des devoirs et soumissions
- création de devoirs par professeurs/assistants,
- attribution par filière,
- soumission unique par étudiant et par devoir,
- stockage des fichiers de rendu,
- consultation côté professeur / assistant.

### Espace communautaire
- ressources partagées par catégorie,
- filière / niveau / faculté comme dimensions de classification,
- dossiers prioritaires,
- signalements des ressources,
- logique de vérification de contenu.

### Stockage partagé / Nextcloud
- intégration avec Nextcloud pour les comptes utilisateurs,
- dossiers partagés,
- quotas,
- lecture directe des données de Nextcloud côté backend pour certaines opérations métier.

### Administration
- journal d’activité,
- permissions d’admin déléguées,
- gestion des matricules,
- supervision des utilisateurs et des ressources.

## Modèle de données

La base MySQL principale contient notamment les tables suivantes :

- `matricules`
- `users`
- `sessions`
- `assignments`
- `submissions`
- `admin_permissions`
- `activity_logs`
- `faculties`
- `levels`
- `faculty_filieres`
- `community_categories`
- `community_priority_folders`
- `community_resources`
- `community_reports`
- `notifications`

Le fichier `database/init.sql` contient le schéma et les seed de données de démonstration.

## Déploiement

### Avec Docker Compose

Le dépôt fournit un `docker-compose.yml` principal pour le stack webapp :

```bash
docker compose up -d --build
```

Le stack Nextcloud est séparé dans `nexcloud/docker-compose.yml` :

```bash
cd nexcloud
docker compose up -d
```

Le script `holocron-boot.sh` est prévu pour gérer un démarrage serveur plus robuste, notamment pour la configuration Docker data-root et un pool de données.

## Démarrage local

### Prérequis
- Docker
- Docker Compose
- Node.js / npm
- (pour le développement backend) : accès à une base MySQL locale ou au stack Docker du projet

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Accès par défaut
- Frontend : http://localhost:3000
- Backend API : http://localhost:5000
- Nextcloud : http://localhost:8080

## Variables d’environnement

Le backend attend des variables telles que :

- `DB_HOST`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `NEXTCLOUD_URL`
- `NEXTCLOUD_ADMIN`
- `NEXTCLOUD_PASSWORD`
- `JWT_SECRET`
- `NC_DATA_DIR`

Les valeurs sont configurées dans `docker-compose.yml` pour un contexte de déploiement local / serveur interne.

## Notes importantes

- Le projet contient des éléments de configuration et des identifiants liés à un environnement académique interne.
- Le dépôt inclut des informations sensibles de déploiement ou d’infrastructure (mot de passe, volumes Docker, localisations système).
- Le fichier `RECONSTRUCTION_ET_DEPLOIEMENT.md` explique en détail la reconstruction du projet après une perte de disque et décrit l’architecture cible / redéploiement.
- Le projet est encore un projet de développement / reconstruction avec des points à vérifier avant mise en production forte.

## Statut du projet

Le dépôt semble correspondre à un état de reconstruction et de redéploiement d’une application déjà existante, avec :

- une architecture fonctionnelle définie,
- des schémas de base de données déjà préparés,
- une logique métier assez avancée,
- un besoin de validation et de nettoyage avant production.

## Licence

Aucune licence n’est explicitement définie dans le dépôt pour le moment.

Avant toute publication ou redistribution externe, il est recommandé d’ajouter une licence Open Source adaptée (par exemple MIT, Apache 2.0 ou GPL selon votre cas d’usage).

## Auteur / propriétaire

Le dépôt est actuellement hébergé sous le compte GitHub de l’utilisateur associé au projet et est géré comme un dépôt privé.

## Développement futur / roadmap

Les notes de reconstruction mentionnent plusieurs points à finaliser ou à vérifier, notamment :

- suppression / gestion avancée des fichiers,
- changement de mot de passe côté API,
- branchement complet des dossiers partagés dans le dashboard,
- amélioration des mécanismes UI/UX,
- intégration IA locale si nécessaire.

## Ressources utiles

- `RECONSTRUCTION_ET_DEPLOIEMENT.md` : documentation de reconstruction et redéploiement
- `database/init.sql` : schéma principal et seeds
- `docker-compose.yml` : configuration du stack webapp
- `nexcloud/docker-compose.yml` : configuration du stack Nextcloud
- `backend/src/index.js` : point d’entrée API
- `frontend/src/App.jsx` : point d’entrée frontend

## Conclusion

Gougoul Holocron est un projet de plateforme académique intégrant stockage, gestion des devoirs, soumissions, communauté, quotas et administration. Il s’agit d’une base solide pour un système de gestion de fichiers et d’activités campus, avec une architecture moderne basée sur Docker, React et Node.js.

---

Si vous souhaitez, je peux maintenant vous proposer :

1. une version README plus courte et plus élégante,
2. une version README orientée Open Source / GitHub public,
3. une version README plus technique pour développeurs,
4. ou même un README complet en anglais.
