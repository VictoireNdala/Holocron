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
