# 📝 Changelog - Onde Spectrale

Toutes les modifications notables de ce projet seront documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Versioning Sémantique](https://semver.org/spec/v2.0.0.html).

## [0.9.5] - 2025-01-26

### 🎵 Ajouté
- **Lecture automatique complète des playlists**
  - Démarrage automatique après la première interaction utilisateur
  - Enchaînement automatique des pistes à la fin de chaque lecture
  - Bouclage intelligent des playlists quand elles arrivent à la fin
  - Respect des restrictions d'autoplay des navigateurs modernes

- **Intégration Plex Media Server**
  - Connexion complète avec serveur Plex pour musique réelle
  - Recherche intelligente dans la bibliothèque musicale
  - Génération de playlists hybrides (Messages IA + Musique Plex)
  - Fallback automatique vers musique aléatoire

- **Optimisations performance**
  - Memoization des composants lourds (AudioPlayer, SpectrumAnalyzer, EnhancedPlaylist)
  - Hooks React optimisés avec useCallback et useMemo
  - Réduction des re-renders inutiles
  - Gestion intelligente des dépendances React

- **Composants de chargement (Skeletons)**
  - AudioPlayerSkeleton pour le lecteur audio
  - PlaylistSkeleton pour les listes de lecture
  - SpectrumSkeleton pour l'analyseur de spectre
  - StationSkeleton pour les informations de station

- **Gestion d'erreurs robuste**
  - ErrorBoundary pour capturer les erreurs React
  - Gestion automatique des pistes qui échouent
  - Passage automatique à la piste suivante en cas d'erreur
  - Messages d'erreur contextuels pour l'utilisateur

### 🔧 Modifié
- **Architecture des hooks refactorisée**
  - Résolution des dépendances circulaires dans usePlaylistManager
  - Logique inline pour éviter les références instables
  - Gestion cohérente du cycle de vie des composants
  - Stabilité des arrays de dépendances useEffect

- **Interface utilisateur améliorée**
  - Indicateurs visuels d'autoplay ("PLAYLIST AUTO ♪")
  - Boutons d'activation audio plus intuitifs
  - Messages de statut en temps réel
  - Thème Pip-Boy/Fallout plus immersif

- **Système de génération de playlists**
  - Intégration de vraies pistes Plex au lieu de placeholders
  - Conservation du contexte IA avec métadonnées Plex
  - Meilleure répartition messages/musique
  - Régénération automatique en cas d'échec

### 🐛 Corrigé
- **Erreurs React critiques**
  - `ReferenceError: Cannot access 'playTrackById' before initialization`
  - `useEffect changed size between renders` 
  - Dépendances circulaires dans les hooks
  - Re-renders excessifs des composants memoizés

- **Problèmes de lecture audio**
  - Autoplay bloqué définitivement par les navigateurs
  - Pistes qui ne s'enchaînent pas automatiquement
  - Playlist qui ne redémarre pas à la fin
  - Messages d'erreur non informatifs

- **Instabilités de l'application**
  - Internal Server Error 500 lors du chargement
  - Composants qui ne se montent pas correctement
  - États incohérents entre les hooks
  - Memory leaks dans les useEffect

### 📚 Documentation
- **Documentation technique complète** (`docs/TECHNICAL_DOCUMENTATION.md`)
  - Architecture détaillée du système de lecture automatique
  - Guide d'intégration Plex Media Server
  - Patterns d'optimisation performance
  - Monitoring et debugging

- **Architecture des hooks** (`docs/HOOKS_ARCHITECTURE.md`)
  - Documentation détaillée de usePlaylistManager
  - Patterns d'optimisation React
  - Gestion des dépendances circulaires
  - Tests et validation des hooks

- **Guide de dépannage** (`docs/TROUBLESHOOTING.md`)
  - Solutions pour problèmes courants de lecture audio
  - Diagnostic des erreurs Plex et Firebase
  - Outils de debugging et monitoring
  - Checklist de diagnostic systématique

- **README mis à jour**
  - Nouvelles fonctionnalités documentées
  - Configuration Plex expliquée
  - Variables d'environnement complètes
  - Stack technique actualisé

### 🏗️ Technique
- **Nouvelles dépendances**
  - Zustand mis à jour vers 4.5.7
  - Optimisations Next.js 15 avec Turbopack
  - Intégration Service Worker pour PWA

- **Configuration améliorée**
  - Variables d'environnement Plex
  - Configuration Firebase optimisée
  - Rules Firestore et Storage mises à jour
  - Manifeste PWA ajouté

---

## [0.9.0] - 2025-01-20

### 🎉 Version MVP Initiale
- Interface radio post-apocalyptique complète
- Scanner de fréquences interactif
- Création de stations personnalisées
- DJ IA avec génération vocale
- Système de playlists basique
- Authentification Firebase
- Interface d'administration

---

## Prochaines Versions Planifiées

### [0.10.0] - Administration Avancée
- Dashboard admin temps réel
- Analytics et métriques d'écoute
- Monitoring avancé des erreurs
- Navigation admin complète

### [1.0.0] - Version Stable
- Tests unitaires et d'intégration complets
- Documentation API complète
- Pipeline CI/CD
- Optimisations production finales

---

**Légende des types de changements :**
- 🎵 **Ajouté** pour les nouvelles fonctionnalités
- 🔧 **Modifié** pour les changements de fonctionnalités existantes  
- 🐛 **Corrigé** pour les corrections de bugs
- 📚 **Documentation** pour les changements de documentation
- 🏗️ **Technique** pour les changements techniques internes
- 🎉 **Version** pour les jalons majeurs