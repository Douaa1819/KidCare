# Petitspas – Plateforme SaaS pour crèches

## 🎯 Introduction

Petitspas est une application SaaS complète pour la gestion de crèches et garderies.

L’objectif du projet est de fournir une **plateforme moderne et centralisée** pour :
- la direction / l’administration de la crèche,
- les enseignants,
- les parents.

Elle permet de suivre les inscriptions, la présence des enfants, la communication avec les parents et la gestion quotidienne d’une crèche maternelle.

Ce dépôt contient **deux dossiers uniquement** :
- `frontend/` — application web (Next.js) : login, admin, enseignant, parent
- `backend/` — API (NestJS + Prisma)

> Ne pas utiliser d'autres copies (`creche-api`, `creche-frontend`) — elles ont été supprimées.

---

## ✨ Fonctionnalités principales

### 1. Gestion des inscriptions
- Formulaire d’inscription en plusieurs étapes pour les parents.
- Saisie des informations de l’enfant, des parents, contact, allergies, etc.
- Validation et suivi du statut d’inscription (candidature, en cours, active, rejetée).
- Règlement intérieur intégré, avec case à cocher d’acceptation.

### 2. Espace Admin
- Tableau de bord admin.
- Gestion des enfants inscrits (liste, filtres, recherche, profils détaillés).
- Gestion des inscriptions (vue globale, détails des dossiers).
- Gestion des classes (sections, capacités, tranches d’âge, activation/désactivation).
- Gestion des utilisateurs (admin, enseignants, parents).

### 3. Espace Enseignant
- Accès à un **tableau de bord enseignant**.
- Consultation de la liste des enfants par classe.
- Saisie et suivi des présences des enfants.
- Suivi de certains indicateurs du quotidien (ex : appétit, commentaire, etc. selon le modèle de données).

### 4. Espace Parent
- Tableau de bord parent après connexion.
- Candidature d’inscription en ligne.
- Suivi de l’état du dossier et de la situation de l’enfant.

### 5. Authentification et rôles
- Gestion des rôles : `ADMIN`, `ENSEIGNANT`, `PARENT`.
- Système de connexion sécurisé (JWT côté API, token côté frontend).
- Emails d’invitation envoyés aux utilisateurs avec mot de passe temporaire.

### 6. Gestion des présences & suivi
- Suivi des présences quotidiennes (présent, absent, justifié).
- Enregistrement et consultation par classe / par date.

### 7. Notifications par email
- Envoi d’emails d’invitation aux enseignants et parents.
- Géré via `nodemailer` côté API, avec configuration SMTP.

---

## 🧱 Architecture du projet

Le projet est structuré en **monorepo** avec deux dossiers principaux :

```text
creche-saas/
  ├─ frontend/        # Application web (Next.js, React, Tailwind)
  ├─ backend/         # API backend (NestJS, Prisma, PostgreSQL ou équivalent)
  └─ README.md          # Ce fichier
```

### frontend

Application Next.js moderne, avec :
- **Next.js 16** (App Router) et **React 19**.
- **TypeScript**.
- **Tailwind CSS** pour le design.
- **next-intl** pour l’internationalisation (au moins français et arabe).
- **React Hook Form** + **zod** pour les formulaires et la validation.
- **TanStack React Query** pour la gestion des appels API et du cache.
- **Zustand / Jotai** pour certains états globaux.

Fonctionnalités côté frontend :
- Layouts dédiés selon le rôle (admin, enseignant, parent).
- Pages d’authentification et de connexion.
- Pages d’inscription et tableau de bord parent.
- Pages de gestion pour les admins (enfants, inscriptions, etc.).
- Composants UI (sidebar, tableaux, formulaires, etc.).

### backend

API backend construite avec :
- **NestJS 11** (framework Node.js orienté architecture modulaire).
- **TypeScript**.
- **Prisma** comme ORM pour la base de données.
- **JWT** pour l’authentification.
- **Class-validator / class-transformer** pour la validation des DTOs.
- **Swagger** pour la documentation de l’API.

Fonctionnalités côté API :
- Modélisation des entités : utilisateurs, enfants, classes, inscriptions, présences, etc.
- Routes sécurisées pour les opérations d’admin, parent et enseignant.
- Gestion des statuts (inscription, présence, etc.).
- Service d’email (`EmailService`) pour les invitations et notifications.

---

## 🚀 Démarrage rapide

### 1. Prérequis

- **Node.js** (version récente LTS recommandée)
- **npm** ou **yarn**
- Une base de données compatible Prisma (ex. PostgreSQL) pour l’API.

### 2. Installation des dépendances

Dans le dossier racine `creche-saas`, installer séparément les dépendances du frontend et de l’API :

```bash
# Terminal 1 — API (port 3000)
cd backend
pnpm install
pnpm run start:dev

# Terminal 2 — Frontend (port 3001)
cd frontend
pnpm install
pnpm run dev
```

Puis ouvrir **http://localhost:3001/fr** (login).

### 3. Configuration des variables d’environnement

#### Frontend (`frontend`)
Créer un fichier `.env.local` (ou équivalent) avec par exemple :

```env
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

#### API (`backend`)
Créer un fichier `.env` avec au minimum :

```env
DATABASE_URL="postgresql://user:password@localhost:5432/petitspas"
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
# Liens dans les emails (mot de passe oublié, invitation). En local, ne pas utiliser un domaine non déployé.

# Config SMTP (email)
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...
SMTP_FROM="noreply@votre-domaine.ma"
```

Adapter ces valeurs selon votre environnement.

### 4. Lancer l’API (backend)

Depuis `backend` :

```bash
# Lancer en mode développement
npm run start:dev

# Optionnel : lancer le seed de données si configuré
npm run seed
```

Par défaut, l’API écoute généralement sur `http://localhost:3000`.

### 5. Lancer le frontend

Depuis `frontend` :

```bash
npm run dev
```

Le frontend sera accessible sur :

```text
http://localhost:3001
```

Assurez-vous que `NEXT_PUBLIC_API_URL` pointe bien vers l’URL de l’API.

---

## 🧩 Structure fonctionnelle (résumé)

- **Auth & rôles** : gestion d’utilisateurs `ADMIN`, `ENSEIGNANT`, `PARENT`.
- **Admin** :
  - Gestion des enfants, des classes et des inscriptions.
  - Accès à un tableau de bord global.
- **Enseignant** :
  - Vue de sa classe et des enfants.
  - Saisie des présences et suivi du quotidien.
- **Parent** :
  - Candidature d’inscription en ligne.
  - Suivi du dossier et des informations importantes.
- **Communication** :
  - Emails d’invitation et notifications automatisées.

---

## 🛠️ Qualité, tests et lint

### Frontend

- **ESLint** + **Prettier** pour le linting et le formatage.
- **Vitest** et **Testing Library** pour les tests.

Commandes principales :

```bash
# Lancer le lint
npm run lint

# (Si configuré) Lancer les tests
npm run test
```

### API

- **ESLint** + **Prettier**.
- **Jest** pour les tests unitaires et end-to-end.

Commandes principales :

```bash
# Lint
npm run lint

# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e
```

---

## 📌 Notes

- Le nom de la crèche dans l’application est **Petitspas**.
- Les adresses email techniques (`support@...`, `noreply@...`, etc.) peuvent être adaptées selon votre domaine réel.
- Ce projet est pensé pour être extensible : ajout d’autres modules (facturation, messagerie, planning, etc.) possible à partir de cette base.
