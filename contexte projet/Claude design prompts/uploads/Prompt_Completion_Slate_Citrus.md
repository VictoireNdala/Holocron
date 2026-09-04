# Prompt de complétion — Direction "Slate & Citrus" (à coller dans Claude Design)

```
Nous avons retenu la direction "SLATE & CITRUS" pour Gougoul Holocron (fond gris
vrai #0B0B0C sombre / #FAFAFA clair, accent unique citron #C4F042, typographie
minimaliste, cartes sans bordure, esprit outil pro épuré). Merci, le rendu sur le
tableau de bord étudiant, la connexion, l'explorateur, le panel admin et les
paramètres est excellent — on garde exactement ce système de design.

Il manque des écrans pour compléter le parcours. Complète UNIQUEMENT en Slate &
Citrus (plus besoin de Meridian ni Aurora), en gardant la même barre latérale,
la même typographie, les mêmes composants (boutons, badges, cartes) déjà établis.

── 1. CORRECTION D'UN DÉTAIL SUR L'ÉCRAN "PANEL ADMIN" ──────────────────────
Dans la barre latérale du Panel Admin, l'élément actif surligné est actuellement
"Paramètres" par erreur. Ajoute une entrée dédiée "Administration" dans la
navigation (visible uniquement pour le rôle admin) et surligne-la comme active
sur cet écran.

── 2. ÉCRANS MANQUANTS (clair + sombre, desktop 1440px) ─────────────────────

A) Soumissions — vue ÉTUDIANT
   Liste des devoirs avec statut clair : "À rendre" (accent citron ou neutre
   selon urgence), "Rendu" (neutre/gris avec coche), "En retard" (rouge discret,
   utilisé avec parcimonie car l'identité Slate&Citrus limite les couleurs).
   Chaque ligne : titre du devoir, cours/filière, échéance, statut, action
   (bouton "Déposer" en accent citron si à rendre, "Voir" si déjà rendu).

B) Soumissions — vue PROFESSEUR / ASSISTANT
   En haut : bouton "Nouveau devoir" (accent citron). Liste des devoirs créés,
   chacun dépliable pour voir les rendus reçus (nom étudiant, fichier, date de
   dépôt, bouton télécharger). Indiquer le nombre de rendus reçus / attendus.

C) Cours partagés
   Bibliothèque par filière (Génie Logiciel, Intelligence Artificielle,
   Systèmes Informatiques) : une carte par filière avec nombre de fichiers,
   date de dernier ajout. Vue étudiant = lecture seule (pas de bouton
   d'upload visible). Vue professeur/assistant = bouton "Ajouter un document"
   visible sur chaque carte. Barre de recherche en haut.

D) Corbeille
   Liste des éléments supprimés : nom, taille, date de suppression, temps
   restant avant purge automatique (ex. "Purge dans 24 jours"). Deux actions
   par ligne : "Restaurer" (accent citron) et "Supprimer définitivement"
   (texte rouge discret, confirmation requise). État vide si la corbeille
   est vide ("Rien à restaurer pour l'instant").

── 3. TABLEAUX DE BORD MANQUANTS (clair + sombre, desktop 1440px) ───────────

E) Tableau de bord PROFESSEUR / ASSISTANT
   Reprendre la structure du dashboard étudiant déjà validé, mais adapter le
   contenu : nombre de devoirs actifs, soumissions en attente de correction
   (mise en avant), aperçu des cours qu'il gère, raccourci "Créer un devoir".
   Pas de jauge de stockage personnelle en avant (ou plus discrète) —
   privilégier les métriques d'activité pédagogique.

F) Tableau de bord ADMINISTRATEUR
   Vue système : nombre total d'utilisateurs (par rôle), stockage global
   utilisé, état du serveur, activité récente (inscriptions, dépôts dans
   l'espace communautaire à modérer). Raccourcis vers "Gérer les
   utilisateurs" et "Gérer les matricules autorisés".

── 4. VERSIONS MOBILE (390px) ────────────────────────────────────────────────
Décline TOUS les écrans ci-dessus, PLUS le dashboard étudiant, la connexion,
l'explorateur et les paramètres déjà faits, en version mobile 390px :
- Navigation latérale desktop → barre de navigation inférieure fixe (icônes +
  labels courts) sur mobile, cohérente avec l'esprit épuré Slate & Citrus.
- Les cartes et tableaux passent en empilement vertical sur une seule colonne.
- Le panel admin (souvent utilisé sur desktop) peut rester desktop-only si tu
  le juges pertinent, mais propose au moins une version mobile simplifiée.

── 5. ÉTATS À PRÉVOIR (au moins pour Explorateur, Soumissions, Cours partagés,
      Espace communautaire, Corbeille) ────────────────────────────────────────
- État CHARGEMENT : squelettes (rectangles gris pulsants) à la place du
  contenu, cohérents avec la palette Slate & Citrus.
- État VIDE : déjà bien amorcé sur le dashboard ("Aucun dépôt pour
  l'instant") — généraliser ce style (icône discrète + titre + phrase courte)
  à tous les écrans qui peuvent être vides.
- État ERREUR : message court avec bouton "Réessayer", ton neutre, pas
  alarmiste.

Présente les nouveaux écrans groupés par thème (Soumissions, Cours partagés,
Corbeille, Dashboards, Mobile, États) pour faciliter la revue.
```
