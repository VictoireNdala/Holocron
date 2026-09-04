const express = require('express');
const router  = express.Router();
const communityController = require('../controllers/communityController');
const { authMiddleware, checkPermission } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Référentiels de classification (voir DECISIONS.md D-2026-09-04-01)
router.get('/faculties', communityController.listFaculties);
router.get('/levels',    communityController.listLevels);

// Catalogue — post-modération, ouvert à tous (voir DECISIONS.md D-2026-09-04-02)
router.get('/community/resources',     communityController.listResources);
router.get('/community/resources/:id', communityController.getResource);
router.post('/community/resources',    communityController.uploadMiddleware, communityController.createResource);
router.get('/community/resources/:id/download', communityController.downloadResource);
router.get('/community/resources/:id/cover',     communityController.getResourceCover);
router.post('/community/resources/:id/report',  communityController.reportResource);

// Modération / vérification — permissions déléguées (Panel Admin avancé, D2)
router.patch('/community/resources/:id/verification', checkPermission('verifier_logiciels'), communityController.setVerification);
router.delete('/community/resources/:id',              checkPermission('moderer_communautaire'), communityController.deleteResource);

module.exports = router;
