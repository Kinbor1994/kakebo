# 🎌 Kakeibo — Finances Zen & Gestion Budgétaire Consciente

> **Kakeibo** (家計簿) est une application web progressive (PWA) de finances personnelles inspirée de la méthode d'épargne japonaise traditionnelle. Elle combine la pleine conscience financière, le suivi des 4 piliers de dépenses, le calcul automatique des prêts et tontines, et une **synchronisation cloud sécurisée sur Neon PostgreSQL**.

---

## ✨ Fonctionnalités Clés

- 📊 **Rituel de Début de Mois (Kakeibo)** : Calcul automatique du *Reste à vivre* (`Revenus - Dépenses Fixes - Épargne Objectif`) découpé en budget hebdomadaire.
- 🧘 **Les 4 Piliers de Dépenses** :
  - **Besoins essentiels** (Vie courante, alimentation, loyer, prêts)
  - **Envies & Plaisirs** (Sorties, loisirs, restaurants)
  - **Culture & Développement** (Livres, formations, spectacles)
  - **Imprévus & Extras** (Urgences médicales, réparations auto/maison)
- 🎓 **Prêts Bancaires & Tontines avec Calcul Automatique** :
  - Calcul dynamique de la mensualité exacte $M = C \times \frac{r}{1-(1+r)^{-n}}$ et du coût total des intérêts.
  - Préréglages rapides : **Prêt Scolaire (10 mois)**, Court terme (6 mois), et Long terme (12m, 24m, 36m, 60m).
- ⏳ **Rituels & Wishlist 48h** : Liste de réflexion avec compte à rebours de 48 heures pour freiner les achats impulsifs non essentiels.
- 🎯 **Cagnottes d'Épargne Multi-Projets** : Suivi visuel des projets financiers avec célébrations confetti.
- ☁️ **Architecture Cloud & Multi-Utilisateurs (Neon PostgreSQL)** :
  - Sauvegarde et synchronisation instantanée de vos finances en ligne.
  - Fonctionnement **Local-First** : l'application reste 100% utilisable hors-ligne via IndexedDB (Dexie.js).
  - Retrouvez l'intégralité de vos données lors d'un changement d'appareil en vous connectant simplement avec votre email.
- 🔒 **Sécurité & Confidentialité** : Code PIN à 4 chiffres, déverrouillage biométrique (Face ID / Empreinte) et chiffrement de session JWT HTTP-Only.
- 📱 **Mobile-First PWA** : Conçue pour une ergonomie tactile parfaite sur smartphone avec bannière d'installation sur l'écran d'accueil.
- 🌍 **Devise Universelle par Défaut** : Franc CFA (F CFA / XOF / XAF), Euro (€), Dollar ($), et personnalisation intégrale des catégories.

---

## 🛠️ Stack Technologique

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Langage** : [TypeScript](https://www.typescriptlang.org/) (Typage strict, zéro `any`)
- **Base de Données Cloud** : [Neon Serverless PostgreSQL](https://neon.tech/) (`@neondatabase/serverless`)
- **Base de Données Locale (Offline-First)** : [Dexie.js](https://dexie.org/) (IndexedDB)
- **Authentification & Session** : [jose](https://github.com/panva/jose) (JWT sécurisé) & [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- **Styles & UI** : [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) (Zéro emoji dans l'UI)
- **Graphiques** : [Recharts](https://recharts.org/) & Canvas Confetti

---

## 🚀 Démarrage Rapide

### 1. Cloner le projet

```bash
git clone https://github.com/votre-compte/kakebo.git
cd kakebo
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer les variables d'environnement

Copiez le fichier d'exemple `.env.example` vers `.env.local` :

```bash
cp .env.example .env.local
```

Renseignez votre chaîne de connexion **Neon PostgreSQL** et une clé secrète JWT :

```env
DATABASE_URL="postgresql://neondb_owner:password@ep-sample-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"
JWT_SECRET="votre-cle-secrete-jwt-de-32-caracteres-minimum"
```

### 4. Lancer le serveur de développement

```bash
npm run dev
```

L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## 📦 Schéma de Base de Données (DDL)

Les tables PostgreSQL créées sur Neon comprennent :

- `users` : Comptes utilisateurs (email, hash du mot de passe).
- `user_settings` : Préférences de devise (XOF, EUR...), catégories et verrouillage.
- `monthly_budgets` : Revenus fixes/variables, charges fixes et objectifs d'épargne.
- `transactions` : Historique des opérations catégorisées par pilier.
- `reflections` : Bilans hebdomadaires et mensuels d'introspection Kakeibo.
- `savings_goals` : Cagnottes d'épargne avec montants cibles et échéances.
- `recurring_items` : Dépenses et revenus récurrents automatiques.
- `wishlist_items` : Achats sous réflexion de 48 heures.
- `debts_and_loans` : Prêts bancaires, tontines et prêts entre particuliers.

---

## 🚢 Déploiement sur Vercel

1. Importez votre dépôt GitHub sur [Vercel](https://vercel.com).
2. Ajoutez les variables d'environnement dans les paramètres du projet Vercel :
   - `DATABASE_URL` : Chaîne de connexion Neon avec pooler (`?sslmode=require`).
   - `JWT_SECRET` : Clé secrète de signature des sessions.
3. Déployez ! Le build Next.js 16 compilera automatiquement les routes statiques et les API endpoints.

---

## 📄 Licence

Ce projet est sous licence MIT.
