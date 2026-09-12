const express        = require('express');
const router         = express.Router();
const fileController = require('../controllers/fileController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.get('/list',     authMiddleware, fileController.listFiles);
router.post('/upload',  authMiddleware, fileController.uploadMiddleware, fileController.uploadFile);
router.get('/download', authMiddleware, fileController.downloadFile);
router.get('/preview',  authMiddleware, fileController.filePreview);
router.post('/mkdir',   authMiddleware, fileController.createFolder);
// Suppression équilibrée (B2) : ouvert à tous les rôles, la restriction
// "étudiant hors Team Folders Cours-*" est appliquée dans le contrôleur.
router.delete('/delete',authMiddleware, fileController.deleteFile);

// Données réelles Dashboard
router.get('/quota',  authMiddleware, fileController.getQuota);
router.get('/shared', authMiddleware, fileController.getSharedFolders);

// Corbeille (B1) — API trashbin native Nextcloud
router.get('/trash',          authMiddleware, fileController.listTrash);
router.post('/trash/restore', authMiddleware, fileController.restoreFromTrash);
router.delete('/trash/item',  authMiddleware, fileController.purgeTrashItem);
router.delete('/trash/empty', authMiddleware, fileController.emptyTrash);

module.exports = router;
