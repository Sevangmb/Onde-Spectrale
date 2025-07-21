#!/bin/bash

# 🚀 Onde Spectrale - Script de Déploiement Automatisé
# Ce script prépare et déploie l'application sur Firebase App Hosting

set -e  # Arrête le script en cas d'erreur

echo "🎛️ Onde Spectrale - Déploiement en cours..."
echo "=================================================="

# Vérification des prérequis
echo "🔍 Vérification des prérequis..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI n'est pas installé."
    echo "📦 Installation de Firebase CLI..."
    npm install -g firebase-tools
fi

# Vérification du fichier d'environnement
if [ ! -f ".env.local" ]; then
    echo "⚠️  Fichier .env.local manquant!"
    echo "📋 Copiez .env.example vers .env.local et configurez vos variables."
    echo "💡 Consultez docs/DEPLOYMENT.md pour plus d'informations."
    exit 1
fi

echo "✅ Prérequis vérifiés"

# Installation des dépendances
echo "📦 Installation des dépendances..."
npm install

# Vérification TypeScript
echo "🔍 Vérification TypeScript..."
npm run typecheck

# Build de l'application
echo "🏗️ Build de l'application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Échec du build. Vérifiez les erreurs ci-dessus."
    exit 1
fi

echo "✅ Build réussi"

# Vérification de la connexion Firebase
echo "🔐 Vérification de la connexion Firebase..."
firebase projects:list > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "🔑 Connexion à Firebase..."
    firebase login
fi

# Déploiement
echo "🚀 Déploiement sur Firebase App Hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo "=================================================="
    echo "🎉 Déploiement réussi!"
    echo "📡 Votre radio post-apocalyptique est en ligne!"
    echo ""
    echo "🔗 URL de votre application:"
    firebase hosting:channel:list --json | grep '"url"' | head -1 | sed 's/.*"url": *"\([^"]*\)".*/\1/' 2>/dev/null || echo "Consultez la Firebase Console pour l'URL"
    echo ""
    echo "🔧 Pour surveiller votre application:"
    echo "   • Firebase Console: https://console.firebase.google.com"
    echo "   • Logs en temps réel: firebase functions:log"
    echo ""
    echo "📚 Guides utiles:"
    echo "   • Configuration: docs/DEPLOYMENT.md"
    echo "   • Statut projet: docs/STATUS.md"
    echo "=================================================="
else
    echo "❌ Échec du déploiement. Vérifiez les erreurs ci-dessus."
    echo "💡 Consultez docs/DEPLOYMENT.md pour le troubleshooting."
    exit 1
fi