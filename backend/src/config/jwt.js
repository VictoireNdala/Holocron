// JWT_SECRET doit être défini explicitement via l'environnement — plus de
// valeur par défaut ('holocron_secret_2024') qui traînait dans le code et
// dans docker-compose.yml : n'importe qui avec accès au dépôt pouvait
// forger un token valide pour n'importe quel compte, un cran plus grave
// que les autres identifiants déjà acceptés comme compromis pour ce
// contexte campus fermé (ceux-là ne contournent pas l'authentification
// elle-même). Échec explicite au démarrage plutôt qu'un défaut silencieux.
if (!process.env.JWT_SECRET) {
  throw new Error(
    "JWT_SECRET manquant dans l'environnement. Définir une valeur forte et " +
    "unique dans docker-compose.yml (variable JWT_SECRET du service backend) " +
    '— ne jamais réutiliser une ancienne valeur connue/commitée.'
  );
}

module.exports = process.env.JWT_SECRET;
