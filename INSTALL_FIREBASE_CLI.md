# 🔥 Firebase CLI Installation & Setup Guide - Onde Spectrale

## ✅ Installation Status

Firebase CLI version **14.11.1** is now installed and ready to use!

## 🚀 Quick Start

### 1. Verify Installation
```bash
firebase --version
# Should show: 14.11.1
```

### 2. Login to Firebase
```bash
# Login to your Firebase account
firebase login

# Follow the authentication flow in your browser
```

### 3. Initialize Firebase in Project
```bash
# Navigate to your project directory
cd /path/to/Onde-Spectrale

# Initialize Firebase (if not already done)
firebase init

# Select services you want to configure:
# - Firestore Database
# - Hosting
# - Functions (if using)
# - Storage
```

## 📋 Alternative Installation Methods

### Method 1: npm (Recommended - Already Done)
```bash
npm install -g firebase-tools
```

### Method 2: Standalone Binary
```bash
# Download and install standalone binary
curl -sL https://firebase.tools | bash
```

### Method 3: Windows Package Managers
```powershell
# Using winget
winget install Google.Firebase

# Using Chocolatey (as Administrator)
choco install firebase-cli

# Using Scoop
scoop install firebase-cli
```

## 🔧 Firebase Project Configuration

### 1. Check Current Project Status
```bash
# Show current Firebase project
firebase projects:list

# Show active project
firebase use
```

### 2. Set Active Project
```bash
# Set your Onde Spectrale project as active
firebase use onde-spectrale-project-id

# Or add project alias
firebase use --add
```

### 3. Check Configuration
```bash
# Show current configuration
firebase list

# Test connection
firebase firestore:indexes
```

## 🏗️ Project Structure for Onde Spectrale

### Expected Firebase Files
```
Onde-Spectrale/
├── firebase.json          # Firebase configuration
├── .firebaserc           # Project aliases
├── firestore.rules       # Security rules
├── firestore.indexes.json # Database indexes
├── storage.rules         # Storage security rules
└── .firebase/           # CLI cache (gitignored)
```

### Sample firebase.json Configuration
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

## 🔐 Authentication & Security

### 1. Login and Authentication
```bash
# Login with Google account
firebase login

# Login in CI/CD environment
firebase login:ci

# Logout
firebase logout

# Check auth status
firebase login:list
```

### 2. Service Account (for CI/CD)
```bash
# Generate service account key
firebase projects:list
firebase use your-project-id

# In Firebase Console:
# Project Settings > Service Accounts > Generate new private key
```

## 🗄️ Database Operations

### Firestore Management
```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Backup Firestore data
firebase firestore:delete --all-collections --recursive

# Import/Export data
firebase firestore:export gs://your-bucket/backup
firebase firestore:import gs://your-bucket/backup
```

### Security Rules Testing
```bash
# Test security rules locally
firebase emulators:start --only firestore

# Run security rules unit tests
firebase emulators:exec --only firestore "npm test"
```

## 🚀 Deployment Commands

### Full Deployment
```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore
firebase deploy --only storage
firebase deploy --only functions
```

### Preview and Staging
```bash
# Preview deployment
firebase hosting:channel:deploy preview

# Deploy to specific target
firebase target:apply hosting production your-production-site
firebase deploy --only hosting:production
```

## 🧪 Local Development & Emulators

### Start Emulator Suite
```bash
# Start all emulators
firebase emulators:start

# Start specific emulators
firebase emulators:start --only firestore,auth

# Start with specific ports
firebase emulators:start --port 4000
```

### Emulator Configuration
```json
{
  "emulators": {
    "auth": {
      "port": 9099
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "storage": {
      "port": 9199
    },
    "ui": {
      "enabled": true,
      "port": 4000
    }
  }
}
```

## 📊 Monitoring & Analytics

### Project Information
```bash
# Get project info
firebase projects:list

# Get project details
firebase projects:get

# Usage statistics
firebase use --add
```

### Performance Monitoring
```bash
# List performance data
firebase performance:data:get

# Configure alerts
firebase alerts:list
```

## 🔧 Integration with Onde Spectrale

### Environment Configuration
Create `.env.local` for development:
```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Emulator settings (for development)
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

### Git Integration
Add to `.gitignore`:
```bash
# Firebase
.firebase/
firebase-debug.log
firestore-debug.log
ui-debug.log

# Firebase Functions
functions/node_modules/
functions/.env
```

### NPM Scripts Integration
Add to `package.json`:
```json
{
  "scripts": {
    "firebase": "firebase",
    "firebase:emulators": "firebase emulators:start",
    "firebase:deploy": "firebase deploy",
    "firebase:deploy:hosting": "npm run build && firebase deploy --only hosting",
    "firebase:login": "firebase login",
    "firebase:init": "firebase init"
  }
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Run as administrator or check npm permissions
   npm config get prefix
   npm config set prefix /usr/local  # macOS/Linux
   ```

2. **Authentication Issues**
   ```bash
   # Clear and re-authenticate
   firebase logout
   firebase login --reauth
   ```

3. **Project Not Found**
   ```bash
   # Check project list and set correct project
   firebase projects:list
   firebase use your-correct-project-id
   ```

4. **Emulator Issues**
   ```bash
   # Clear emulator cache
   firebase emulators:exec --clear-cache
   
   # Kill existing processes
   pkill -f firebase  # macOS/Linux
   taskkill /f /im firebase.exe  # Windows
   ```

5. **Deployment Failures**
   ```bash
   # Check build output
   npm run build
   
   # Verify firebase.json configuration
   firebase deploy --debug
   ```

### Performance Tips

1. **Use Project Aliases**
   ```bash
   firebase use --add
   # Create staging, production aliases
   ```

2. **Optimize Deployments**
   ```bash
   # Deploy only changed files
   firebase deploy --only hosting:changed
   ```

3. **Use Emulators for Development**
   ```bash
   # Always use emulators in development
   firebase emulators:start
   ```

## 🎯 Next Steps

1. **Initialize Firebase in project**: `firebase init`
2. **Configure Firestore rules**: Set up security rules
3. **Set up emulators**: For local development
4. **Configure CI/CD**: Automated deployments
5. **Monitor usage**: Set up alerts and monitoring

## 📚 Additional Resources

- [Firebase CLI Reference](https://firebase.google.com/docs/cli)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)
- [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)

Firebase CLI is now ready for your Onde Spectrale project! 🎉