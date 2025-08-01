# 🔥 Firebase CLI - Guide de Démarrage Rapide

## ✅ Installation Complète

Firebase CLI **14.11.1** est installée et configurée pour le projet Onde Spectrale !

## 🚀 Commandes Essentielles

### Développement Local
```bash
# Démarrer tous les émulateurs
npm run firebase:emulators

# Émulateurs spécifiques
npm run firebase:emulators:auth      # Authentification
npm run firebase:emulators:firestore # Base de données
npm run firebase:emulators:storage   # Stockage de fichiers
```

### Gestion du Projet
```bash
# Vérifier le statut
npm run firebase:status

# Configuration initiale
npm run firebase:setup

# Authentification
npm run firebase:login
```

### Déploiement
```bash
# Déploiement complet (build + deploy)
npm run firebase:deploy

# Hébergement uniquement
npm run firebase:deploy:hosting

# Règles de sécurité uniquement
npm run firebase:deploy:rules
```

### Sauvegarde
```bash
# Créer une sauvegarde Firestore
npm run firebase:backup
```

## 🌐 Accès aux Émulateurs

Une fois les émulateurs démarrés :

- **🎛️ Interface Firebase** : http://localhost:4000
- **🗄️ Firestore** : http://localhost:8080
- **🔐 Auth** : http://localhost:9099
- **📁 Storage** : http://localhost:9199

## 📋 Configuration Actuelle

### ✅ Projet Configuré
- **Nom** : onde-spectrale
- **ID** : onde-spectrale
- **Statut** : ✅ Actif

### ✅ Services Configurés
- **Firestore** : Base de données NoSQL
- **Authentication** : Gestion des utilisateurs
- **Storage** : Stockage de fichiers
- **Hosting** : Hébergement web

### ✅ Fichiers de Configuration
- `.firebaserc` - Alias de projet
- `firebase.json` - Configuration des services
- `firestore.rules` - Règles de sécurité Firestore
- `firestore.indexes.json` - Index de base de données
- `storage.rules` - Règles de sécurité Storage

## 🛠️ Scripts Utiles

### Script Principal
```bash
# Script interactif complet
./scripts/firebase-setup.sh

# Ou directement
bash scripts/firebase-setup.sh
```

### Actions Rapides
```bash
# Statut du projet
./scripts/firebase-setup.sh status

# Configuration complète
./scripts/firebase-setup.sh setup

# Démarrer émulateurs
./scripts/firebase-setup.sh emulators

# Arrêter émulateurs
./scripts/firebase-setup.sh stop

# Déployer les règles
./scripts/firebase-setup.sh deploy

# Sauvegarder les données
./scripts/firebase-setup.sh backup
```

## 🔧 Variables d'Environnement

Pour le développement local, créez `.env.local` :

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=onde-spectrale.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onde-spectrale
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=onde-spectrale.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Émulateurs pour développement
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
FIREBASE_STORAGE_EMULATOR_HOST=localhost:9199
```

## 📱 Intégration avec l'Application

### Connexion Firebase
Le projet utilise déjà Firebase avec :
- Configuration dans `src/lib/firebase.ts`
- Actions serveur dans `src/app/actions.ts`
- Services dans `src/services/`

### Développement Recommandé
1. **Démarrer les émulateurs** : `npm run firebase:emulators`
2. **Développer localement** : `npm run dev`
3. **Tester en local** : Utiliser l'interface sur http://localhost:4000
4. **Déployer** : `npm run firebase:deploy`

## 🚨 Troubleshooting

### Problèmes Courants

1. **Émulateurs ne démarrent pas**
   ```bash
   # Tuer les processus Firebase existants
   pkill -f firebase  # macOS/Linux
   taskkill /f /im firebase.exe  # Windows
   
   # Redémarrer
   npm run firebase:emulators
   ```

2. **Erreur d'authentification**
   ```bash
   # Se reconnecter
   firebase logout
   firebase login
   ```

3. **Port déjà utilisé**
   ```bash
   # Vérifier les ports (4000, 8080, 9099, 9199)
   netstat -an | findstr :4000
   ```

### Support
- 📚 [Documentation Firebase](https://firebase.google.com/docs)
- 🔧 [Guide d'installation complet](./INSTALL_FIREBASE_CLI.md)
- 📋 Script interactif : `./scripts/firebase-setup.sh`

## 🎯 Prochaines Étapes

1. **Tester les émulateurs** : `npm run firebase:emulators`
2. **Configurer les variables d'environnement** (si nécessaire)
3. **Déployer une première version** : `npm run firebase:deploy`
4. **Intégrer dans le workflow CI/CD**

Firebase CLI est maintenant complètement intégrée à votre projet Onde Spectrale ! 🎉