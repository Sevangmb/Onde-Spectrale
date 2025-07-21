# Guide de Déploiement - Onde Spectrale

## 🚀 **Déploiement Firebase App Hosting**

### 1. **Prérequis**
- Node.js 18+ installé
- Firebase CLI installé (`npm install -g firebase-tools`)
- Projet Firebase configuré
- Variables d'environnement configurées

### 2. **Variables d'Environnement**

Créez un fichier `.env.local` avec vos clés Firebase :

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Genkit AI Configuration
GOOGLE_GENAI_API_KEY=your_genai_key
```

### 3. **Commandes de Déploiement**

```bash
# 1. Installer les dépendances
npm install

# 2. Vérifier le build
npm run build

# 3. Se connecter à Firebase
firebase login

# 4. Déployer sur Firebase App Hosting
firebase deploy --only hosting
```

### 4. **Configuration Firebase App Hosting**

Le fichier `apphosting.yaml` est déjà configuré avec :
- 1 instance maximum (ajustable selon le trafic)
- Configuration optimisée pour Next.js 15

### 5. **Vérifications Post-Déploiement**

Après le déploiement, testez :
- [ ] Page d'accueil charge correctement
- [ ] Authentification fonctionne
- [ ] Radio interactive répond
- [ ] Pages admin accessibles après login
- [ ] Création de stations fonctionne
- [ ] Génération de voix DJ opérationnelle

### 6. **Optimisations Production**

- **Firestore Rules** : Vérifiez les règles de sécurité
- **Storage Rules** : Configurez les permissions pour les fichiers audio
- **Rate Limiting** : Surveillez l'utilisation de l'API Archive.org
- **Monitoring** : Activez Firebase Analytics

### 7. **Domaine Personnalisé (Optionnel)**

```bash
# Ajouter un domaine personnalisé
firebase hosting:channel:deploy production --expires 30d
```

### 8. **Troubleshooting**

**Problème**: Build échoue
**Solution**: Vérifiez les types TypeScript et les imports

**Problème**: Authentification ne fonctionne pas
**Solution**: Vérifiez les variables d'environnement et les domaines autorisés

**Problème**: Génération de voix échoue
**Solution**: Vérifiez la clé API Google Genkit

---

## 🌐 **Alternative : Déploiement Vercel**

Si vous préférez Vercel (recommandé pour Next.js) :

```bash
# 1. Installer Vercel CLI
npm install -g vercel

# 2. Déployer
vercel

# 3. Configurer les variables d'environnement dans le dashboard Vercel
```

---

## 📊 **Monitoring Post-Déploiement**

1. **Firebase Console** : Surveillez l'utilisation Auth/Firestore
2. **Google Cloud Console** : Monitoring Genkit AI
3. **Vercel Analytics** : Si déployé sur Vercel
4. **Archive.org API** : Surveillez les quotas

---

**Status** : Prêt pour déploiement production  
**Dernière mise à jour** : 16 juillet 2025