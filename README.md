# 📻 Onde Spectrale

> **Radio post-apocalyptique interactive inspirée de Fallout**

Une application radio immersive où les utilisateurs peuvent scanner les fréquences, créer leurs propres stations, et écouter du contenu généré par IA dans un univers post-apocalyptique.

## 🚀 **Statut du Projet**

**Version :** 0.9.5  
**Statut :** MVP Complet - Prêt pour déploiement  
**Completude :** 98% - Fonctionnalités principales terminées

## ✨ **Fonctionnalités Principales**

### 🔍 **Scanner de Fréquences**
- Scan interactif des fréquences 87.0-108.0 MHz
- Simulation d'interférences réalistes  
- Détection automatique des stations disponibles
- Interface vintage Pip-Boy inspirée de Fallout

### 📡 **Création de Stations**
- Création de stations personnalisées sur fréquences libres
- Gestion complète des playlists avec intégration Plex
- Interface d'administration avancée
- Régénération automatique des playlists par IA

### 🤖 **DJ IA Personnalisés**
- Personnages DJ prédéfinis (Marcus, Sarah, Tommy) avec voix uniques
- Création de DJ personnalisés avec voix configurables
- Génération vocale IA via Google Cloud TTS
- Messages DJ dynamiques et contextuels adaptés aux thèmes

### 🎵 **Lecture Automatique et Gestion Musicale**
- **✅ NOUVEAU** : Démarrage automatique des playlists après interaction
- **✅ NOUVEAU** : Enchaînement automatique des pistes
- **✅ NOUVEAU** : Bouclage intelligent des playlists
- Intégration complète avec serveur Plex pour musique réelle
- Player audio complet avec analyseur de spectre temps réel
- Gestion intelligente des erreurs avec passage automatique
- Respect des restrictions d'autoplay des navigateurs

## 🛠️ **Stack Technique**

- **Frontend :** Next.js 15, TypeScript, Tailwind CSS
- **Backend :** Firebase (Auth, Firestore, Storage)
- **IA :** Google Genkit + Cloud Text-to-Speech
- **UI :** shadcn/ui, Radix UI, Lucide React
- **Authentification :** Firebase Auth
- **Base de données :** Firestore
- **Média Server :** Plex Media Server (intégration complète)
- **State Management :** Zustand + React Hooks optimisés
- **Performance :** React.memo, useMemo, useCallback optimisations

## 📋 **Installation et Développement**

### Prérequis
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Compte Firebase avec TTS activé
- Serveur Plex Media Server (optionnel mais recommandé)
- Clés API Google Cloud Platform

### Installation
```bash
git clone https://github.com/Sevangmb/Onde-Spectrale.git
cd Onde-Spectrale
npm install
```

### Configuration

#### 1. Variables d'environnement
Créez un fichier `.env.local` avec :
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_CLOUD_LOCATION=your_location

# Plex Media Server (optionnel)
PLEX_SERVER_URL=http://your-plex-server:32400
PLEX_TOKEN=your_plex_token
```

#### 2. Configuration Firebase
- Activer Authentication, Firestore, et Storage
- Configurer les règles de sécurité
- Activer Google Cloud Text-to-Speech API

#### 3. Configuration Plex (optionnel)
- Installer Plex Media Server
- Configurer une bibliothèque musicale
- Obtenir le token d'authentification

### Développement
```bash
npm run dev          # Démarre le serveur de développement
npm run genkit:dev   # Lance l'environnement Genkit AI
npm run test         # Lance les tests
npm run build        # Build de production
```

## 📖 **Documentation Complète**

- [📊 Statut détaillé](./docs/STATUS.md) - État complet du projet
- [🎯 Plan Admin](./docs/ADMIN_INTERFACE_PLAN.md) - Fonctionnalités admin
- [🏗️ Blueprint](./docs/blueprint.md) - Architecture et design
- [🚀 Déploiement](./docs/DEPLOYMENT.md) - Guide de déploiement

## 🎯 **Prochaines Étapes**

### Phase 2 - Administration Avancée
- [ ] Dashboard admin temps réel
- [ ] Analytics et statistiques d'écoute
- [ ] Monitoring des erreurs et logs
- [ ] Navigation admin complète
- [ ] Gestion avancée des rôles

### Phase 3 - Qualité et Tests
- [ ] Tests unitaires et d'intégration
- [ ] Documentation API complète
- [ ] Configuration CI/CD
- [ ] Optimisation performances

## 🤝 **Contribution**

Le projet est maintenu par [Sevangmb](https://github.com/Sevangmb). 

## 📄 **Licence**

Projet privé - Tous droits réservés

---

**🎉 L'application est maintenant un MVP complet et fonctionnel !**

Toutes les fonctionnalités principales sont implémentées et l'application est prête pour le déploiement et l'utilisation.
