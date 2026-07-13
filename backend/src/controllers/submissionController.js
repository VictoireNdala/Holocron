const db     = require('../config/db');
const axios  = require('axios');
const fs     = require('fs');
const path   = require('path');

const NC_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.4:8080';
// Racine des données Nextcloud montée en lecture seule dans le backend
// (docker-compose : /mnt/Holocron_sith/nexcloud/data:/nextcloud-data:ro)
const NC_DATA = process.env.NC_DATA_DIR || '/nextcloud-data';

const userWebdav = (req) => axios.create({
  baseURL: NC_URL,
  auth: { username: req.user.nextcloud_username, password: req.user.nc_password },
  maxContentLength: Infinity, maxBodyLength: Infinity
});

// ── Créer un devoir (prof / assistant) ───────────────────────────────────────
exports.createAssignment = async (req, res) => {
  try {
    const { titre, description, filiere, date_limite } = req.body;
    if (!titre || !filiere) {
      return res.status(400).json({ success: false, message: 'Titre et filière requis' });
    }
    const profNom = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim();

    const [r] = await db.execute(
      `INSERT INTO assignments (titre, description, filiere, date_limite, prof_id, prof_nom)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [titre, description || null, filiere, date_limite || null, req.user.id, profNom]
    );
    res.status(201).json({ success: true, message: 'Devoir créé', id: r.insertId });
  } catch (error) {
    console.error('createAssignment:', error.message);
    res.status(500).json({ success: false, message: 'Erreur création devoir' });
  }
};

// ── Lister les devoirs (étudiant = filtré par sa filière) ────────────────────
exports.listAssignments = async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'etudiant') {
      const filiere = req.user.filiere;
      [rows] = await db.execute(
        'SELECT * FROM assignments WHERE filiere = ? ORDER BY created_at DESC',
        [filiere]
      );
    } else {
      // prof / assistant : tous les devoirs
      [rows] = await db.execute('SELECT * FROM assignments ORDER BY created_at DESC');
    }
    res.json({ success: true, assignments: rows });
  } catch (error) {
    console.error('listAssignments:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste devoirs' });
  }
};

// ── Soumettre un fichier pour un devoir (étudiant) ───────────────────────────
exports.submit = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });
    const assignmentId = req.body.assignment_id;
    if (!assignmentId) return res.status(400).json({ success: false, message: 'Devoir non précisé' });

    const username = req.user.nextcloud_username;
    const wd       = userWebdav(req);

    // 1. Le dossier /Soumissions doit exister (MKCOL, on ignore le 405 = déjà là)
    try {
      await wd({ method: 'MKCOL', url: `/remote.php/dav/files/${username}/Soumissions` });
    } catch (e) { if (e.response?.status !== 405) throw e; }

    // 2. Déposer le fichier : /Soumissions/{assignment_id}_{nom}
    const fichierNom  = req.file.originalname;
    const fichierPath = `/Soumissions/${assignmentId}_${fichierNom}`;
    await wd({
      method:  'PUT',
      url:     `/remote.php/dav/files/${username}${fichierPath}`,
      headers: { 'Content-Type': req.file.mimetype || 'application/octet-stream', 'Content-Length': req.file.size },
      data:    req.file.buffer
    });

    // 3. Enregistrer la métadonnée (re-soumission = remplace)
    const etudiantNom = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim();
    await db.execute(
      `INSERT INTO submissions (assignment_id, etudiant_id, etudiant_nom, fichier_path, fichier_nom)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE fichier_path = VALUES(fichier_path),
                               fichier_nom  = VALUES(fichier_nom),
                               etudiant_nom = VALUES(etudiant_nom),
                               submitted_at = CURRENT_TIMESTAMP`,
      [assignmentId, req.user.id, etudiantNom, fichierPath, fichierNom]
    );

    res.json({ success: true, message: 'Devoir soumis' });
  } catch (error) {
    console.error('submit:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur soumission' });
  }
};

// ── Mes soumissions (étudiant) ───────────────────────────────────────────────
exports.getMySubmissions = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT assignment_id, fichier_nom, submitted_at FROM submissions WHERE etudiant_id = ?',
      [req.user.id]
    );
    res.json({ success: true, submissions: rows });
  } catch (error) {
    console.error('getMySubmissions:', error.message);
    res.status(500).json({ success: false, message: 'Erreur mes soumissions' });
  }
};

// ── Rendus reçus, groupés par devoir (prof / assistant) ──────────────────────
exports.getReceivedSubmissions = async (req, res) => {
  try {
    const [assignments] = await db.execute('SELECT * FROM assignments ORDER BY created_at DESC');
    const [subs] = await db.execute(
      `SELECT s.id, s.assignment_id, s.etudiant_nom, s.fichier_nom, s.submitted_at
       FROM submissions s ORDER BY s.submitted_at DESC`
    );
    const grouped = assignments.map(a => ({
      ...a,
      submissions: subs.filter(s => s.assignment_id === a.id)
    }));
    res.json({ success: true, assignments: grouped });
  } catch (error) {
    console.error('getReceivedSubmissions:', error.message);
    res.status(500).json({ success: false, message: 'Erreur rendus reçus' });
  }
};

// ── Télécharger une copie (prof / assistant) ─────────────────────────────────
// Nextcloud 33 bloque la lecture cross-user par WebDAV → lecture DIRECTE sur
// disque via le volume monté /nextcloud-data:ro. NE PAS repasser au WebDAV admin.
exports.downloadSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT s.fichier_path, s.fichier_nom, u.nextcloud_username
       FROM submissions s JOIN users u ON u.id = s.etudiant_id
       WHERE s.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Soumission introuvable' });

    const sub = rows[0];
    // Nextcloud stocke les fichiers user à : {data}/{uid}/files/{chemin}
    const diskPath = path.join(NC_DATA, sub.nextcloud_username, 'files', sub.fichier_path);

    if (!fs.existsSync(diskPath)) {
      console.error('downloadSubmission: fichier absent du disque:', diskPath);
      return res.status(404).json({ success: false, message: 'Fichier introuvable sur le disque' });
    }

    const filename = encodeURIComponent(sub.fichier_nom);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', 'application/octet-stream');
    fs.createReadStream(diskPath).pipe(res);
  } catch (error) {
    console.error('downloadSubmission:', error.message);
    res.status(500).json({ success: false, message: 'Erreur téléchargement' });
  }
};
