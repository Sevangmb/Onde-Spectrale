# Plan de Développement - Interface d'Administration

---

## 🚦 Suivi d'avancement (Juillet 2025)

### ✅ Réalisé
- Lecture automatique playlist (TTS + musiques) avec gestion des erreurs et enchaînement
- Ajout manuel de messages et musiques (UI admin station)
- Affichage de la playlist actuelle
- Encart "État du lecteur" (statique, PlayerStatusCard)

### 🟡 En cours / partiel
- Monitoring du player (statique, à connecter à l'état réel)
- Affichage d'erreurs et feedback utilisateur (pas de logs/historique)
- Ajout de contenu manuel (sans planification avancée)

### ❌ À faire / manquant
- Dashboard général (statut stations, auditeurs, logs, indicateurs)
- Monitoring temps réel du player (état, logs, erreurs, auditeurs)
- Gestion avancée du contenu (catégories, priorités, planification)
- Programmation avancée, modes de rotation, récurrence
- Analytics & statistiques, logs d'écoute
- Système de rôles et permissions
- Paramétrage station & système (couverture, settings, etc.)
- Navigation admin complète (sidebar, header, breadcrumbs)
- Thématisation Fallout/post-apo, responsive, accessibilité

### 📌 Prochaines priorités
1. Connecter PlayerStatusCard à l'état réel du player (WebSocket, Firestore...)
2. Ajouter logs d'erreurs et historique dans l'admin
3. Commencer le dashboard général (statut stations, auditeurs, activité récente)
4. Prototyper la navigation complète admin (sidebar, header...)

---

## Onde Spectrale - Radio Post-Apocalyptique

### 🎯 Vision du Projet
Créer une interface d'administration complète pour gérer un système de radio multi-fréquences inspiré de l'univers Fallout. L'admin permet de configurer les stations, programmer le contenu, et monitorer les diffusions en temps réel.

---

## 📋 Architecture Technique

### Stack Recommandée
- **Frontend** : Next.js 14+ (App Router)
- **UI Framework** : Tailwind CSS + shadcn/ui
- **Backend** : Firebase (Firestore, Storage, Functions)
- **Audio** : Web Audio API + bibliotheque audio streaming
- **État Global** : Zustand ou Context API
- **Authentification** : Firebase Auth

### Structure des Données (Firestore)

```
collections/
├── stations/
│   ├── {stationId}/
│   │   ├── name: string
│   │   ├── frequency: number
│   │   ├── description: string
│   │   ├── isActive: boolean
│   │   ├── theme: string
│   │   ├── coverage: object
│   │   └── settings: object
│
├── content/
│   ├── messages/
│   │   ├── {messageId}/
│   │   │   ├── text: string
│   │   │   ├── audioUrl: string
│   │   │   ├── category: string
│   │   │   ├── priority: string
│   │   │   ├── scheduledAt: timestamp
│   │   │   └── stations: array
│   │
│   └── playlists/
│       ├── {playlistId}/
│       │   ├── name: string
│       │   ├── tracks: array
│       │   ├── tags: array
│       │   └── rotationType: string
│
├── scheduling/
│   ├── programs/
│   │   ├── {programId}/
│   │   │   ├── name: string
│   │   │   ├── schedule: object
│   │   │   ├── content: array
│   │   │   └── recurrence: object
│
└── analytics/
    ├── listeners/
    └── logs/
```

---

## 🎨 Interface Utilisateur

### 1. Layout Principal (`src/app/(admin)/layout.tsx`)

```tsx
// Structure de base à implémenter
const AdminLayout = {
  sidebar: {
    navigation: [
      "Dashboard",
      "Stations",
      "Contenu",
      "Programmation", 
      "Monitoring",
      "Paramètres"
    ]
  },
  header: {
    breadcrumbs: true,
    userMenu: true,
    statusIndicators: true
  },
  theme: "post-apocalyptique"
}
```

### 2. Dashboard (`src/app/(admin)/dashboard/page.tsx`)

**Composants à développer :**
- `StationStatusGrid` - Vue d'ensemble des stations
- `LiveListenersChart` - Graphique temps réel des auditeurs  
- `RecentActivityFeed` - Flux d'activité récente
- `QuickActions` - Boutons d'actions rapides
- `SystemHealthIndicators` - Indicateurs de santé système

**Fonctionnalités :**
- Refresh automatique toutes les 30 secondes
- Alertes en temps réel (notifications push)
- Raccourcis clavier (Ctrl+N nouvelle station, etc.)

### 3. Gestion des Stations (`src/app/(admin)/stations/`)

#### Pages à créer :
- `page.tsx` - Liste des stations
- `create/page.tsx` - Création nouvelle station
- `[id]/edit/page.tsx` - Édition station
- `[id]/preview/page.tsx` - Prévisualisation

**Composants spécialisés :**
```tsx
// StationForm - Formulaire principal
const StationFormFields = {
  basic: {
    name: "string",
    frequency: "number (88.1 - 107.9)",
    description: "textarea",
    theme: "select"
  },
  audio: {
    jingle: "file upload",
    backgroundNoise: "select",
    voiceType: "select",
    audioQuality: "select"
  },
  advanced: {
    coverage: "map selector",
    schedule: "time range picker",
    autoMode: "toggle",
    emergencyOverride: "toggle"
  }
}
```

**Validation des données :**
- Fréquences uniques (pas de doublons)
- Formats audio supportés (mp3, wav, ogg)
- Taille max des fichiers (10MB)
- Noms de station uniques

### 4. Gestion du Contenu (`src/app/(admin)/content/`)

#### 4.1 Messages (`content/messages/`)

**Interface de création de message :**
- **Éditeur de texte** avec prévisualisation TTS
- **Upload audio** avec lecteur intégré
- **Catégorisation** (News, Pub, Alerte, Background)
- **Planification** avec calendrier visuel
- **Multi-sélection de stations**

```tsx
// MessageEditor component structure
const MessageEditor = {
  textInput: "rich text editor",
  audioUpload: "drag & drop + file browser",
  ttsPreview: "text-to-speech conversion",
  scheduling: "date-time picker + recurrence",
  stationSelector: "multi-select avec preview",
  priorityLevel: "radio buttons (Low/Normal/High/Emergency)"
}
```

#### 4.2 Playlists (`content/playlists/`)

**Gestionnaire de playlists :**
- **Bibliothèque musicale** avec upload batch
- **Drag & drop** pour réorganiser les pistes
- **Tags automatiques** (genre, BPM, humeur)
- **Prévisualisation** avec lecteur intégré
- **Modes de rotation** (séquentiel, aléatoire, pondéré)

```tsx
// PlaylistManager component structure
const PlaylistManager = {
  trackLibrary: {
    upload: "batch upload with progress",
    metadata: "auto-extraction + manual edit",
    preview: "built-in audio player",
    tags: "automatic + manual tagging"
  },
  playlistEditor: {
    dragDrop: "reorderable list",
    duration: "total playlist duration",
    transitions: "fade/cut settings",
    shuffle: "weighted shuffle options"
  }
}
```

### 5. Programmation (`src/app/(admin)/scheduling/`)

**Calendrier de programmation :**
- **Vue hebdomadaire/mensuelle** avec slots horaires
- **Drag & drop** pour planifier le contenu
- **Templates** réutilisables (journée type, weekend, etc.)
- **Conflits** automatiquement détectés et signalés
- **Override d'urgence** pour interruptions

```tsx
// ScheduleCalendar component
const ScheduleCalendar = {
  timeSlots: "15min granularity",
  contentTypes: {
    message: "one-time or recurring",
    playlist: "continuous or timed",
    live: "manual override",
    emergency: "priority override"
  },
  templates: {
    daily: "template for standard day",
    weekend: "weekend programming",
    special: "holidays/events"
  }
}
```

### 6. Monitoring (`src/app/(admin)/monitoring/`)

**Dashboard de surveillance :**
- **Stream en temps réel** de ce qui joue
- **Listeners actifs** par station/région
- **Logs de diffusion** avec filtres
- **Graphiques d'audience** interactifs
- **Alertes** configurables

```tsx
// MonitoringDashboard components
const MonitoringComponents = {
  liveStream: {
    currentlyPlaying: "real-time track info",
    waveform: "audio visualization",
    listeners: "live listener count"
  },
  analytics: {
    audienceCharts: "Chart.js integration", 
    geoMap: "listener location mapping",
    popularContent: "most played tracks/messages"
  },
  alerts: {
    streamDown: "connectivity issues",
    lowListeners: "audience drop alerts", 
    contentErrors: "failed audio playback"
  }
}
```

---

## 🔧 Développement par Phases

### Phase 1 : Foundation (2 semaines)
1. **Setup du projet**
   - Configuration Next.js + Firebase
   - Authentication system
   - Basic routing structure
   - Tailwind + shadcn/ui setup

2. **Layout de base**
   - Sidebar navigation
   - Header avec breadcrumbs
   - Theme post-apocalyptique
   - Composants UI de base

### Phase 2 : Core Features (3 semaines)
1. **Gestion des stations**
   - CRUD complet des stations
   - Validation des fréquences
   - Upload et gestion des assets audio
   - Prévisualisation des stations

2. **Dashboard principal**
   - Vue d'ensemble des stations
   - Statistiques de base
   - Alertes système

### Phase 3 : Content Management (3 semaines)
1. **Gestion des messages**
   - Éditeur de messages
   - Text-to-speech integration
   - Upload audio
   - Planification basique

2. **Gestion des playlists**
   - Bibliothèque musicale
   - Création/édition de playlists
   - Lecteur audio intégré

### Phase 4 : Advanced Features (2 semaines)
1. **Programmation avancée**
   - Calendrier de programmation
   - Templates et récurrence
   - Gestion des conflits

2. **Monitoring**
   - Dashboard de surveillance
   - Analytics de base
   - Système d'alertes

### Phase 5 : Polish & Optimization (1 semaine)
1. **UX/UI refinement**
2. **Performance optimization**
3. **Testing et bug fixes**
4. **Documentation utilisateur**

---

## 📱 Responsive Design

### Breakpoints
- **Mobile** (320px-768px) : Navigation collapse, stacked layouts
- **Tablet** (768px-1024px) : Sidebar réduit, grilles adaptées  
- **Desktop** (1024px+) : Full layout, multi-colonnes

### Composants Responsive Prioritaires
- Navigation sidebar (hamburger menu sur mobile)
- Grilles de stations (responsive grid)
- Calendrier de programmation (swipe sur mobile)
- Tableaux de données (scroll horizontal)

---

## 🎵 Audio Integration

### Technologies Audio
```tsx
// Audio pipeline architecture
const AudioSystem = {
  upload: {
    formats: ["mp3", "wav", "ogg", "m4a"],
    maxSize: "10MB per file",
    conversion: "automatic format optimization",
    validation: "audio integrity check"
  },
  streaming: {
    protocol: "HLS or WebRTC",
    quality: "adaptive bitrate",
    latency: "low-latency streaming",
    fallback: "progressive download"
  },
  effects: {
    filters: "vintage radio effects",
    transitions: "crossfade, cut, overlap",
    normalize: "automatic audio leveling",
    static: "configurable background noise"
  }
}
```

### Lecteur Audio Admin
- **Prévisualisation** de tous les contenus
- **Contrôles** : play/pause/skip/volume
- **Visualisation** : waveform, spectrum analyzer
- **Métadonnées** : durée, format, qualité

---

## 🔐 Sécurité & Permissions

### Rôles Utilisateur
```tsx
const UserRoles = {
  superAdmin: {
    permissions: ["all"],
    description: "Accès complet système"
  },
  stationManager: {
    permissions: ["manage-stations", "manage-content", "view-analytics"],
    description: "Gestion des stations assignées"
  },
  contentEditor: {
    permissions: ["edit-messages", "edit-playlists"],
    description: "Création/édition de contenu uniquement"
  },
  viewer: {
    permissions: ["view-dashboard", "view-analytics"],
    description: "Consultation uniquement"
  }
}
```

### Sécurité des Données
- **Validation côté client ET serveur**
- **Sanitisation** des inputs utilisateur
- **Rate limiting** sur les uploads
- **Audit logs** de toutes les actions admin
- **Backup automatique** des configurations

---

## 🧪 Testing Strategy

### Tests Unitaires
```bash
# Components à tester prioritairement
src/
├── components/ui/         # Composants de base
├── components/stations/   # Gestion stations  
├── components/content/    # Gestion contenu
├── hooks/                # Custom hooks
└── utils/                # Fonctions utilitaires
```

### Tests d'Intégration
- **Upload de fichiers audio**
- **Planification de contenu**
- **Streaming en temps réel**
- **Synchronisation Firebase**

### Tests E2E (Playwright)
- **Workflow complet** : création station → ajout contenu → programmation
- **Cas d'erreur** : connexion perdue, fichiers corrompus
- **Performance** : upload de gros fichiers, nombreux listeners

---

## 📈 Monitoring & Analytics

### Métriques Clés
```tsx
const AnalyticsMetrics = {
  stations: {
    activeStations: "nombre de stations actives",
    averageUptime: "temps de fonctionnement moyen",
    contentHours: "heures de contenu par station"
  },
  audience: {
    totalListeners: "nombre total d'auditeurs",
    peakHours: "heures de pic d'écoute", 
    avgSessionDuration: "durée moyenne d'écoute",
    stationPopularity: "classement des stations"
  },
  content: {
    messagesScheduled: "messages programmés",
    playlistsActive: "playlists actives",
    audioLibrarySize: "taille de la bibliothèque"
  },
  system: {
    apiResponseTimes: "temps de réponse API",
    errorRates: "taux d'erreur système",
    storageUsage: "utilisation du stockage"
  }
}
```

---

## 🚀 Déploiement

### Environnements
- **Development** : Firebase Emulator Suite
- **Staging** : Firebase projet de test  
- **Production** : Firebase projet principal

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy Admin Interface
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - checkout
      - setup node.js
      - install dependencies
      - run tests
      - build next.js
      - deploy to firebase hosting
```

### Variables d'Environnement
```bash
# .env.local
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_AUDIO_CDN_URL=
NEXT_PUBLIC_STREAMING_BASE_URL=
```

---

## 🎨 Design System

### Palette Couleurs Post-Apocalyptique
```css
:root {
  --fallout-yellow: #FFD700;
  --fallout-blue: #003F7F;
  --vault-blue: #004B87;
  --rust-orange: #CC6600;
  --wasteland-brown: #8B4513;
  --terminal-green: #00FF00;
  --danger-red: #FF0000;
  --ash-gray: #808080;
}
```

### Typographie
- **Titres** : Police style terminal/monospace
- **Corps de texte** : Sans-serif lisible
- **Données techniques** : Monospace
- **Effets** : Glow, shadow, vintage

### Composants UI Thématiques
- **Boutons** : Style bouton Fallout avec bordures metallic
- **Cards** : Effet carton/métal vieilli
- **Inputs** : Style terminal avec glow
- **Navigation** : Inspiration Pip-Boy
- **Modals** : Overlay avec effet CRT

---

## 📚 Documentation Utilisateur

### Guides à Créer
1. **Quick Start Guide** - Première configuration
2. **Station Management** - Création et gestion des stations  
3. **Content Creation** - Messages et playlists
4. **Scheduling** - Programmation du contenu
5. **Troubleshooting** - Résolution des problèmes courants

### Help System Intégré
- **Tooltips** contextuels sur tous les champs
- **Guides interactifs** pour les workflows complexes
- **FAQ** intégrée avec recherche
- **Vidéos tutorials** (optionnel)

---

## 🔧 Next Steps

### Immédiat (Cette semaine)
1. **Setup projet** Next.js + Firebase
2. **Créer la structure** de base des dossiers
3. **Configurer** Tailwind + shadcn/ui
4. **Mockup** du layout principal

### Court terme (2 semaines)
1. **Authentification** Firebase Auth
2. **Navigation** et routing
3. **Premier CRUD** : gestion des stations
4. **Database schema** Firestore

### Moyen terme (1 mois)
1. **Core features** complètes
2. **Audio integration** basique
3. **Dashboard** fonctionnel
4. **Deploy staging** environment

---

**🎯 Objectif Final :** Une interface d'administration complète, intuitive et thématique pour gérer un système de radio multi-fréquences digne de l'univers Fallout !
