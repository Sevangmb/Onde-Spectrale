# 🛠️ Guide de Dépannage - Onde Spectrale

## 🚨 Problèmes Courants et Solutions

### 🎵 Problèmes de Lecture Audio

#### ❌ "Autoplay bloqué par le navigateur"
**Symptômes :** La playlist ne démarre pas automatiquement, message d'erreur visible.

**Causes :**
- Politique autoplay du navigateur (Chrome, Firefox, Safari)
- Aucune interaction utilisateur préalable
- Audio context non activé

**Solutions :**
```typescript
// 1. Vérifier l'interaction utilisateur
if (!audioContextEnabled) {
  // Afficher bouton "Activer l'audio"
  setErrorMessage('🎵 Cliquez pour démarrer la lecture audio');
}

// 2. Activer l'autoplay après interaction
const handleUserInteraction = () => {
  setAudioContextEnabled(true);
  if (!playlistManager.autoPlayEnabled) {
    playlistManager.enableAutoPlay();
  }
};
```

**Test de diagnostic :**
```bash
# Dans la console navigateur
navigator.mediaSession.setActionHandler('play', () => {
  console.log('Autoplay autorisé');
});
```

#### ❌ "Pistes qui ne s'enchaînent pas"
**Symptômes :** La première piste joue mais s'arrête, pas de passage automatique.

**Solutions :**
1. **Vérifier l'event listener `ended`** :
```typescript
useEffect(() => {
  const audio = audioRef.current;
  if (audio) {
    audio.addEventListener('ended', handleAudioEnded);
    return () => audio.removeEventListener('ended', handleAudioEnded);
  }
}, [handleAudioEnded]);
```

2. **Contrôler l'état autoplay** :
```javascript
// Dans la console navigateur
console.log('Autoplay enabled:', playlistManager.autoPlayEnabled);
```

#### ❌ "Pistes qui bouclent infiniment"
**Symptômes :** La même piste recommence sans fin.

**Causes :**
- Logique `nextTrack` cassée
- Index de playlist incorrect
- Toutes les autres pistes marquées comme "failed"

**Solution :**
```typescript
// Debug dans la console
console.log('Current track:', playlistManager.currentTrack?.id);
console.log('Failed tracks:', Array.from(playlistManager.failedTracks));
console.log('Playlist length:', playlistManager.playlistLength);

// Reset des pistes échouées si nécessaire
// (Ajouter fonction de reset dans le hook)
```

### 🌐 Problèmes Plex

#### ❌ "Erreur de connexion à Plex"
**Symptômes :** Messages "Aucune musique disponible dans le répertoire Plex"

**Diagnostic :**
```bash
# Test de connectivité Plex
curl -X GET "http://your-plex-server:32400/library/sections?X-Plex-Token=YOUR_TOKEN"

# Vérifier les variables d'environnement
echo $PLEX_SERVER_URL
echo $PLEX_TOKEN
```

**Solutions :**
1. **Vérifier la configuration** :
```env
# .env.local
PLEX_SERVER_URL=http://192.168.1.100:32400
PLEX_TOKEN=your_actual_token_here
```

2. **Tester manuellement** :
```typescript
// Dans la console navigateur (côté client)
fetch('/api/test-plex')
  .then(r => r.json())
  .then(console.log);
```

3. **Vérifier les permissions Plex** :
   - Token valide et non expiré
   - Bibliothèque musicale accessible
   - Serveur Plex en fonctionnement

#### ❌ "Plex trouve des pistes mais ne les joue pas"
**Causes :**
- URLs Plex incorrectes
- Problèmes CORS
- Transcoding nécessaire

**Solutions :**
```typescript
// Vérifier l'URL de la piste
console.log('Plex track URL:', track.url);

// Tester l'accès direct
const testAudio = new Audio(track.url);
testAudio.play()
  .then(() => console.log('✅ URL Plex accessible'))
  .catch(e => console.error('❌ Erreur URL Plex:', e));
```

### 🔥 Problèmes Firebase

#### ❌ "Permission denied" Firestore
**Solutions :**
1. **Vérifier les règles Firestore** :
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /stations/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

2. **Vérifier l'authentification** :
```typescript
// Debug auth
import { auth } from '@/lib/firebase';
console.log('Current user:', auth.currentUser);
```

#### ❌ "TTS generation failed"
**Diagnostic :**
```bash
# Vérifier les clés API
gcloud auth list
gcloud config get-value project

# Test API TTS
curl -X POST \
  "https://texttospeech.googleapis.com/v1/text:synthesize?key=YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input":{"text":"Test"},"voice":{"languageCode":"fr-FR"},"audioConfig":{"audioEncoding":"MP3"}}'
```

### ⚡ Problèmes de Performance

#### ❌ "Application lente, re-renders excessifs"
**Diagnostic :**
```typescript
// Activer React DevTools Profiler
// Identifier les composants qui re-render

// Vérifier les hooks optimisés
console.log('Renders count:', renderCount);
```

**Solutions :**
1. **Vérifier la memoization** :
```typescript
// Composants lourds doivent être memoizés
const MemoizedComponent = React.memo(HeavyComponent);

// useCallback pour fonctions stables
const stableFunction = useCallback(() => {
  // logic
}, [stableDependency]);
```

2. **Optimiser les dépendances** :
```typescript
// ❌ Dépendance instable
useEffect(() => {
  // logic
}, [objectDependency]); // Objet qui change à chaque render

// ✅ Dépendance stable
useEffect(() => {
  // logic
}, [objectDependency.stableProperty]);
```

### 🐛 Erreurs React Common

#### ❌ "Cannot read property of undefined"
**Solutions :**
```typescript
// Optional chaining et default values
const title = track?.title ?? 'Titre inconnu';
const playlist = station?.playlist || [];

// Guards dans les hooks
if (!station || !station.playlist.length) return;
```

#### ❌ "Maximum update depth exceeded"
**Causes :** Dépendances circulaires dans useEffect

**Solution :**
```typescript
// ❌ Problématique
useEffect(() => {
  setCount(count + 1); // count dans les dépendances
}, [count]);

// ✅ Fonctionnel
useEffect(() => {
  setCount(c => c + 1); // Fonction de mise à jour
}, []); // Pas de dépendance
```

## 🔍 Outils de Debug

### 1. Console Commands Utiles

```javascript
// État complet de l'application
window.debugRadio = () => ({
  radioStore: useRadioStore.getState(),
  currentTrack: playlistManager?.currentTrack,
  isPlaying: playlistManager?.isPlaying,
  autoPlayEnabled: playlistManager?.autoPlayEnabled,
  failedTracks: Array.from(playlistManager?.failedTracks || [])
});

// Dans la console : debugRadio()
```

### 2. Logs Structurés

```typescript
// Pattern de log structuré
const logAction = (action: string, data: any) => {
  console.log(`🎵 [${new Date().toISOString()}] ${action}:`, data);
};

// Usage
logAction('TRACK_START', { trackId, title: track.title });
logAction('AUTOPLAY_ENABLED', { userId: user?.uid });
```

### 3. Network Debugging

```bash
# Monitorer les requêtes réseau
# Chrome DevTools > Network > Filter par 'Fetch/XHR'

# Logs serveur
npm run dev 2>&1 | grep ERROR
```

## 📋 Checklist de Diagnostic

### Pour un nouveau problème :

1. **🔍 Reproduire** : Steps exacts pour reproduire
2. **📊 Logs** : Console browser + logs serveur
3. **🌐 Réseau** : Vérifier les appels API dans Network tab
4. **💾 État** : Dump de l'état React avec outils debug
5. **🔧 Config** : Vérifier variables d'environnement
6. **📱 Navigateur** : Tester sur différents navigateurs
7. **🧪 Isolation** : Tester avec données minimales

### Informations à collecter :

```bash
# Version système
node --version
npm --version

# Environnement
echo $NODE_ENV
echo $NEXT_PUBLIC_APP_ENV

# Build info
git rev-parse HEAD
git status --porcelain
```

## 🆘 Support et Escalation

Si le problème persiste après ces étapes :

1. **📝 Documenter** le problème avec tous les logs
2. **🎥 Enregistrer** une vidéo de reproduction si possible
3. **📊 Fournir** l'état complet de l'application
4. **🔧 Inclure** la configuration et versions

Cette approche systématique permet de résoudre 90% des problèmes courants rapidement et efficacement.