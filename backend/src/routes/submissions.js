const express = require('express');
const router  = express.Router();
const submissionController = require('../controllers/submissionController');
const fileController       = require('../controllers/fileController'); // pour uploadMiddleware (multer)
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');

// Devoirs
router.post('/assignments', authMiddleware, checkRole('professeur','assistant'), submissionController.createAssignment);
router.get ('/assignments', authMiddleware, submissionController.listAssignments);

// Soumissions étudiant
router.post('/submit', authMiddleware, checkRole('etudiant'), fileController.uploadMiddleware, submissionController.submit);
router.get ('/my',     authMiddleware, checkRole('etudiant'), submissionController.getMySubmissions);

// Vue prof
router.get ('/received',     authMiddleware, checkRole('professeur','assistant'), submissionController.getReceivedSubmissions);
router.get ('/download/:id', authMiddleware, checkRole('professeur','assistant'), submissionController.downloadSubmission);

module.exports = router;
