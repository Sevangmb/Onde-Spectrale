# 📚 Documentation Technique - Onde Spectrale

## 🏗️ Architecture Générale

### Vue d'ensemble
Onde Spectrale est une application radio post-apocalyptique construite avec Next.js 15, utilisant une architecture moderne basée sur des hooks React optimisés et une intégration IA avancée.

### Composants Principaux

```
src/
├── app/                    # Routes et API Next.js
├── components/             # Composants UI réutilisables
├── hooks/                  # Hooks React personnalisés
├── lib/                    # Utilitaires et configurations
├── shared/                 # État global et stores
├── ai/                     # Flux IA et intégrations
└── styles/                 # Styles globaux
```

## 🎵 Système de Lecture Automatique

### Architecture du usePlaylistManager

Le hook `usePlaylistManager` est le cœur du système de lecture automatique. Il gère :

#### États Principaux
```typescript
const [currentTrack, setCurrentTrack] = useState<PlaylistItem | undefined>();
const [playbackState, setPlaybackState] = useState<PlaybackState>('idle');
const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
const [failedTracks, setFailedTracks] = useState<Set<string>>(new Set());
```

#### Flux de Lecture Automatique

1. **Initialisation** : Quand une station est chargée
   ```typescript
   useEffect(() => {
     if (station && station.playlist.length > 0) {
       const firstTrack = findNextValidTrack();
       if (firstTrack) {
         setCurrentTrack(firstTrack);
       }
     }
   }, [station?.id]);
   ```

2. **Activation Autoplay** : Après la première interaction utilisateur
   ```typescript
   const handleUserInteraction = useCallback(() => {
     if (!playlistManager.autoPlayEnabled) {
       playlistManager.enableAutoPlay();
     }
   }, [playlistManager]);
   ```

3. **Démarrage Automatique** : Quand autoplay est activé
   ```typescript
   useEffect(() => {
     if (autoPlayEnabled && currentTrack && !isPlaying && !isLoadingTrack) {
       // Démarrage automatique de la piste
       getAudioForTrack(trackToPlay, station.djCharacterId, user?.uid, station.theme)
         .then(result => {
           audio.play()
             .then(() => setPlaybackState('playing'))
             .catch(() => setErrorMessage('Cliquez pour démarrer'));
         });
     }
   }, [autoPlayEnabled, currentTrack?.id, isPlaying, isLoadingTrack]);
   ```

4. **Enchaînement Automatique** : À la fin d'une piste
   ```typescript
   const handleAudioEnded = useCallback(() => {
     if (isMountedRef.current) nextTrack();
   }, [nextTrack]);
   ```

### Gestion des Erreurs et Échecs

Le système inclut une gestion robuste des erreurs :

```typescript
// Auto-skip des pistes qui échouent
setTimeout(() => {
  const currentIndex = station.playlist.findIndex(t => t.id === trackId);
  let nextTrack = null;
  
  for (let i = 1; i <= station.playlist.length; i++) {
    const nextIndex = (currentIndex + i) % station.playlist.length;
    const track = station.playlist[nextIndex];
    if (!failedTracks.has(track.id)) {
      nextTrack = track;
      break;
    }
  }
  
  if (nextTrack) {
    setCurrentTrack(nextTrack);
  }
}, 1500);
```

## 🎛️ Intégration Plex Media Server

### Configuration Plex

```typescript
// src/lib/plex.ts
const PLEX_SERVER_URL = process.env.PLEX_SERVER_URL;
const PLEX_TOKEN = process.env.PLEX_TOKEN;

export async function searchPlexMusic(query: string, limit: number = 10) {
  const searchUrl = `${PLEX_SERVER_URL}/search?query=${query}&type=10&X-Plex-Token=${PLEX_TOKEN}`;
  // Recherche dans la bibliothèque musicale
}
```

### Génération de Playlists avec Plex

```typescript
// Génération hybride : Messages IA + Musique Plex
const plexTracks = await getRandomPlexTracks(undefined, 10);
let plexIndex = 0;

for (const [index, item] of items.entries()) {
  if (item.type === 'message') {
    // Garder le message généré par IA
    playlistWithIds.push({ ...item, type: 'message' });
  } else {
    // Remplacer par une vraie piste Plex
    if (plexTracks[plexIndex]) {
      playlistWithIds.push({
        ...plexTracks[plexIndex],
        content: item.content // Garder le contexte IA
      });
      plexIndex++;
    }
  }
}
```

## 🤖 Système IA et Génération Vocale

### Architecture Genkit

```typescript
// src/ai/flows/generate-dj-audio.ts
export const generateDjAudio = defineFlow({
  name: 'generateDjAudio',
  inputSchema: z.object({
    message: z.string(),
    characterId: z.string(),
  }),
  outputSchema: z.object({
    audioBase64: z.string(),
  }),
}, async (input) => {
  const character = DJ_CHARACTERS.find(c => c.id === input.characterId);
  const prompt = `Tu es ${character.name}. ${character.description}...`;
  
  // Génération TTS avec voix spécifique
  const ttsResponse = await textToSpeech.synthesize({
    input: { text: input.message },
    voice: character.voice,
    audioConfig: { audioEncoding: 'LINEAR16' }
  });
  
  return { audioBase64: ttsResponse.audioContent };
});
```

### Flux de Génération Audio

1. **Message DJ** → Génération TTS → Audio Base64
2. **Piste Musicale** → Recherche Plex → URL Streaming
3. **Gestion Cache** → Évite la regénération inutile

## ⚡ Optimisations Performances

### Memoization des Composants

```typescript
// Composants lourds memoizés pour éviter les re-renders
const MemoizedAudioPlayer = React.memo(AudioPlayer);
const MemoizedSpectrumAnalyzer = React.memo(SpectrumAnalyzer);
const MemoizedEnhancedPlaylist = React.memo(EnhancedPlaylist);
```

### Hooks Optimisés

```typescript
// useMemo pour calculs coûteux
const particleStyles = useMemo<ParticleStyle[]>(() => 
  Array.from({ length: 15 }, (_, i) => ({
    left: `${(i * 7 + Math.sin(i) * 20) % 100}%`,
    top: `${(i * 13 + Math.cos(i) * 20) % 100}%`,
    animationDelay: `${(i * 0.3) % 5}s`,
    animationDuration: `${3 + (i % 4)}s`,
  })), []
);

// useCallback pour fonctions stables
const handleUserInteraction = useCallback(() => {
  if (!audioContextEnabled) {
    setAudioContextEnabled(true);
  }
  if (!playlistManager.autoPlayEnabled) {
    playlistManager.enableAutoPlay();
  }
}, [audioContextEnabled, playlistManager]);
```

### Gestion des Dépendances React

Pour éviter les dépendances circulaires :

```typescript
// ❌ Problématique
const nextTrack = useCallback(() => {
  playTrackById(nextId); // Dépendance circulaire
}, [playTrackById]);

// ✅ Solution
const nextTrack = useCallback(() => {
  setCurrentTrack(nextTrack); // Déclenchement via état
  // L'effet autoplay gère la lecture
}, []);
```

## 🛡️ Gestion d'Erreurs

### ErrorBoundary

```typescript
class RadioErrorBoundary extends React.Component {
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 Radio Error:', error, errorInfo);
    // Log vers service monitoring
  }
  
  render() {
    if (this.state.hasError) {
      return <RadioErrorFallback />;
    }
    return this.props.children;
  }
}
```

### Gestion Browser Autoplay

```typescript
// Respect des restrictions navigateur
try {
  await audio.play();
  setPlaybackState('playing');
} catch (playError) {
  console.warn('Autoplay bloqué par le navigateur:', playError);
  setPlaybackState('paused');
  setErrorMessage('🎵 Cliquez pour démarrer la lecture audio');
}
```

## 📊 Monitoring et Logs

### Logs Structurés

```typescript
console.log('🎵 Autoplay activé - démarrage automatique de la piste');
console.log('✅ Piste Plex trouvée:', plexTrack.title, 'par', plexTrack.artist);
console.log('🔄 Playlist terminée, recommencement depuis le début');
console.error('❌ Erreur de connexion à Plex:', plexError);
```

### Métriques Importantes

- Taux de succès des lectures automatiques
- Erreurs Plex vs succès
- Temps de chargement des pistes
- Interactions utilisateur requises

## 🔧 Configuration et Déploiement

### Variables d'Environnement Critiques

```bash
# Core Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=onde-spectrale-prod
GOOGLE_CLOUD_PROJECT_ID=onde-spectrale-prod

# Plex Integration
PLEX_SERVER_URL=http://plex.local:32400
PLEX_TOKEN=secret_token

# Performance
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
```

### Build Optimisé

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start -p 3000",
    "analyze": "ANALYZE=true npm run build"
  }
}
```

Cette architecture garantit une expérience utilisateur fluide avec une lecture automatique robuste, une intégration Plex transparente, et des performances optimisées.