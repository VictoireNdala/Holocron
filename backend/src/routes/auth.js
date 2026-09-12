const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiters');

// Inscription avec matricule
router.post('/register', authLimiter, authController.register);

// Connexion — la route la plus sensible (bruteforce direct sur bcrypt/MySQL,
// indépendant de la protection Nextcloud, voir CONTEXT.md piège #14)
router.post('/login', authLimiter, authController.login);

// Déconnexion
router.post('/logout', authController.logout);

// Vérifier si un matricule est valide — énumération possible des matricules
// valides, même limite que le reste de l'authentification
router.get('/verify-matricule/:matricule', authLimiter, authController.verifyMatricule);

// Changer le mot de passe (compte connecté)
router.post('/change-password', authLimiter, authMiddleware, authController.changePassword);

module.exports = router;

