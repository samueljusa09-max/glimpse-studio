# Glimpse Studio

Je veux créer mon site comme Grok,,qu’il pareil identique, et donne fonction après je vais intégrer le moyen de paiement swychr .  Crée une application web full-stack / mobile-first complète comprenant :
1) Une interface utilisateur (Frontend Client) qui est un CLONE EXACT de l'application mobile Grok.
2) Un BUREAU D'ADMINISTRATION PROFESSIONNEL (Back-Office Admin) sécurisé, modulaire, multi-rôles, avec gestion des prix d'abonnement,  et support client.

==================================================
1. COMPTE ADMINISTRATEUR PRINCIPAL
==================================================
- L'adresse e-mail administrateur par défaut (Super Admin) doit être : samueljusa09@gmail.com
- Ce compte dispose de tous les droits d'accès initiaux sur le Bureau d'Admin (/admin).

==================================================
2. INTERFACE CLIENT (CLONE GROK)
==================================================
- Thème Ultra-Dark (#000000), cartes #121212, typographie moderne.
- Écran Accueil/Studio :
  * Carrousel horizontal "Animez vos photos".
  * Grille de cartes "Modèles en vedette" (vidéo Edit, Reimagine vidéo Animé ).
  Je te envoyé l’interface de Grok et la vidéo j’espère que tu sais comment le reproduire pareil.
- Écran Paramètres :
  * Profil utilisateur ("Samuel Jusa / @SamuelJusa").
  * Bannière bleue dégradée "Essayer SuperGrok...".
  * Rubriques : Application, Grok, Données & Informations, Autres, Déconnexion.
  * Bouton "Support & Aide" : ouvre un tchat direct avec l'équipe support.
  * Bouton "S'abonner / Recharger" : je vais intégrer le paiement swychr 
==================================================
3. BUREAU D'ADMINISTRATION PROFESSIONNEL (ADMIN DASHBOARD /admin)
==================================================
Séparé en 6 MODULES STRICTS avec système RBAC (Gestion des rôles et autorisations) :

--- A. MODULE FINANCES & PASSERELLES DE PAIEMENT ---
- Gestion des Abonnements & Tarifs :
  * Interface pour définir et modifier les prix des offres (ex: Formule Standard à 4.99 $/mois, Formule Pro à 9.99 $/mois).
.
  * Lorsque l'utilisateur clique sur "S'abonner" côté client, ici je vais intégrer le paiement .
  

--- B. MODULE SUPPORT & MESSAGERIE CLIENTS ---
- Interface Helpdesk / Inbox professionnelle style Intercom.
- Gestion des tickets / conversations envoyés par les utilisateurs depuis le site client.
- Statuts des conversations : [Nouveau], [En cours], [Résolu].
- Envoi de réponses texte/images ou audio en temps réel + réponses pré-enregistrées et suggestions de messages.
- Option d'assigner un ticket à un membre de l'équipe support.



--- D. MODULE GESTION DES UTILISATEURS & QUOTAS ---
- Liste complète des utilisateurs inscrits (Recherche, Filtres, Statut d'abonnement).
- Configuration des Quotas : Définir la limite quotidienne/mensuelle de messages, images et vidéos par utilisateur.
- Actions d'urgence : Accorder des crédits manuellement, suspendre/bannir un compte, réinitialiser un quota.

--- E. MODULE ÉQUIPE & RÔLES (RBAC) ---
- Gestion des accès collaborateurs avec 4 niveaux de permissions :
  1. SUPER ADMIN (ex: samueljusa09@gmail.com) : Accès total illimité.
  2. OPERATEUR SUPPORT : Accès EXCLUSIF au module Support & Chat client. (Aucun accès aux clés API ni aux liens de paiement/finances).
  3. MANAGER CONTENU : Gestion de la modération, des galeries et des utilisateurs.
  4. COMPTABLE / FINANCES : Accès uniquement aux statistiques de ventes, tet revenus.
- Module d'invitation de nouveaux membres par e-mail avec attribution de rôle.
- Journal d'audit (Audit Logs) : Historique daté de toutes les actions réalisées par l'équipe.

--- F. MODULE STATISTIQUES & MARGES ---
- Graphiques de suivi du Chiffre d'Affaires (Revenus abonnements) vs Coûts API  consommés.
- Calcul en temps réel de la marge bénéficiaire nette.

==================================================
4. ARCHITECTURE TECHNIQUE
==================================================
- Frontend & UI : React / Tailwind CSS.
- Service API centralisé (`apiConfig.js`) .
- Système de routes sécurisées et protégées selon le rôle utilisateur.  L’idée de reproduire entièrement Grok sans erreur, sans changer quelques choses.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/890e79f0-de3d-4091-99dc-6db5742a0147).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
