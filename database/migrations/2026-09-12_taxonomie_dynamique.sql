-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 2026-09-12 — Taxonomie Espace communautaire entièrement dynamique
-- À exécuter MANUELLEMENT sur la base academic_nas existante (init.sql ne
-- s'exécute qu'au tout premier démarrage MySQL — voir database/init.sql,
-- déjà à jour avec ce même schéma pour toute future installation neuve).
-- Voir DECISIONS.md D-2026-09-12-03 et ROADMAP.md Axe F6.
--
-- Conçue pour être SANS RISQUE sur une base contenant déjà des données
-- réelles (testée en production le 2026-09-12) :
--  - community_resources.categorie passe d'ENUM à VARCHAR : élargissement
--    pur, aucune valeur existante n'est perdue ou invalidée.
--  - Pas de contrainte FK stricte entre community_resources.categorie et la
--    nouvelle table community_categories : une catégorie supprimée plus
--    tard ne casse jamais les ressources déjà déposées sous ce nom.
--  - faculties/levels/faculty_filieres existaient déjà, on ajoute juste les
--    routes CRUD (aucun changement de schéma nécessaire pour ces 3-là).
-- ═══════════════════════════════════════════════════════════════════════════
USE academic_nas;

-- ── Catégories communautaires : table gérable (au lieu de l'ENUM en dur) ────
-- is_logiciel identifie la catégorie spéciale pour les badges de
-- vérification (D-2026-09-04-02) PAR FLAG, pas par libellé — renommable
-- depuis le Panel Admin sans casser la logique de vérification.
CREATE TABLE community_categories (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nom         VARCHAR(100) UNIQUE NOT NULL,
    is_logiciel BOOLEAN DEFAULT FALSE,
    ordre       INT DEFAULT 0,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO community_categories (nom, is_logiciel, ordre) VALUES
  ('Cours', FALSE, 1), ('Logiciel', TRUE, 2), ('Media', FALSE, 3), ('Autre', FALSE, 4);

ALTER TABLE community_resources MODIFY COLUMN categorie VARCHAR(100) NOT NULL;

-- ── Nouvelle permission dédiée à la gestion de la taxonomie ─────────────────
ALTER TABLE admin_permissions MODIFY COLUMN permission
  ENUM('verifier_logiciels','moderer_communautaire','gerer_matricules',
       'gerer_utilisateurs','gerer_dossiers','voir_logs','gerer_taxonomie') NOT NULL;
