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

### 📡 **Création de Stations**
- Création de stations personnalisées sur fréquences libres
- Gestion complète des playlists
- Interface d'administration avancée

### 🤖 **DJ IA Personnalisés**
- Personnages DJ prédéfinis (Marcus, Sarah, Tommy)
- Génération vocale IA via Google Cloud TTS
- Messages DJ dynamiques et contextuels

### 🎵 **Gestion Musicale**
- Recherche intégrée Archive.org
- Ajout de musique vintage/libre de droits
- Player audio complet avec analyseur de spectre

## 🛠️ **Stack Technique**

- **Frontend :** Next.js 15, TypeScript, Tailwind CSS
- **Backend :** Firebase (Auth, Firestore, Storage)
- **IA :** Google Genkit + Cloud Text-to-Speech
- **UI :** shadcn/ui, Radix UI
- **Authentification :** Firebase Auth
- **Base de données :** Firestore
- **Hébergement audio :** Firebase Storage

## 📋 **Installation et Développement**

### Prérequis
- Node.js ≥ 18.0.0
- npm ≥ 8.0.0
- Compte Firebase avec TTS activé

### Installation
```bash
git clone https://github.com/Sevangmb/Onde-Spectrale.git
cd Onde-Spectrale
npm install
```

### Configuration
1. Configurer Firebase dans `src/lib/firebase.ts`
2. Ajouter les clés API Google Cloud TTS
3. Configurer les règles Firestore et Storage

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
