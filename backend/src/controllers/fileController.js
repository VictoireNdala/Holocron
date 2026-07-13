const axios  = require('axios');
const multer = require('multer');
const { nextcloudClient } = require('../config/nextcloud'); // client OCS admin

const NC_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.4:8080';

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
      mimeType:    (block.match(/<d:getcontenttype>(.*?)<\/d:getcontenttype>/i)||[])[1]||''
    });
  }

  return items.sort((a, b) => {
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return  1;
    return a.name.localeCompare(b.name);
  });
};

const PROPFIND_BODY = `<?xml version="1.0" encoding="UTF-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:displayname/><d:getcontentlength/>
    <d:getcontenttype/><d:getlastmodified/><d:resourcetype/>
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
exports.downloadFile = async (req, res) => {
  try {
    const { path } = req.query;
    const username = req.user.nextcloud_username;

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
exports.deleteFile = async (req, res) => {
  try {
    const { path } = req.body;
    const username = req.user.nextcloud_username;

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
// On liste la racine et on filtre ceux dont le nom commence par "Cours".
exports.getSharedFolders = async (req, res) => {
  try {
    const username = req.user.nextcloud_username;
    const response = await userWebdav(req)({
      method:  'PROPFIND',
      url:     `/remote.php/dav/files/${username}/`,
      headers: { 'Depth': '1', 'Content-Type': 'application/xml' },
      data:    PROPFIND_BODY
    });
    const all = parseWebDAV(response.data, username, '/');
    const folders = all
      .filter(f => f.isDirectory && /^cours[-_ ]/i.test(f.name))
      .map(f => ({ name: f.name, path: f.path, size: f.size }));

    res.json({ success: true, folders });
  } catch (error) {
    console.error('getSharedFolders:', error.response?.status, error.message);
    res.status(500).json({ success: false, message: 'Erreur dossiers partagés' });
  }
};
