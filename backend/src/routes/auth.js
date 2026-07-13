const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Inscription avec matricule
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Déconnexion
router.post('/logout', authController.logout);

// Vérifier si un matricule est valide
router.get('/verify-matricule/:matricule', authController.verifyMatricule);

module.exports = router;

