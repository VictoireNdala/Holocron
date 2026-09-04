const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Inscription avec matricule
router.post('/register', authController.register);

// Connexion
router.post('/login', authController.login);

// Déconnexion
router.post('/logout', authController.logout);

// Vérifier si un matricule est valide
router.get('/verify-matricule/:matricule', authController.verifyMatricule);

// Changer le mot de passe (compte connecté)
router.post('/change-password', authMiddleware, authController.changePassword);

module.exports = router;

