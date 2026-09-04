-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 2026-09-04 — Espace communautaire (D1) + Panel Admin avancé (D2)
-- À exécuter MANUELLEMENT sur la base academic_nas existante (init.sql ne
-- s'exécute qu'au tout premier démarrage MySQL — voir database/init.sql,
-- déjà à jour avec ce même schéma pour toute future installation neuve).
-- Voir DECISIONS.md D-2026-09-04-01 à 07 pour le détail des choix.
-- ═══════════════════════════════════════════════════════════════════════════
USE academic_nas;

-- ── Panel Admin avancé (D2) ──────────────────────────────────────────────────

ALTER TABLE users
  ADD COLUMN is_admin    BOOLEAN DEFAULT FALSE,
  ADD COLUMN admin_level ENUM('super','simple') DEFAULT NULL;

CREATE TABLE admin_permissions (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    permission  ENUM('verifier_logiciels','moderer_communautaire','gerer_matricules',
                      'gerer_utilisateurs','gerer_dossiers','voir_logs') NOT NULL,
    granted_by  INT NOT NULL,
    granted_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_permission (user_id, permission),
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (granted_by) REFERENCES users(id)
);

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

-- ── Espace communautaire (D1) ─────────────────────────────────────────────────

CREATE TABLE community_resources (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    titre                VARCHAR(200) NOT NULL,
    description          TEXT,
    categorie            ENUM('Cours','Logiciel','Media','Autre') NOT NULL,
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

-- Signalements (POST /api/community/resources/:id/report) — pas listée dans
-- CONTEXT.md section 4 au moment de la conception initiale, ajoutée ici pour
-- persister le signalement (comblait un manque d'implémentation, pas un choix
-- déjà tranché ailleurs).
CREATE TABLE community_reports (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    resource_id INT NOT NULL,
    reporter_id INT NOT NULL,
    raison      TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (resource_id) REFERENCES community_resources(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_id) REFERENCES users(id)
);

-- ── Seed — niveaux L1 à L5 ─────────────────────────────────────────────────
INSERT INTO levels (nom, ordre) VALUES
  ('L1', 1), ('L2', 2), ('L3', 3), ('L4', 4), ('L5', 5);

-- ── Seed — faculté et filières existantes (extensible ensuite par un admin) ──
INSERT INTO faculties (nom) VALUES ('Sciences Informatiques');
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Genie Logiciel' FROM faculties WHERE nom = 'Sciences Informatiques';
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Intelligence Artificielle' FROM faculties WHERE nom = 'Sciences Informatiques';
INSERT INTO faculty_filieres (faculty_id, nom)
  SELECT id, 'Systemes Informatiques' FROM faculties WHERE nom = 'Sciences Informatiques';

-- ── Victoire = super admin (porteuse du projet / administratrice système) ────
UPDATE users SET is_admin = TRUE, admin_level = 'super' WHERE matricule = 'ETU-20244936';
