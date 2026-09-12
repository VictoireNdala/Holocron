-- ═══════════════════════════════════════════════════════════════════════════
-- Gougoul Holocron — schéma complet (état 12 juillet 2026)
-- Ce fichier ne s'exécute qu'au TOUT PREMIER démarrage de MySQL (data dir vide).
-- Sur disque neuf : le bind-mount mysql-data est vide → ce script s'applique.
-- ═══════════════════════════════════════════════════════════════════════════
CREATE DATABASE IF NOT EXISTS academic_nas;
USE academic_nas;

-- ── Matricules autorisés (liste blanche pré-remplie par l'admin) ─────────────
CREATE TABLE matricules (
    id        INT AUTO_INCREMENT PRIMARY KEY,
    matricule VARCHAR(20) UNIQUE NOT NULL,
    nom       VARCHAR(100) NOT NULL,
    prenom    VARCHAR(100) NOT NULL,
    role      ENUM('etudiant','professeur','assistant') NOT NULL,
    filiere   VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Utilisateurs inscrits ────────────────────────────────────────────────────
-- nc_password : mot de passe EN CLAIR, requis pour le WebDAV per-user
-- (Nextcloud 33 bloque l'écriture cross-user par l'admin). C'est un choix
-- assumé pour ce contexte campus local et fermé.
-- is_admin/admin_level : Panel Admin avancé (D2) — voir DECISIONS.md
-- D-2026-09-04-05. Pas de rôle "admin" séparé : un compte etudiant/professeur/
-- assistant peut en plus être admin (super ou simple, permissions à la carte
-- dans admin_permissions ci-dessous).
CREATE TABLE users (
    id                 INT AUTO_INCREMENT PRIMARY KEY,
    matricule          VARCHAR(20) UNIQUE NOT NULL,
    nom                VARCHAR(100) NOT NULL,
    prenom             VARCHAR(100) NOT NULL,
    email              VARCHAR(150) UNIQUE NOT NULL,
    password           VARCHAR(255) NOT NULL,         -- hash bcrypt (login portail)
    nc_password        VARCHAR(255) DEFAULT NULL,      -- clair (WebDAV per-user)
    role               ENUM('etudiant','professeur','assistant') NOT NULL,
    filiere            VARCHAR(50),
    nextcloud_username VARCHAR(100),
    is_active          BOOLEAN DEFAULT TRUE,
    is_admin           BOOLEAN DEFAULT FALSE,
    admin_level        ENUM('super','simple') DEFAULT NULL,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (matricule) REFERENCES matricules(matricule)
);

-- ── Sessions (JWT persistés pour invalidation au logout) ─────────────────────
CREATE TABLE sessions (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    token      VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Devoirs (créés par profs/assistants) ─────────────────────────────────────
CREATE TABLE assignments (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    titre       VARCHAR(200) NOT NULL,
    description TEXT,
    filiere     VARCHAR(50) NOT NULL,       -- le devoir cible une filière entière
    date_limite DATE,
    prof_id     INT,
    prof_nom    VARCHAR(200),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Soumissions (dépôts des étudiants) ───────────────────────────────────────
CREATE TABLE submissions (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    etudiant_id   INT NOT NULL,
    etudiant_nom  VARCHAR(200),
    fichier_path  VARCHAR(500),             -- chemin WebDAV : /Soumissions/{id}_{nom}
    fichier_nom   VARCHAR(255),
    submitted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_rendu (assignment_id, etudiant_id),   -- 1 rendu / étudiant / devoir
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (etudiant_id)   REFERENCES users(id)       ON DELETE CASCADE
);

-- ── Permissions admin déléguées (Panel Admin avancé, D2) ──────────────────────
-- Voir DECISIONS.md D-2026-09-04-05. Un super admin (users.admin_level='super')
-- a tous les droits implicitement ; un admin simple reçoit ces permissions
-- une à une.
CREATE TABLE admin_permissions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    permission  ENUM('verifier_logiciels','moderer_communautaire','gerer_matricules',
                      'gerer_utilisateurs','gerer_dossiers','voir_logs','gerer_taxonomie') NOT NULL,
    granted_by  INT NOT NULL,
    granted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_permission (user_id, permission),
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

-- ── Journal d'activité (traçabilité, D2) ──────────────────────────────────────
CREATE TABLE activity_logs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    action     VARCHAR(50) NOT NULL,
    cible_type VARCHAR(50) DEFAULT NULL,
    cible_id   VARCHAR(100) DEFAULT NULL,
    details    TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Facultés / niveaux / filières (classification Espace communautaire, D1) ──
-- Voir DECISIONS.md D-2026-09-04-01. Réutilisées aussi par les dossiers
-- prioritaires (D2, community_priority_folders).
CREATE TABLE faculties (
    id  INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(150) UNIQUE NOT NULL
);

CREATE TABLE levels (
    id    INT AUTO_INCREMENT PRIMARY KEY,
    nom   VARCHAR(50) UNIQUE NOT NULL,   -- L1..L5
    ordre INT NOT NULL
);

CREATE TABLE faculty_filieres (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id INT NOT NULL,
    nom        VARCHAR(150) NOT NULL,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id) ON DELETE CASCADE
);

-- Catégories de ressources communautaires — table gérable (Axe F6,
-- DECISIONS.md D-2026-09-12-03) au lieu d'un ENUM en dur. is_logiciel
-- identifie la catégorie spéciale pour les badges de vérification
-- (D-2026-09-04-02) PAR FLAG, pas par libellé — renommable depuis le Panel
-- Admin sans casser la logique de vérification. Pas de FK stricte depuis
-- community_resources.categorie (VARCHAR simple, voir plus bas) : supprimer
-- une catégorie ne casse jamais les ressources déjà déposées sous ce nom.
CREATE TABLE community_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nom         VARCHAR(100) UNIQUE NOT NULL,
    is_logiciel BOOLEAN DEFAULT FALSE,
    ordre       INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── Dossiers prioritaires (D2) — voir DECISIONS.md D-2026-09-04-06 ───────────
-- Un attribut sur un regroupement facette (faculté/filière/niveau), pas un
-- type de dossier séparé.
CREATE TABLE community_priority_folders (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    faculty_id  INT NOT NULL,
    filiere_id  INT DEFAULT NULL,
    level_id    INT DEFAULT NULL,
    is_priority BOOLEAN DEFAULT TRUE,
    created_by  INT NOT NULL,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id) REFERENCES faculties(id)        ON DELETE CASCADE,
    FOREIGN KEY (filiere_id) REFERENCES faculty_filieres(id) ON DELETE CASCADE,
    FOREIGN KEY (level_id)   REFERENCES levels(id)           ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ── Espace libre communautaire (D1) — voir DECISIONS.md D-2026-09-04-01 à 04 ─
CREATE TABLE community_resources (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    titre                VARCHAR(200) NOT NULL,
    description          TEXT,
    categorie            VARCHAR(100) NOT NULL, -- libre (voir community_categories), plus un ENUM depuis l'Axe F6
    faculty_id           INT DEFAULT NULL,   -- NULL = "Général / toutes facultés"
    level_id             INT DEFAULT NULL,   -- NULL = "Tous niveaux"
    cover_image_path     VARCHAR(500) DEFAULT NULL,
    fichier_path         VARCHAR(500) NOT NULL,
    fichier_nom          VARCHAR(255) NOT NULL,
    taille               BIGINT DEFAULT 0,
    uploader_id          INT NOT NULL,
    downloads_count      INT DEFAULT 0,
    verification_status  ENUM('non_concerne','non_verifie','verifie','dangereux') DEFAULT 'non_concerne',
    verified_by          INT DEFAULT NULL,
    verified_at          TIMESTAMP NULL DEFAULT NULL,
    status               ENUM('visible','masque') DEFAULT 'visible',
    created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (faculty_id)  REFERENCES faculties(id) ON DELETE SET NULL,
    FOREIGN KEY (level_id)    REFERENCES levels(id)    ON DELETE SET NULL,
    FOREIGN KEY (uploader_id) REFERENCES users(id),
    FOREIGN KEY (verified_by) REFERENCES users(id)
);

-- Signalements d'une ressource communautaire (POST /community/resources/:id/report)
CREATE TABLE community_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    reporter_id INT NOT NULL,
    raison      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES community_resources(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);

-- ── Notifications (D3) ────────────────────────────────────────────────────
-- Fan-out à l'écriture : une ligne par destinataire (pas de table de jointure
-- "lu par"), plus simple à requêter pour l'affichage "mes notifications" au
-- prix d'un peu plus d'inserts — acceptable à l'échelle d'un campus.
CREATE TABLE notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    type       VARCHAR(50) NOT NULL,   -- 'nouveau_devoir' | 'rendu_recu' | 'depot_communautaire'
    title      VARCHAR(200) NOT NULL,
    message    TEXT,
    link       VARCHAR(50),            -- onglet Dashboard à ouvrir au clic ('submissions', 'community'...)
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED — matricules
-- ═══════════════════════════════════════════════════════════════════════════

-- Comptes de test (à garder pour les démos)
INSERT INTO matricules (matricule, nom, prenom, role, filiere) VALUES
('ETU-2024-001', 'Dupont',  'Jean',   'etudiant',   'Informatique'),
('ETU-2024-002', 'Martin',  'Sophie', 'etudiant',   'Medecine'),
('ETU-2024-003', 'Bernard', 'Lucas',  'etudiant',   'Droit'),
('PRO-2024-001', 'Leclerc', 'Marie',  'professeur', NULL),
('PRO-2024-002', 'Moreau',  'Pierre', 'professeur', NULL),
('ASS-2024-001', 'Simon',   'Emma',   'assistant',  NULL);

-- Promotion réelle (préfixe = rôle ; filiere = nom EXACT du groupe Nextcloud)
-- NB : découpage nom/prénom = "prénom en dernier". À ajuster si l'état civil diffère.
INSERT INTO matricules (matricule, nom, prenom, role, filiere) VALUES
('ETU-20244936', 'Ndala Mwenze',           'Victoire', 'etudiant',   'Genie Logiciel'),
('ETU-20244401', 'Mutombo Musaka Dikonzo', 'Enock',    'etudiant',   'Intelligence Artificielle'),
('ETU-20244052', 'Ngalula Odia',           'Joshua',   'etudiant',   'Systemes Informatiques'),
('ETU-20244721', 'Mulonda Kabeya',         'Richard',  'etudiant',   'Intelligence Artificielle'),
('ETU-20243959', 'Kisimba Kipoka',         'Lionel',   'etudiant',   'Genie Logiciel'),
('PRO-2024001',  'Bagula Bigomokero',      'Antoine',  'professeur', NULL),
('ASS-2024001',  'Mbale',                  'Landry',   'assistant',  NULL),
('ASS-2024002',  'Kapemba',                'Jonathan', 'assistant',  NULL),
('ASS-2024003',  'Tambwe',                 'Gad',      'assistant',  NULL),
('ASS-2024004',  'Kabwe',                  'Ortega',   'assistant',  NULL),
('ASS-2024005',  'Ilunga',                 'Godwill',  'assistant',  NULL);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED — niveaux, faculté et filières (Espace communautaire, D1)
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO levels (nom, ordre) VALUES
  ('L1', 1), ('L2', 2), ('L3', 3), ('L4', 4), ('L5', 5);

INSERT INTO community_categories (nom, is_logiciel, ordre) VALUES
  ('Cours', FALSE, 1), ('Logiciel', TRUE, 2), ('Media', FALSE, 3), ('Autre', FALSE, 4);

INSERT INTO faculties (nom) VALUES ('Sciences Informatiques');
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Genie Logiciel' FROM faculties WHERE nom = 'Sciences Informatiques';
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Intelligence Artificielle' FROM faculties WHERE nom = 'Sciences Informatiques';
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Systemes Informatiques' FROM faculties WHERE nom = 'Sciences Informatiques';

-- Victoire = super admin (porteuse du projet / administratrice système).
-- Sans effet tant qu'elle ne s'est pas inscrite (la table users est peuplée à
-- l'inscription, pas ici) — la migration manuelle (database/migrations/) fait
-- le même UPDATE pour la base déjà peuplée en production.
UPDATE users SET is_admin = TRUE, admin_level = 'super' WHERE matricule = 'ETU-20244936';
