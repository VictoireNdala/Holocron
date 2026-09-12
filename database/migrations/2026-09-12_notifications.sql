-- Axe F / D3 : notifications (cloche) — nouveau devoir, rendu reçu, dépôt
-- communautaire. Voir CONTEXT.md et ROADMAP.md pour le détail des évènements
-- déclencheurs. Fan-out à l'écriture (une ligne par destinataire), voir le
-- commentaire dans database/init.sql pour la justification.
CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT,
    link       VARCHAR(50),
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_unread (user_id, is_read)
);
