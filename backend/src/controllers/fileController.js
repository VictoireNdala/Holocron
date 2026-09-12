const axios  = require('axios');
const multer = require('multer');
const fs     = require('fs');
const nodePath = require('path'); // nommé nodePath : `path` est déjà utilisé comme nom de variable (req.query.path)
const { nextcloudClient } = require('../config/nextcloud'); // client OCS admin

const NC_URL  = process.env.NEXTCLOUD_URL || 'http://192.168.1.4:8080';
// Données Nextcloud montées en lecture seule (voir docker-compose.yml) — même
// volume que submissionController, utilisé pour le téléchargement direct (B3).
const NC_DATA = process.env.NC_DATA_DIR || '/nextcloud-data';

// ── Client WebDAV PER-USER ────────────────────────────────────────────────
// Nextcloud 33 bloque l'écriture cross-user par l'admin. On agit donc TOUJOURS
// avec les identifiants du user connecté (username + nc_password attaché par
// authMiddleware). NE PAS revenir à un client WebDAV admin unique.
const userWebdav = (req) => axios.create({
  baseURL: NC_URL,
  auth: {
    username: req.user.nextcloud_username,
    password: req.user.nc_password
  },
  maxContentLength: Infinity,
  maxBodyLength:    Infinity
});

// ── Multer — stockage mémoire, max 500 MB ─────────────────────────────────
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 500 * 1024 * 1024 }
});
exports.uploadMiddleware = upload.single('file');

// ── Parse PROPFIND XML → tableau JSON ────────────────────────────────────
const parseWebDAV = (xml, username, currentPath) => {
  const base  = `/remote.php/dav/files/${username}`;
  const items = [];
  const regex = /<d:response>([\s\S]*?)<\/d:response>/gi;
  let   match;

  while ((match = regex.exec(xml)) !== null) {
    const block    = match[1];
    const href     = decodeURIComponent((block.match(/<d:href>(.*?)<\/d:href>/i)||[])[1]||'');
    const relative = href.replace(base, '').replace(/\/$/, '') || '/';

    const cur = currentPath.replace(/\/$/, '') || '/';
    if (relative === cur || relative + '/' === cur || relative === cur + '/') continue;

    const name = relative.split('/').pop();
    if (!name) continue;

    items.push({
      name,
      path:        relative,
      isDirectory: /<d:collection\s*\/>/i.test(block),
      size:        parseInt((block.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/i)||[])[1]||'0'),
      modified:    (block.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/i)||[])[1]||'',
      mimeType:    (block.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/i)||[])[1]||'',
      // F3 : identifiant Nextcloud numérique du fichier, nécessaire pour
      // demander une prévisualisation via /index.php/core/preview (voir
      // exports.filePreview plus bas) — l'API de preview ne prend pas de
      // chemin, seulement un fileId.
      fileId:      parseInt((block.match(/<oc:fileid>(.*?)<\/oc:fileid>/i)||[])[1]||'0') || null
    });
  }

  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return  1;
    return a.name.localeCompare(b.name);
  });
};

const PROPFIND_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns">
  <d:prop>
    <d:displayname/><d:getcontentlength/>
    <d:getcontenttype/><d:getlastmodified/><d:resourcetype/><oc:fileid/>
  </d:prop>
</d:propfind>`;

// ── Lister les fichiers ───────────────────────────────────────────────────
exports.listFiles = async (req, res) => {
  try {
    const path     = (req.query.path || '/').replace(/\/+$/, '') || '/';
    const username = req.user.nextcloud_username;
    const url      = `/remote.php/dav/files/${username}${path === '/' ? '/' : path + '/'}`;

    const response = await userWebdav(req)({
      method:  'PROPFIND',
      url,
      headers: { 'Depth': '1', 'Content-Type': 'application/xml' },
      data:    PROPFIND_BODY
    });

    const files = parseWebDAV(response.data, username, path);
    res.json({ success: true, files, path });
  } catch (error) {
    console.error('listFiles:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur listage fichiers' });
  }
};

// ── Uploader un fichier ───────────────────────────────────────────────────
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Aucun fichier reçu' });

    const path     = (req.body.path || '/').replace(/\/+$/, '') || '/';
    const username = req.user.nextcloud_username;
    const filePath = `${path}/${req.file.originalname}`;

    await userWebdav(req)({
      method:  'PUT',
      url:     `/remote.php/dav/files/${username}${filePath}`,
      headers: {
        'Content-Type':   req.file.mimetype || 'application/octet-stream',
        'Content-Length': req.file.size
      },
      data: req.file.buffer
    });

    res.json({ success: true, message: 'Fichier uploadé', name: req.file.originalname, path: filePath });
  } catch (error) {
    console.error('uploadFile:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur upload' });
  }
};

// ── Télécharger un fichier ────────────────────────────────────────────────
// B3 — téléchargement direct des gros fichiers : pour un fichier de l'espace
// PERSONNEL (pas un Team Folder Cours-*, stocké ailleurs sur disque via
// groupfolders), on lit directement le disque monté en lecture seule — même
// technique déjà validée par submissionController.downloadSubmission — au
// lieu de faire transiter chaque octet par un aller-retour WebDAV vers
// Nextcloud. Repli WebDAV si le fichier n'est pas trouvé sur le disque
// (Team Folder, ou décalage de layout imprévu) : comportement inchangé.
exports.downloadFile = async (req, res) => {
  const { path } = req.query;
  const username = req.user.nextcloud_username;

  if (path && !/^\/?cours[-_]/i.test(path)) {
    const baseDir  = nodePath.join(NC_DATA, username, 'files');
    const diskPath = nodePath.join(baseDir, path);
    // Confinement : le disque n'est plus protégé par les permissions WebDAV
    // de Nextcloud ici, donc on vérifie nous-mêmes qu'on reste dans le
    // dossier de l'utilisateur avant de lire quoi que ce soit.
    const contained = diskPath === baseDir || diskPath.startsWith(baseDir + nodePath.sep);
    if (contained && fs.existsSync(diskPath) && fs.statSync(diskPath).isFile()) {
      const filename = encodeURIComponent(path.split('/').pop());
      res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
      res.setHeader('Content-Type', 'application/octet-stream');
      return fs.createReadStream(diskPath).pipe(res);
    }
  }

  try {
    const response = await userWebdav(req)({
      method:       'GET',
      url:          `/remote.php/dav/files/${username}${path}`,
      responseType: 'stream'
    });

    const filename = encodeURIComponent(path.split('/').pop());
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${filename}`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    if (response.headers['content-length'])
      res.setHeader('Content-Length', response.headers['content-length']);

    response.data.pipe(res);
  } catch (error) {
    console.error('downloadFile:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur téléchargement' });
  }
};

// ── Prévisualisation (F3) ──────────────────────────────────────────────────
// Proxifie l'API Preview native de Nextcloud (images, vidéos, PDF, Office...
// selon les providers activés côté serveur) avec les identifiants per-user —
// jamais un client admin unique, même règle que le reste de ce fichier.
// L'API de preview de Nextcloud prend un fileId (pas un chemin), d'où
// oc:fileid ajouté au PROPFIND de listFiles ci-dessus.
exports.filePreview = async (req, res) => {
  try {
    const fileId = parseInt(req.query.fileId);
    const size    = Math.min(parseInt(req.query.size) || 200, 512);
    if (!fileId) return res.status(400).json({ success: false, message: 'fileId requis' });

    const response = await userWebdav(req)({
      method:       'GET',
      url:          `/index.php/core/preview?fileId=${fileId}&x=${size}&y=${size}&a=1`,
      responseType: 'stream'
    });

    res.setHeader('Content-Type', response.headers['content-type'] || 'image/png');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    response.data.pipe(res);
  } catch (error) {
    // Pas de préview disponible (provider désactivé côté serveur, type non
    // supporté...) — 404 pour que le frontend retombe sur l'icône générique.
    res.status(404).json({ success: false, message: 'Prévisualisation indisponible' });
  }
};

// ── Créer un dossier ──────────────────────────────────────────────────────
exports.createFolder = async (req, res) => {
  try {
    const { path } = req.body;
    const username = req.user.nextcloud_username;

    await userWebdav(req)({ method: 'MKCOL', url: `/remote.php/dav/files/${username}${path}` });
    res.json({ success: true, message: 'Dossier créé' });
  } catch (error) {
    const s = error.response?.status;
    if (s === 405) return res.status(409).json({ success: false, message: 'Dossier déjà existant' });
    console.error('createFolder:', s, error.message);
    res.status(500).json({ success: false, message: 'Erreur création dossier' });
  }
};

// ── Supprimer un fichier/dossier ─────────────────────────────────────────
// Suppression équilibrée (B2) : un étudiant peut supprimer dans son propre
// espace, mais jamais dans les Team Folders de cours (protégés en lecture
// seule côté Nextcloud de toute façon, mais on renvoie un message clair
// plutôt que de laisser échouer le WebDAV en 403 brut).
exports.deleteFile = async (req, res) => {
  try {
    const { path } = req.body;
    const username = req.user.nextcloud_username;

    if (req.user.role === 'etudiant' && /^\/?cours[-_]/i.test(path || '')) {
      return res.status(403).json({ success: false, message: 'Suppression impossible dans un dossier de cours' });
    }

    await userWebdav(req)({ method: 'DELETE', url: `/remote.php/dav/files/${username}${path}` });
    res.json({ success: true, message: 'Supprimé' });
  } catch (error) {
    console.error('deleteFile:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur suppression' });
  }
};

// ── Quota réel (OCS API, client admin) ────────────────────────────────────
// GET /ocs/v1.php/cloud/users/{username}?format=json → quota {used,total,relative,quota}
exports.getQuota = async (req, res) => {
  try {
    const username = req.user.nextcloud_username;
    const r = await nextcloudClient.get(
      `/ocs/v1.php/cloud/users/${username}?format=json`
    );
    const q = r.data?.ocs?.data?.quota || {};
    const used  = Number(q.used)  || 0;
    // q.quota = limite en octets (-3 = illimité) ; total = used+free si dispo
    const limit = (q.quota && q.quota > 0) ? Number(q.quota)
                : (q.total ? Number(q.total) : 0);
    const relative = q.relative != null ? Number(q.relative)
                   : (limit ? (used / limit) * 100 : 0);

    res.json({ success: true, quota: { used, total: limit, relative } });
  } catch (error) {
    console.error('getQuota:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur quota' });
  }
};

// ── Dossiers partagés (Team Folders Cours-*) visibles par le user ─────────
// Les Team Folders apparaissent à la racine WebDAV du user comme des dossiers.
// On liste la racine avec les propriétés étendues Nextcloud (taille réelle du
// dossier via oc:size + nombre de fichiers via nc:contained-file-count), puis
// on filtre ceux dont le nom commence par "Cours-".
const SHARED_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:oc="http://owncloud.org/ns" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:resourcetype/>
    <oc:size/>
    <nc:contained-file-count/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`;

exports.getSharedFolders = async (req, res) => {
  try {
    const username = req.user.nextcloud_username;
    const base     = `/remote.php/dav/files/${username}`;
    const response = await userWebdav(req)({
      method:  'PROPFIND',
      url:     `${base}/`,
      headers: { 'Depth': '1', 'Content-Type': 'application/xml' },
      data:    SHARED_PROPFIND
    });

    const folders = [];
    const regex = /<d:response>([\s\S]*?)<\/d:response>/gi;
    let m;
    while ((m = regex.exec(response.data)) !== null) {
      const block    = m[1];
      const href     = decodeURIComponent((block.match(/<d:href>(.*?)<\/d:href>/i)||[])[1]||'');
      const relative = href.replace(base, '').replace(/\/$/, '');
      const name     = relative.split('/').pop();
      if (!name || !/^cours[-_ ]/i.test(name)) continue;   // seulement les Team Folders Cours-*
      folders.push({
        name,
        path:      relative,
        size:      parseInt((block.match(/<oc:size>(.*?)<\/oc:size>/i)||[])[1]||'0'),
        fileCount: parseInt((block.match(/<nc:contained-file-count>(.*?)<\/nc:contained-file-count>/i)||[])[1]||'0'),
        modified:  (block.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/i)||[])[1]||''
      });
    }
    res.json({ success: true, folders });
  } catch (error) {
    console.error('getSharedFolders:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur dossiers partagés' });
  }
};

// ── Corbeille (B1) — API trashbin native Nextcloud ─────────────────────────
// Un DELETE WebDAV sur /files/{username}/ déplace déjà l'élément dans la
// corbeille (app trashbin, activée par défaut) : deleteFile() ci-dessus
// alimente donc cette corbeille sans rien changer. Ces routes exposent
// lister/restaurer/purger via l'API DAV dédiée /remote.php/dav/trashbin/.
const TRASH_PROPFIND = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:" xmlns:nc="http://nextcloud.org/ns">
  <d:prop>
    <d:getcontentlength/><d:getlastmodified/><d:resourcetype/>
    <nc:trashbin-filename/><nc:trashbin-original-location/><nc:trashbin-deletion-time/>
  </d:prop>
</d:propfind>`;

exports.listTrash = async (req, res) => {
  try {
    const username = req.user.nextcloud_username;
    const base     = `/remote.php/dav/trashbin/${username}/trash`;

    const response = await userWebdav(req)({
      method:  'PROPFIND',
      url:     `${base}/`,
      headers: { 'Depth': '1', 'Content-Type': 'application/xml' },
      data:    TRASH_PROPFIND
    });

    const items = [];
    const regex = /<d:response>([\s\S]*?)<\/d:response>/gi;
    let m;
    while ((m = regex.exec(response.data)) !== null) {
      const block    = m[1];
      const href     = decodeURIComponent((block.match(/<d:href>(.*?)<\/d:href>/i)||[])[1]||'');
      const relative = href.replace(base, '').replace(/\/$/, '');
      if (!relative) continue; // le dossier corbeille lui-même

      items.push({
        trashPath:    relative,
        name:         (block.match(/<nc:trashbin-filename>(.*?)<\/nc:trashbin-filename>/i)||[])[1] || relative.split('/').pop(),
        originalPath: (block.match(/<nc:trashbin-original-location>(.*?)<\/nc:trashbin-original-location>/i)||[])[1] || '',
        deletedAt:    parseInt((block.match(/<nc:trashbin-deletion-time>(.*?)<\/nc:trashbin-deletion-time>/i)||[])[1]||'0'),
        isDirectory:  /<d:collection\s*\/>/i.test(block),
        size:         parseInt((block.match(/<d:getcontentlength>(.*?)<\/d:getcontentlength>/i)||[])[1]||'0')
      });
    }

    items.sort((a, b) => b.deletedAt - a.deletedAt);
    res.json({ success: true, items });
  } catch (error) {
    console.error('listTrash:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur listage corbeille' });
  }
};

exports.restoreFromTrash = async (req, res) => {
  try {
    const { trashPath } = req.body;
    if (!trashPath) return res.status(400).json({ success: false, message: 'trashPath requis' });

    const username    = req.user.nextcloud_username;
    const destination = `${NC_URL}/remote.php/dav/trashbin/${username}/restore${trashPath}`;

    await userWebdav(req)({
      method:  'MOVE',
      url:     `/remote.php/dav/trashbin/${username}/trash${trashPath}`,
      headers: { Destination: destination }
    });
    res.json({ success: true, message: 'Restauré' });
  } catch (error) {
    console.error('restoreFromTrash:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur restauration' });
  }
};

// Purger un élément précis de la corbeille (suppression définitive)
exports.purgeTrashItem = async (req, res) => {
  try {
    const { trashPath } = req.body;
    if (!trashPath) return res.status(400).json({ success: false, message: 'trashPath requis' });

    const username = req.user.nextcloud_username;
    await userWebdav(req)({ method: 'DELETE', url: `/remote.php/dav/trashbin/${username}/trash${trashPath}` });
    res.json({ success: true, message: 'Supprimé définitivement' });
  } catch (error) {
    console.error('purgeTrashItem:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur purge' });
  }
};

// Vider entièrement la corbeille
exports.emptyTrash = async (req, res) => {
  try {
    const username = req.user.nextcloud_username;
    await userWebdav(req)({ method: 'DELETE', url: `/remote.php/dav/trashbin/${username}/trash/` });
    res.json({ success: true, message: 'Corbeille vidée' });
  } catch (error) {
    console.error('emptyTrash:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur vidage corbeille' });
  }
};
