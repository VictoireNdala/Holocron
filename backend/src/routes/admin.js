const express = require('express');
const router  = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware, checkAdmin, checkPermission } = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Administrateurs — voir DECISIONS.md D-2026-09-04-05
router.get('/admins',              checkAdmin, adminController.listAdmins);
router.get('/users/search',        checkAdmin, adminController.searchUsers);
router.post('/admins/:userId/grant', checkAdmin, adminController.grantAdmin); // super-only, vérifié dans le contrôleur
router.delete('/admins/:userId',     checkAdmin, adminController.revokeAdmin); // idem

// Dossiers prioritaires — voir DECISIONS.md D-2026-09-04-06
router.get('/priority-folders',    checkAdmin, adminController.listPriorityFolders);
router.post('/priority-folders',   checkPermission('gerer_dossiers'), adminController.createPriorityFolder);
router.delete('/priority-folders/:id', checkPermission('gerer_dossiers'), adminController.deletePriorityFolder);
router.get('/faculty-filieres',    checkAdmin, adminController.listFacultyFilieres);

// Journal d'activité — voir DECISIONS.md D-2026-09-04-07
router.get('/logs', checkPermission('voir_logs'), adminController.listLogs);

// Utilisateurs (Panel Admin base)
router.get('/users',                        checkPermission('gerer_utilisateurs'), adminController.listUsers);
router.patch('/users/:userId/toggle-active', checkPermission('gerer_utilisateurs'), adminController.toggleUserActive);

// Matricules — liste blanche (Panel Admin base)
router.get('/matricules',              checkPermission('gerer_matricules'), adminController.listMatricules);
router.post('/matricules',             checkPermission('gerer_matricules'), adminController.addMatricule);
router.delete('/matricules/:matricule', checkPermission('gerer_matricules'), adminController.deleteMatricule);

module.exports = router;
