const express        = require('express');
const router         = express.Router();
const fileController = require('../controllers/fileController');
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

router.get('/list',     authMiddleware, fileController.listFiles);
router.post('/upload',  authMiddleware, fileController.uploadMiddleware, fileController.uploadFile);
router.get('/download', authMiddleware, fileController.downloadFile);
router.post('/mkdir',   authMiddleware, fileController.createFolder);
router.delete('/delete',authMiddleware, checkRole('professeur','assistant'), fileController.deleteFile);

// Données réelles Dashboard
router.get('/quota',  authMiddleware, fileController.getQuota);
router.get('/shared', authMiddleware, fileController.getSharedFolders);

module.exports = router;
