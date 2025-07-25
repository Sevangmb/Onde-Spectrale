# 🎵 Effets Sonores Radio - FreeSound.org Integration

Cette documentation explique l'intégration des effets sonores radio utilisant des échantillons de **FreeSound.org** pour créer une expérience radio authentique et immersive.

## 🔊 Fonctionnalités

### Types d'Effets Sonores

1. **Static (Statique)** 🌫️
   - Bruits de fond radio classiques
   - Utilisés lors de perte de signal
   - Ambiance de radio vintage

2. **Interference (Interférence)** ⚡
   - Parasites électromagnétiques 
   - Signaux faibles ou perturbés
   - Effets de fréquence instable

3. **Tuning (Recherche)** 🔍
   - Sons de recherche de station
   - Balayage des fréquences
   - Changement de station

4. **Beep (Signaux)** 📶
   - Bips de démarrage radio
   - Signaux d'alerte
   - Sons système

5. **Ambient (Ambiance)** 🌊
   - Atmosphère post-apocalyptique
   - Sons de fond continus
   - Immersion thématique

## 🚀 Utilisation

### Dans le Composant Radio Principal

Les effets sonores s'activent automatiquement :

- **Démarrage** : Séquence de démarrage radio avec bip + static
- **Changement de fréquence** : Son de tuning lors du scan
- **Signal faible** : Interférence automatique si signal < 50%  
- **Pas de station** : Static continu en boucle
- **Signal fort** : Arrêt automatique des parasites

### Hook useRadioSoundEffects

```typescript
const radioSounds = useRadioSoundEffects({
  volume: 0.3,           // Volume (0-1)
  enableEffects: true,   // Activer/désactiver
  fadeInDuration: 300,   // Durée fade-in (ms)
  fadeOutDuration: 200   // Durée fade-out (ms)
});

// Méthodes disponibles
radioSounds.playStatic(loop);        // Static
radioSounds.playInterference(loop);  // Interférence  
radioSounds.playTuning();           // Son de recherche
radioSounds.playRadioStartup();     // Séquence démarrage
radioSounds.stopEffect();           // Arrêter tout
```

### Interface de Contrôle

Accédez aux contrôles via `/admin/plex` :

- **Volume** : Curseur 0-100%
- **Activation/Désactivation** : Toggle effets
- **Actions Rapides** : Boutons pour tester les effets
- **Bibliothèque** : Prévisualisation de tous les sons
- **État** : Visualisation de l'effet en cours

## 📂 Architecture

### Fichiers Créés

1. **`src/lib/freesound.ts`**
   - Service principal FreeSound
   - Collection d'effets pré-sélectionnés
   - Fonctions utilitaires

2. **`src/hooks/useRadioSoundEffects.ts`**
   - Hook React pour gestion audio
   - Contrôle du volume et fade
   - Gestion des états

3. **`src/components/RadioSoundControls.tsx`**
   - Interface utilisateur complète
   - Contrôles en temps réel
   - Prévisualisation des effets

### Integration Points

- **`OndeSpectraleRadio.tsx`** : Effets automatiques selon contexte
- **Admin Plex** : Interface de test et configuration
- **Station Changes** : Transitions sonores fluides

## 🎯 Effets Contextuels

Le système adapte automatiquement les sons selon la situation :

```typescript
// Contextes disponibles
'station_change'   → Son de tuning
'frequency_drift'  → Interférence 
'signal_loss'      → Static en boucle
'startup'          → Bip de démarrage
'shutdown'         → Static d'arrêt
```

## 🔧 Configuration

### URLs FreeSound.org

Les effets utilisent des échantillons haute qualité de FreeSound.org :

- Tous les fichiers sont en MP3 basse qualité (preview)
- Durée optimisée (1-10 secondes)
- Licence libre d'utilisation
- Qualité audio vintage authentique

### Personnalisation

Pour ajouter de nouveaux effets :

1. Modifier `RADIO_SOUND_EFFECTS` dans `freesound.ts`
2. Ajouter l'URL FreeSound.org du preview
3. Spécifier le type et la durée
4. Tester via l'interface admin

## 🎵 Exemples d'Utilisation

### Effet au Changement de Station
```typescript
// Automatique lors du scan
handleScanUp() {
  radioSounds.playTuning();
  // ... changement fréquence
}
```

### Ambiance Signal Faible
```typescript
// Automatique selon qualité signal
if (signalStrength < 50) {
  radioSounds.playInterference(true); // En boucle
}
```

### Séquence de Démarrage
```typescript
// Au montage du composant
useEffect(() => {
  setTimeout(() => {
    radioSounds.playRadioStartup();
  }, 500);
}, []);
```

## 🌟 Avantages

- **Immersion** : Expérience radio authentique
- **Réactivité** : Effets automatiques contextuels  
- **Contrôle** : Interface complète pour l'admin
- **Performance** : Fichiers optimisés et légers
- **Flexibilité** : Système extensible et configurable

L'intégration FreeSound.org transforme votre radio web en véritable expérience vintage immersive ! 🎙️✨