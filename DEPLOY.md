# 🚀 Déploiement Rapide - Onde Spectrale

## Instructions Ultra-Rapides

### 1. Configuration des Variables
```bash
# Copiez le template d'environnement
cp .env.example .env.local

# Éditez .env.local avec vos vraies clés Firebase/Genkit
```

### 2. Déploiement Automatique
```bash
# Déploiement complet automatisé
npm run deploy

# OU déploiement Firebase direct
npm run deploy:firebase

# OU déploiement Vercel
npm run deploy:vercel
```

### 3. Variables d'Environnement Requises
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GOOGLE_GENAI_API_KEY`

### 4. Vérification Post-Déploiement
- [ ] Page d'accueil accessible
- [ ] Authentification fonctionne
- [ ] Radio interactive répond
- [ ] Admin accessible après login

## Liens Utiles
- [Guide détaillé](docs/DEPLOYMENT.md)
- [Status du projet](docs/STATUS.md)
- [Repository](https://github.com/Sevangmb/Onde-Spectrale)

---
**Ready for the wasteland! 📡💀**