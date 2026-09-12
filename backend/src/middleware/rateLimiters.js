const rateLimit = require('express-rate-limit');

// Limite globale — protège contre l'abus/déni de service basique sur
// l'ensemble de l'API. Volontairement plus généreuse que la recommandation
// générique (100/15min) : les prévisualisations de fichiers (F3) tirent une
// requête par vignette affichée, un dossier de 30 images en consomme déjà
// autant d'un coup — 100 serait trop strict pour un usage normal ici.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de requêtes, réessayez plus tard.' }
});

// Limite stricte sur les routes d'authentification — Nextcloud a sa propre
// protection anti-bruteforce (piège #14, CONTEXT.md) mais elle ne protège
// pas /api/auth/login lui-même : rien n'empêchait de tester des mots de
// passe en boucle directement contre bcrypt/MySQL avant ce middleware.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Trop de tentatives, réessayez dans quelques minutes.' }
});

module.exports = { apiLimiter, authLimiter };
