const axios  = require('axios');
const multer = require('multer');
const db     = require('../config/db');
const { logActivity } = require('../utils/activityLog');
const { notifyAllExcept } = require('../utils/notify');

const NC_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.4:8080';

// Client WebDAV PER-USER — même règle que fileController/submissionController :
// jamais un client admin unique (Nextcloud 33 bloque l'écriture cross-user).
const userWebdav = (req) => axios.create({
  baseURL: NC_URL,
  auth: { username: req.user.nextcloud_username, password: req.user.nc_password },
  maxContentLength: Infinity,
  maxBodyLength:    Infinity
});

// Stockage physique : Team Folder Nextcloud dédié `Communautaire`, écriture
// ouverte à tous les rôles, sous-dossiers par catégorie (voir CONTEXT.md
// section 4). Le Team Folder lui-même est créé manuellement côté serveur
// (D1.8, infra) — on crée ici les sous-dossiers au besoin (MKCOL, 405 ignoré
// si déjà présents) pour ne pas dépendre d'une création manuelle complète.
// Noms historiques conservés pour les 4 catégories de départ (chemins déjà
// utilisés par des ressources réelles déposées avant l'Axe F6) ; toute
// catégorie créée depuis le Panel Admin après coup utilise son nom
// sanitisé directement (voir sanitizeFolderName).
const LEGACY_CATEGORY_FOLDER = { Cours: 'Cours', Logiciel: 'Logiciels', Media: 'Medias', Autre: 'Autre' };
const sanitizeFolderName = (nom) => LEGACY_CATEGORY_FOLDER[nom] || nom.replace(/[^a-zA-Z0-9_-]/g, '_') || 'Autre';

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 }
});
exports.uploadMiddleware = upload.fields([{ name: 'fichier', maxCount: 1 }, { name: 'cover_image', maxCount: 1 }]);

const mkdirSafe = async (wd, username, dirPath) => {
  try { await wd({ method: 'MKCOL', url: `/remote.php/dav/files/${username}${dirPath}` }); }
  catch (e) { if (e.response?.status !== 405) throw e; }
};

// ── Facultés / niveaux (référentiels de classification) ─────────────────────
exports.listFaculties = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nom FROM faculties ORDER BY nom');
    res.json({ success: true, faculties: rows });
  } catch (error) {
    console.error('listFaculties:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste facultés' });
  }
};

exports.listLevels = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nom, ordre FROM levels ORDER BY ordre');
    res.json({ success: true, levels: rows });
  } catch (error) {
    console.error('listLevels:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste niveaux' });
  }
};

// F6 — catégories gérables (table community_categories, plus un ENUM en dur)
exports.listCategories = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT id, nom, is_logiciel, ordre FROM community_categories ORDER BY ordre, nom');
    res.json({ success: true, categories: rows.map(r => ({ ...r, is_logiciel: !!r.is_logiciel })) });
  } catch (error) {
    console.error('listCategories:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste catégories' });
  }
};

// ── Dossiers prioritaires (lecture publique, tous rôles) ────────────────────
// F7 : le catalogue doit mettre en avant les dossiers prioritaires même
// vides — endpoint séparé de `GET /admin/priority-folders` (réservé aux
// admins) car ici n'importe quel utilisateur authentifié doit pouvoir les
// voir pour savoir où déposer.
exports.listPublicPriorityFolders = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT pf.id, pf.faculty_id, f.nom AS faculty_nom, pf.filiere_id, ff.nom AS filiere_nom,
              pf.level_id, l.nom AS level_nom,
              (SELECT COUNT(*) FROM community_resources cr
                WHERE cr.faculty_id = pf.faculty_id
                  AND (pf.level_id IS NULL OR cr.level_id = pf.level_id)
                  AND cr.status = 'visible') AS resource_count
       FROM community_priority_folders pf
       JOIN faculties f            ON f.id = pf.faculty_id
       LEFT JOIN faculty_filieres ff ON ff.id = pf.filiere_id
       LEFT JOIN levels l           ON l.id = pf.level_id
       ORDER BY pf.created_at DESC`
    );
    res.json({ success: true, folders: rows });
  } catch (error) {
    console.error('listPublicPriorityFolders:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste dossiers prioritaires' });
  }
};

// ── Catalogue (facettes combinables Faculté/Niveau/Catégorie + recherche) ───
// Un fichier "dangereux" reste VISIBLE dans le catalogue avec son badge (voir
// DECISIONS.md D-2026-09-04-02) — seul le téléchargement est bloqué (403,
// voir downloadResource ci-dessous). Ne pas les filtrer ici.
exports.listResources = async (req, res) => {
  try {
    const { faculty, level, category, q, sort } = req.query;
    const clauses = [`cr.status = 'visible'`];
    const params  = [];
    if (faculty)  { clauses.push('cr.faculty_id = ?'); params.push(faculty); }
    if (level)    { clauses.push('cr.level_id = ?');   params.push(level); }
    if (category) { clauses.push('cr.categorie = ?');  params.push(category); }
    if (q)        { clauses.push('(cr.titre LIKE ? OR cr.description LIKE ?)'); params.push(`%${q}%`, `%${q}%`); }

    const orderBy = sort === 'populaire' ? 'cr.downloads_count DESC'
                   : sort === 'ancien'   ? 'cr.created_at ASC'
                   : 'cr.created_at DESC'; // 'recent' par défaut

    // Pagination — le catalogue grossit avec chaque dépôt, jamais de limite
    // avant ce correctif (risque de payload/temps de requête non borné).
    const page  = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM community_resources cr WHERE ${clauses.join(' AND ')}`,
      params
    );

    const [rows] = await db.execute(
      `SELECT cr.*, f.nom AS faculty_nom, l.nom AS level_nom, u.nom AS uploader_nom, u.prenom AS uploader_prenom
       FROM community_resources cr
       LEFT JOIN faculties f ON f.id = cr.faculty_id
       LEFT JOIN levels l    ON l.id = cr.level_id
       JOIN users u          ON u.id = cr.uploader_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    res.json({
      success: true,
      resources: rows,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }
    });
  } catch (error) {
    console.error('listResources:', error.message);
    res.status(500).json({ success: false, message: 'Erreur liste ressources' });
  }
};

exports.getResource = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      `SELECT cr.*, f.nom AS faculty_nom, l.nom AS level_nom, u.nom AS uploader_nom, u.prenom AS uploader_prenom
       FROM community_resources cr
       LEFT JOIN faculties f ON f.id = cr.faculty_id
       LEFT JOIN levels l    ON l.id = cr.level_id
       JOIN users u          ON u.id = cr.uploader_id
       WHERE cr.id = ?`,
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ressource introuvable' });
    const resource = rows[0];

    const [similar] = await db.execute(
      `SELECT id, titre, categorie, cover_image_path
       FROM community_resources
       WHERE categorie = ? AND id != ? AND status = 'visible'
       ORDER BY downloads_count DESC LIMIT 6`,
      [resource.categorie, id]
    );

    res.json({ success: true, resource, similar });
  } catch (error) {
    console.error('getResource:', error.message);
    res.status(500).json({ success: false, message: 'Erreur détail ressource' });
  }
};

// ── Déposer une ressource ─────────────────────────────────────────────────
exports.createResource = async (req, res) => {
  try {
    const { titre, description, categorie, faculty_id, level_id } = req.body;
    const fichier = req.files?.fichier?.[0];
    const cover   = req.files?.cover_image?.[0];

    if (!titre || !categorie) return res.status(400).json({ success: false, message: 'Titre et catégorie requis' });
    if (!fichier) return res.status(400).json({ success: false, message: 'Fichier requis' });

    // F6 — catégorie vérifiée contre la table gérable (plus un ENUM en dur) ;
    // is_logiciel (pas le libellé) détermine si le badge de vérification
    // s'applique (DECISIONS.md D-2026-09-04-02), pour rester correct même
    // si la catégorie "Logiciel" est renommée depuis le Panel Admin.
    const [catRows] = await db.execute('SELECT is_logiciel FROM community_categories WHERE nom = ?', [categorie]);
    if (catRows.length === 0) return res.status(400).json({ success: false, message: 'Catégorie invalide' });
    const verificationStatus = catRows[0].is_logiciel ? 'non_verifie' : 'non_concerne';

    const [ins] = await db.execute(
      `INSERT INTO community_resources
        (titre, description, categorie, faculty_id, level_id, fichier_path, fichier_nom, taille, uploader_id, verification_status)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?)`,
      [titre, description || null, categorie, faculty_id || null, level_id || null, fichier.originalname, fichier.size, req.user.id, verificationStatus]
    );
    const resourceId = ins.insertId;

    const username = req.user.nextcloud_username;
    const wd       = userWebdav(req);
    const folder   = sanitizeFolderName(categorie);

    await mkdirSafe(wd, username, '/Communautaire');
    await mkdirSafe(wd, username, `/Communautaire/${folder}`);

    const fichierPath = `/Communautaire/${folder}/${resourceId}_${fichier.originalname}`;
    await wd({
      method:  'PUT',
      url:     `/remote.php/dav/files/${username}${fichierPath}`,
      headers: { 'Content-Type': fichier.mimetype || 'application/octet-stream', 'Content-Length': fichier.size },
      data:    fichier.buffer
    });

    let coverPath = null;
    if (cover) {
      await mkdirSafe(wd, username, '/Communautaire/_covers');
      coverPath = `/Communautaire/_covers/${resourceId}_${cover.originalname}`;
      await wd({
        method:  'PUT',
        url:     `/remote.php/dav/files/${username}${coverPath}`,
        headers: { 'Content-Type': cover.mimetype || 'application/octet-stream', 'Content-Length': cover.size },
        data:    cover.buffer
      });
    }

    await db.execute(
      'UPDATE community_resources SET fichier_path = ?, cover_image_path = ? WHERE id = ?',
      [fichierPath, coverPath, resourceId]
    );
    await logActivity(req.user.id, 'upload', 'community_resource', resourceId);

    const uploaderNom = `${req.user.prenom || ''} ${req.user.nom || ''}`.trim();
    await notifyAllExcept(req.user.id, {
      type: 'depot_communautaire',
      title: 'Nouvelle ressource communautaire',
      message: `${uploaderNom || 'Quelqu\'un'} a déposé « ${titre} »`,
      link: 'community'
    });

    res.status(201).json({ success: true, message: 'Ressource déposée', id: resourceId });
  } catch (error) {
    console.error('createResource:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur dépôt ressource' });
  }
};

// ── Télécharger une ressource ─────────────────────────────────────────────
exports.downloadResource = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute(
      'SELECT fichier_path, fichier_nom, verification_status FROM community_resources WHERE id = ?',
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ressource introuvable' });
    const resource = rows[0];

    if (resource.verification_status === 'dangereux') {
      return res.status(403).json({ success: false, message: 'Téléchargement bloqué — fichier marqué dangereux' });
    }

    const username = req.user.nextcloud_username;
    const response = await userWebdav(req)({
      method:       'GET',
      url:          `/remote.php/dav/files/${username}${resource.fichier_path}`,
      responseType: 'stream'
    });

    db.execute('UPDATE community_resources SET downloads_count = downloads_count + 1 WHERE id = ?', [id]).catch(() => {});
    logActivity(req.user.id, 'download', 'community_resource', id);

    const filename = encodeURIComponent(resource.fichier_nom);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    response.data.pipe(res);
  } catch (error) {
    console.error('downloadResource:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur téléchargement' });
  }
};

// ── Image de couverture ───────────────────────────────────────────────────
// Route à part de downloadResource : pas de compte de téléchargement, pas de
// blocage "dangereux" (l'image n'est pas le fichier signalé), Content-
// Disposition inline pour un affichage direct côté frontend (fetch en blob
// authentifié — jamais un <img src> direct, cette route reste protégée par
// authMiddleware comme le reste des accès WebDAV per-user).
exports.getResourceCover = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT cover_image_path FROM community_resources WHERE id = ?', [id]);
    if (rows.length === 0 || !rows[0].cover_image_path) {
      return res.status(404).json({ success: false, message: 'Pas de couverture pour cette ressource' });
    }

    const username = req.user.nextcloud_username;
    const response = await userWebdav(req)({
      method:       'GET',
      url:          `/remote.php/dav/files/${username}${rows[0].cover_image_path}`,
      responseType: 'stream'
    });

    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Type', response.headers['content-type'] || 'image/jpeg');
    response.data.pipe(res);
  } catch (error) {
    console.error('getResourceCover:', error.response?.status, error.message);
    res.status(404).json({ success: false, message: 'Couverture introuvable' });
  }
};

// ── Signaler une ressource ────────────────────────────────────────────────
exports.reportResource = async (req, res) => {
  try {
    const { id } = req.params;
    const { raison } = req.body;
    const [rows] = await db.execute('SELECT id FROM community_resources WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ressource introuvable' });

    await db.execute(
      'INSERT INTO community_reports (resource_id, reporter_id, raison) VALUES (?, ?, ?)',
      [id, req.user.id, raison || null]
    );
    await logActivity(req.user.id, 'signaler', 'community_resource', id, raison || null);

    res.status(201).json({ success: true, message: 'Signalement envoyé' });
  } catch (error) {
    console.error('reportResource:', error.message);
    res.status(500).json({ success: false, message: 'Erreur signalement' });
  }
};

// ── Badge de vérification (Logiciel uniquement) — requiert verifier_logiciels
exports.setVerification = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['verifie', 'dangereux'].includes(status)) {
      return res.status(400).json({ success: false, message: 'status invalide (verifie|dangereux)' });
    }

    const [rows] = await db.execute('SELECT categorie FROM community_resources WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ressource introuvable' });
    const [catRows] = await db.execute('SELECT is_logiciel FROM community_categories WHERE nom = ?', [rows[0].categorie]);
    if (!catRows[0]?.is_logiciel) {
      return res.status(400).json({ success: false, message: 'Vérification réservée aux catégories de type logiciel' });
    }

    await db.execute(
      'UPDATE community_resources SET verification_status = ?, verified_by = ?, verified_at = NOW() WHERE id = ?',
      [status, req.user.id, id]
    );
    await logActivity(req.user.id, status === 'verifie' ? 'verifier_logiciel' : 'marquer_dangereux', 'community_resource', id);

    res.json({ success: true, message: 'Statut de vérification mis à jour' });
  } catch (error) {
    console.error('setVerification:', error.message);
    res.status(500).json({ success: false, message: 'Erreur vérification' });
  }
};

// ── Modération : suppression d'une ressource — requiert moderer_communautaire
exports.deleteResource = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.execute('SELECT fichier_path, cover_image_path FROM community_resources WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Ressource introuvable' });
    const resource = rows[0];

    const username = req.user.nextcloud_username;
    const wd = userWebdav(req);
    try { await wd({ method: 'DELETE', url: `/remote.php/dav/files/${username}${resource.fichier_path}` }); }
    catch (e) { console.error('deleteResource (fichier):', e.response?.status, e.message); }
    if (resource.cover_image_path) {
      try { await wd({ method: 'DELETE', url: `/remote.php/dav/files/${username}${resource.cover_image_path}` }); }
      catch (e) { console.error('deleteResource (cover):', e.response?.status, e.message); }
    }

    await db.execute('DELETE FROM community_resources WHERE id = ?', [id]);
    await logActivity(req.user.id, 'moderer_supprimer', 'community_resource', id);

    res.json({ success: true, message: 'Ressource supprimée' });
  } catch (error) {
    console.error('deleteResource:', error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression ressource' });
  }
};
