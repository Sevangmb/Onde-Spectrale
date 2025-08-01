# 📡 Onde Spectrale - API Reference

> Complete API documentation for server actions and API routes

## 📋 Table of Contents

- [**Server Actions**](#server-actions) - Next.js Server Actions for data operations
- [**API Routes**](#api-routes) - REST API endpoints
- [**Service Layer APIs**](#service-layer-apis) - Business logic service interfaces
- [**Type Definitions**](#type-definitions) - TypeScript interfaces and types
- [**Error Handling**](#error-handling) - Error responses and codes
- [**Authentication**](#authentication) - Auth requirements and patterns

---

## 🚀 Server Actions

Server Actions are the primary method for data operations in Onde Spectrale. All actions are located in `src/app/actions.ts`.

### Station Management

#### `getStationById`
Retrieves a specific station by its ID.

```typescript
async function getStationById(stationId: string): Promise<Station | null>
```

**Parameters:**
- `stationId`: Unique identifier for the station

**Returns:**
- `Station` object if found, `null` if not found

**Example:**
```typescript
const station = await getStationById('station-123');
if (station) {
  console.log(`Found station: ${station.name}`);
}
```

#### `getStationsForUser`
Retrieves all stations owned by a user, including system stations.

```typescript
async function getStationsForUser(userId: string): Promise<Station[]>
```

**Parameters:**
- `userId`: User ID to filter stations by

**Returns:**
- Array of `Station` objects

**Example:**
```typescript
const userStations = await getStationsForUser('user-456');
console.log(`User has ${userStations.length} stations`);
```

#### `getNearestStation`
Finds the station closest to a given frequency.

```typescript
async function getNearestStation(frequency: number): Promise<Station | null>
```

**Parameters:**
- `frequency`: Target frequency (87.0-108.0)

**Returns:**
- Nearest `Station` object or `null`

#### `createStation`
Creates a new radio station.

```typescript
async function createStation(formData: FormData): Promise<ActionResult>
```

**FormData Fields:**
- `name`: Station name (min 3 characters)
- `frequency`: Station frequency (number)
- `djCharacterId`: DJ character ID
- `theme`: Station theme (min 3 characters)
- `ownerId`: Owner user ID

**Returns:**
```typescript
type ActionResult = {
  success?: boolean;
  error?: string;
  stationId?: string;
}
```

**Example:**
```typescript
const formData = new FormData();
formData.append('name', 'Wasteland Radio');
formData.append('frequency', '94.5');
formData.append('djCharacterId', 'marcus');
formData.append('theme', 'Post-apocalyptic music');
formData.append('ownerId', 'user-123');

const result = await createStation(formData);
if (result.success) {
  console.log(`Station created with ID: ${result.stationId}`);
}
```

#### `updateStation`
Updates station properties.

```typescript
async function updateStation(
  stationId: string, 
  updates: Partial<Station>
): Promise<Station | null>
```

**Parameters:**
- `stationId`: Station ID to update
- `updates`: Partial station object with fields to update

**Returns:**
- Updated `Station` object or `null` if not found

#### `createDefaultStations`
Creates system default stations.

```typescript
async function createDefaultStations(): Promise<void>
```

**Note:** This is typically called during system initialization.

### Playlist Management

#### `addMusicToStation`
Adds a music track to a station's playlist.

```typescript
async function addMusicToStation(
  stationId: string, 
  musicTrack: PlaylistItem
): Promise<ActionResult>
```

**Parameters:**
- `stationId`: Target station ID
- `musicTrack`: `PlaylistItem` object to add

**Returns:**
- `ActionResult` with success/error status

#### `deletePlaylistItem`
Removes a track from a station's playlist.

```typescript
async function deletePlaylistItem(
  stationId: string, 
  trackId: string
): Promise<Station | null>
```

**Parameters:**
- `stationId`: Station containing the track
- `trackId`: ID of track to remove

**Returns:**
- Updated `Station` object or `null`

#### `reorderPlaylistItems`
Reorders playlist items according to new order.

```typescript
async function reorderPlaylistItems(
  stationId: string, 
  newOrder: string[]
): Promise<Station | null>
```

**Parameters:**
- `stationId`: Station to reorder
- `newOrder`: Array of track IDs in desired order

**Returns:**
- Updated `Station` object with reordered playlist

#### `addPlaylistItems`
Adds multiple tracks to a playlist.

```typescript
async function addPlaylistItems(
  stationId: string, 
  tracks: Omit<PlaylistItem, 'id'>[]
): Promise<Station | null>
```

**Parameters:**
- `stationId`: Target station
- `tracks`: Array of track objects (IDs will be generated)

**Returns:**
- Updated `Station` object

#### `regenerateStationPlaylist`
Regenerates a station's playlist using AI.

```typescript
async function regenerateStationPlaylist(stationId: string): Promise<ActionResult>
```

**Parameters:**
- `stationId`: Station to regenerate playlist for

**Returns:**
```typescript
{
  success?: boolean;
  error?: string;
  newPlaylist?: PlaylistItem[];
}
```

### DJ and Character Management

#### `createCustomDj`
Creates a custom DJ character.

```typescript
async function createCustomDj(
  userId: string, 
  formData: FormData
): Promise<ActionResult>
```

**FormData Fields:**
- `name`: DJ name (min 2 characters)
- `background`: DJ background story (min 10 characters)
- `gender`: Voice gender
- `tone`: Voice tone
- `style`: Voice style

**Returns:**
```typescript
{
  success?: boolean;
  error?: string | Record<string, string[]>;
  characterId?: string;
}
```

#### `getCustomCharactersForUser`
Retrieves custom DJ characters for a user.

```typescript
async function getCustomCharactersForUser(userId: string): Promise<CustomDJCharacter[]>
```

**Parameters:**
- `userId`: User ID to get characters for

**Returns:**
- Array of `CustomDJCharacter` objects

### Audio Generation

#### `getAudioForTrack`
Generates or retrieves audio for a playlist track.

```typescript
async function getAudioForTrack(
  track: PlaylistItem,
  djCharacterId: string,
  ownerId: string,
  stationTheme?: string
): Promise<{audioUrl?: string; error?: string}>
```

**Parameters:**
- `track`: The playlist item to get audio for
- `djCharacterId`: DJ character for voice generation
- `ownerId`: Station owner ID
- `stationTheme`: Optional station theme for context

**Returns:**
```typescript
{
  audioUrl?: string;  // Data URL or streaming URL
  error?: string;     // Error message if generation failed
}
```

**Behavior:**
- **Music tracks**: Searches Plex library or returns existing URL
- **Message tracks**: Generates AI voice using specified DJ character
- **Fallback**: Returns random track from Plex if specific search fails

### User Management

#### `updateUserOnLogin`
Updates user data on login/registration.

```typescript
async function updateUserOnLogin(
  userId: string, 
  email: string | null
): Promise<void>
```

**Parameters:**
- `userId`: Firebase user ID
- `email`: User email address

**Behavior:**
- Creates new user document if doesn't exist
- Updates last login timestamp for existing users

#### `updateUserFrequency`
Updates the user's last tuned frequency.

```typescript
async function updateUserFrequency(
  userId: string, 
  frequency: number
): Promise<void>
```

**Parameters:**
- `userId`: User ID
- `frequency`: Last tuned frequency

#### `getUserData`
Retrieves user data with proper serialization.

```typescript
async function getUserData(userId: string): Promise<any>
```

**Parameters:**
- `userId`: User ID to retrieve

**Returns:**
- User data object with serialized timestamps

### Plex Integration

#### `searchPlexMusic`
Searches Plex music library for tracks.

```typescript
async function searchPlexMusic(
  query: string, 
  limit?: number
): Promise<ActionResult>
```

**Parameters:**
- `query`: Search query string
- `limit`: Maximum number of results (default: 10)

**Returns:**
```typescript
{
  success?: boolean;
  error?: string;
  tracks?: PlaylistItem[];
}
```

---

## 🛣️ API Routes

REST API endpoints for external integrations and AJAX calls.

### Plex Integration Routes

#### `GET /api/plex/genres`
Retrieves available music genres from Plex server.

**Response:**
```typescript
{
  genres: string[];
}
```

**Example:**
```bash
curl http://localhost:9002/api/plex/genres
```

#### `GET /api/plex/tracks-by-genre`
Retrieves tracks filtered by genre.

**Query Parameters:**
- `genre`: Genre name to filter by
- `limit`: Number of tracks to return (default: 20)

**Response:**
```typescript
{
  tracks: PlaylistItem[];
  total: number;
}
```

**Example:**
```bash
curl "http://localhost:9002/api/plex/tracks-by-genre?genre=rock&limit=10"
```

### Station Management Routes

#### `GET /api/stations`
Retrieves all public stations.

**Response:**
```typescript
{
  stations: Station[];
}
```

#### `GET /api/stations/[id]`
Retrieves specific station by ID.

**Parameters:**
- `id`: Station ID

**Response:**
```typescript
{
  station: Station | null;
}
```

#### `POST /api/stations`
Creates a new station via REST API.

**Request Body:**
```typescript
{
  name: string;
  frequency: number;
  djCharacterId: string;
  theme: string;
  ownerId: string;
}
```

**Response:**
```typescript
{
  success: boolean;
  stationId?: string;
  error?: string;
}
```

#### `PUT /api/stations/[id]`
Updates a station via REST API.

**Parameters:**
- `id`: Station ID to update

**Request Body:**
```typescript
Partial<Station>
```

**Response:**
```typescript
{
  success: boolean;
  station?: Station;
  error?: string;
}
```

### Monitoring Routes

#### `GET /api/monitoring`
Retrieves system monitoring data and metrics.

**Response:**
```typescript
{
  systemStatus: {
    uptime: number;
    memory: {
      used: number;
      total: number;
    };
    activeStations: number;
    totalUsers: number;
  };
  recentActivity: {
    stationsCreated: number;
    tracksPlayed: number;
    errors: number;
  };
}
```

### Genkit AI Routes

#### `POST /api/genkit/[...flow]`
Executes Genkit AI flows.

**Dynamic Route Parameters:**
- `flow`: Array representing the flow path

**Common Flows:**
- `generateDjAudio`: Generate DJ voice messages
- `generatePlaylist`: Generate playlist content
- `generateThemedMessage`: Generate themed messages

**Request Body:**
Varies by flow type.

**Response:**
Flow-specific response structure.

---

## ⚙️ Service Layer APIs

Client-side services for business logic operations.

### AdvancedStationService

Complete station management service with comprehensive operations.

```typescript
class AdvancedStationService {
  // DJ Management
  async changeDJ(stationId: string, newDJId: string): Promise<Station>;
  async getAvailableDJs(): Promise<(DJCharacter | CustomDJCharacter)[]>;
  
  // Playlist Management
  async removeTrackFromPlaylist(stationId: string, trackId: string): Promise<Station>;
  async reorderPlaylist(stationId: string, newOrder: string[]): Promise<Station>;
  async moveTrack(stationId: string, fromIndex: number, toIndex: number): Promise<Station>;
  
  // Batch Operations
  async removeMultipleTracks(stationId: string, trackIds: string[]): Promise<Station>;
  async addTracksToPlaylist(stationId: string, tracks: Omit<PlaylistItem, 'id'>[]): Promise<Station>;
  
  // Analytics
  getPlaylistStats(station: Station): PlaylistStats;
  validatePlaylist(station: Station): PlaylistValidation;
  
  // Utilities
  searchPlaylist(station: Station, query: string): PlaylistItem[];
  filterPlaylistByType(station: Station, type: 'music' | 'message' | 'all'): PlaylistItem[];
  findDuplicateTracks(station: Station): Array<{original: PlaylistItem; duplicates: PlaylistItem[]}>;
  
  // Cache Management
  invalidateDJCache(): void;
}
```

#### Usage Example:
```typescript
import { advancedStationService } from '@/services/AdvancedStationService';

// Change DJ for a station
const updatedStation = await advancedStationService.changeDJ('station-123', 'dj-456');

// Get playlist statistics
const stats = advancedStationService.getPlaylistStats(station);
console.log(`Total duration: ${stats.totalDuration} seconds`);

// Validate playlist
const validation = advancedStationService.validatePlaylist(station);
if (!validation.isValid) {
  console.log('Issues:', validation.issues);
}
```

### AudioService

Audio playback and management service.

```typescript
class AudioService {
  // Playback Control
  async loadTrack(track: PlaylistItem): Promise<boolean>;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  
  // Volume and Settings
  setVolume(volume: number): void;
  getVolume(): number;
  mute(): void;
  unmute(): void;
  
  // Playback State
  getCurrentTime(): number;
  getDuration(): number;
  isPlaying(): boolean;
  
  // Audio Context
  initializeAudioContext(): Promise<void>;
  disconnect(): void;
  
  // Event Handling
  onEnded(callback: () => void): void;
  onError(callback: (error: string) => void): void;
  onTimeUpdate(callback: (time: number) => void): void;
}
```

### PlaylistManagerService

AI-powered playlist generation and management.

```typescript
class PlaylistManagerService {
  // Playlist Generation
  async generatePlaylist(config: PlaylistConfig): Promise<PlaylistItem[]>;
  async generateSmartPlaylist(station: Station, count: number): Promise<PlaylistItem[]>;
  
  // Templates
  getPlaylistTemplates(): PlaylistTemplate[];
  async applyTemplate(stationId: string, templateId: string): Promise<PlaylistItem[]>;
  
  // Optimization
  optimizePlaylist(playlist: PlaylistItem[]): PlaylistItem[];
  balanceContent(playlist: PlaylistItem[], musicRatio: number): PlaylistItem[];
  
  // Analytics
  analyzePlaylist(playlist: PlaylistItem[]): PlaylistAnalysis;
  getRecommendations(station: Station): string[];
}
```

---

## 📝 Type Definitions

### Core Data Types

#### Station
```typescript
export type Station = {
  id: string;
  frequency: number;          // 87.0-108.0 MHz
  name: string;
  ownerId: string;           // Firebase user ID
  djCharacterId: string;     // DJ character ID
  playlist: PlaylistItem[];
  theme?: string;            // Station theme/description
  createdAt: string;         // ISO date string
  isActive?: boolean;        // Station broadcast status
};
```

#### PlaylistItem
```typescript
export type PlaylistItem = {
  id: string;
  type: 'message' | 'music';
  title: string;
  content: string;           // Message content or music description
  artist?: string;           // Music artist
  album?: string;            // Album name
  year?: number;             // Release year
  genre?: string;            // Comma-separated genres
  artwork?: string;          // Album/track artwork URL
  url: string;               // Audio file URL
  duration: number;          // Duration in seconds
  addedAt?: string;          // ISO date string
  plexKey?: string;          // Plex media key
  isLoading?: boolean;       // Loading state
  error?: string;            // Error message
};
```

#### DJCharacter
```typescript
export type DJCharacter = {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  voice?: {
    gender: string;          // 'male' | 'female'
    tone: string;            // 'grave' | 'clair' | 'medium'
    style: string;           // 'narrateur' | 'informatif' | 'decontracte'
  };
};

export type CustomDJCharacter = DJCharacter & {
  voice: {
    gender: string;
    tone: string;
    style: string;
  };
  isCustom: true;
  ownerId: string;           // Owner user ID
  createdAt: string;         // ISO date string
};
```

#### User
```typescript
export type User = {
  id: string;                // Firebase user ID
  email: string;
  stationsCreated: number;   // Count of created stations
  lastFrequency: number;     // Last tuned frequency
  createdAt: string;         // ISO date string
  lastLogin: string;         // ISO date string
};
```

### Service Response Types

#### ActionResult
```typescript
export type ActionResult = {
  success?: boolean;
  error?: string | Record<string, string[]>;
  [key: string]: any;        // Additional result data
};
```

#### PlaylistStats
```typescript
export type PlaylistStats = {
  totalTracks: number;
  totalDuration: number;     // Total duration in seconds
  averageTrackDuration: number;
  genreDistribution: Record<string, number>;
  typeDistribution: {
    music: number;
    message: number;
  };
  oldestTrack?: PlaylistItem;
  newestTrack?: PlaylistItem;
};
```

#### PlaylistValidation
```typescript
export type PlaylistValidation = {
  isValid: boolean;
  issues: PlaylistIssue[];
  recommendations: string[];
};

export type PlaylistIssue = {
  type: 'error' | 'warning' | 'info';
  message: string;
  trackId?: string;
  field?: string;
};
```

### Monitoring Types

#### PlayerState
```typescript
export type PlayerState = {
  isPlaying: boolean;
  currentTrack: PlaylistItem | null;
  currentTime: number;       // Current playback time in seconds
  duration: number;          // Track duration in seconds
  volume: number;            // Volume level (0-1)
  isMuted: boolean;
  error: string | null;
  lastUpdate: Date;
  listeners: number;         // Active listeners count
  stationId: string;
};
```

#### PlayerLog
```typescript
export type PlayerLog = {
  id: string;
  type: 'play' | 'pause' | 'error' | 'track_change' | 'volume_change';
  message: string;
  timestamp: Date;
  trackId?: string;
  error?: string;
};
```

### AI Flow Types

#### GeneratePlaylistInput
```typescript
export type GeneratePlaylistInput = {
  stationName: string;
  djName: string;
  djDescription: string;
  theme: string;
  trackCount?: number;       // Default: 10
  musicRatio?: number;       // Default: 0.7 (70% music, 30% messages)
};
```

#### VoiceConfig
```typescript
export type VoiceConfig = {
  gender: 'male' | 'female';
  tone: 'grave' | 'clair' | 'medium';
  style: 'narrateur' | 'informatif' | 'decontracte';
  speed?: number;            // Speech speed (0.5-2.0)
  pitch?: number;            // Voice pitch adjustment
};
```

---

## ❌ Error Handling

### Error Response Format

All API operations return errors in a consistent format:

```typescript
{
  success: false,
  error: string | Record<string, string[]>,
  code?: string,
  details?: any
}
```

### Common Error Codes

#### Authentication Errors
- `AUTH_REQUIRED`: Authentication required for this operation
- `AUTH_INVALID`: Invalid authentication credentials
- `AUTH_EXPIRED`: Authentication token expired

#### Validation Errors
- `VALIDATION_FAILED`: Input validation failed
- `INVALID_FREQUENCY`: Frequency outside valid range (87.0-108.0)
- `INVALID_STATION_NAME`: Station name too short or invalid
- `FREQUENCY_OCCUPIED`: Frequency already in use

#### Resource Errors
- `STATION_NOT_FOUND`: Station with specified ID not found
- `USER_NOT_FOUND`: User not found
- `TRACK_NOT_FOUND`: Playlist track not found
- `DJ_NOT_FOUND`: DJ character not found

#### System Errors
- `FIREBASE_ERROR`: Firebase operation failed
- `PLEX_CONNECTION_ERROR`: Plex server connection failed
- `AI_GENERATION_ERROR`: AI content generation failed
- `AUDIO_PROCESSING_ERROR`: Audio processing failed

### Error Handling Patterns

#### Server Actions
```typescript
try {
  const result = await someServerAction(params);
  if (result.success) {
    // Handle success
  } else {
    // Handle error
    console.error('Action failed:', result.error);
  }
} catch (error) {
  // Handle unexpected errors
  console.error('Unexpected error:', error);
}
```

#### Service Layer
```typescript
const service = AdvancedStationService.getInstance();
try {
  const station = await service.changeDJ(stationId, newDJId);
  // Success - station updated
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle not found
  } else if (error.message.includes('permission')) {
    // Handle permission error
  } else {
    // Handle generic error
  }
}
```

#### React Components
```typescript
const [error, setError] = useState<string | null>(null);
const [loading, setLoading] = useState(false);

const handleAction = async () => {
  setLoading(true);
  setError(null);
  
  try {
    const result = await performAction();
    if (!result.success) {
      setError(result.error);
    }
  } catch (error) {
    setError('An unexpected error occurred');
  } finally {
    setLoading(false);
  }
};
```

---

## 🔐 Authentication

### Authentication Requirements

#### Public Endpoints
No authentication required:
- `GET /api/stations` - Public station list
- `GET /api/plex/genres` - Available genres
- Station frequency scanning

#### Authenticated Endpoints
Firebase Authentication required:
- All station management operations
- Custom DJ creation
- Playlist modifications
- User data operations

#### Owner-Only Operations
Must be station owner:
- Station updates and deletion
- Playlist management
- Station analytics

### Authentication Patterns

#### Server Actions
Authentication is handled automatically through Firebase Auth context:

```typescript
// actions.ts
export async function createStation(formData: FormData) {
  // User context available through Firebase Auth
  const userId = getCurrentUserId(); // Internal helper
  
  if (!userId) {
    return { error: 'Authentication required' };
  }
  
  // Proceed with authenticated operation
}
```

#### API Routes
Manual authentication checking:

```typescript
// api/stations/route.ts
import { getAuth } from 'firebase/auth';

export async function POST(request: Request) {
  const auth = getAuth();
  const user = auth.currentUser;
  
  if (!user) {
    return new Response(
      JSON.stringify({ error: 'Authentication required' }), 
      { status: 401 }
    );
  }
  
  // Proceed with authenticated operation
}
```

#### Client-Side
Authentication state management:

```typescript
// Component
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';

function MyComponent() {
  const [user, loading, error] = useAuthState(auth);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!user) return <div>Please sign in</div>;
  
  // Render authenticated content
  return <div>Welcome, {user.email}</div>;
}
```

### Permission Levels

#### Guest Users
- View public stations
- Scan frequencies
- Basic radio functionality

#### Authenticated Users
- Create stations (up to limit)
- Manage owned stations
- Create custom DJ characters
- Full playlist management

#### System Admin (Future)
- Manage all stations
- View system analytics
- User management
- System configuration

---

## 🔧 Usage Examples

### Complete Station Management Workflow

```typescript
import { 
  createStation, 
  getStationById, 
  addMusicToStation,
  regenerateStationPlaylist 
} from '@/app/actions';
import { advancedStationService } from '@/services/AdvancedStationService';

// 1. Create a new station
const formData = new FormData();
formData.append('name', 'Wasteland FM');
formData.append('frequency', '101.5');
formData.append('djCharacterId', 'marcus');
formData.append('theme', 'Post-apocalyptic rock and blues');
formData.append('ownerId', 'user-123');

const createResult = await createStation(formData);
if (!createResult.success) {
  throw new Error(`Failed to create station: ${createResult.error}`);
}

const stationId = createResult.stationId!;

// 2. Add some music tracks
const musicTrack = {
  id: 'track-1',
  type: 'music' as const,
  title: 'Atom Bomb Baby',
  content: 'Classic post-war tune',
  artist: 'The Five Stars',
  url: 'https://example.com/audio/atom-bomb-baby.mp3',
  duration: 180
};

await addMusicToStation(stationId, musicTrack);

// 3. Regenerate playlist with AI
const regenResult = await regenerateStationPlaylist(stationId);
if (regenResult.success) {
  console.log(`Generated ${regenResult.newPlaylist.length} new tracks`);
}

// 4. Get updated station
const updatedStation = await getStationById(stationId);

// 5. Analyze playlist
const stats = advancedStationService.getPlaylistStats(updatedStation!);
console.log(`Playlist stats:`, {
  totalTracks: stats.totalTracks,
  totalDuration: `${Math.floor(stats.totalDuration / 60)} minutes`,
  musicPercentage: `${(stats.typeDistribution.music / stats.totalTracks * 100).toFixed(1)}%`
});

// 6. Validate playlist
const validation = advancedStationService.validatePlaylist(updatedStation!);
if (!validation.isValid) {
  console.log('Playlist issues:', validation.issues);
  console.log('Recommendations:', validation.recommendations);
}
```

### Custom DJ Creation and Voice Generation

```typescript
import { 
  createCustomDj, 
  getCustomCharactersForUser,
  getAudioForTrack 
} from '@/app/actions';

// 1. Create custom DJ
const djFormData = new FormData();
djFormData.append('name', 'Mad Max Mike');
djFormData.append('background', 'Former mechanic turned radio host in the wasteland');
djFormData.append('gender', 'male');
djFormData.append('tone', 'grave');
djFormData.append('style', 'decontracte');

const djResult = await createCustomDj('user-123', djFormData);
if (djResult.success) {
  console.log(`Created DJ with ID: ${djResult.characterId}`);
}

// 2. Get user's custom DJs
const customDJs = await getCustomCharactersForUser('user-123');
console.log(`User has ${customDJs.length} custom DJ characters`);

// 3. Generate voice message
const messageTrack = {
  id: 'msg-1',
  type: 'message' as const,
  title: 'Station ID',
  content: 'This is Mad Max Mike coming to you live from the wasteland!',
  url: '', // Will be generated
  duration: 10
};

const audioResult = await getAudioForTrack(
  messageTrack, 
  djResult.characterId!, 
  'user-123',
  'Post-apocalyptic radio'
);

if (audioResult.audioUrl) {
  console.log('Generated audio URL:', audioResult.audioUrl);
  // Use audioResult.audioUrl for playback
} else {
  console.error('Audio generation failed:', audioResult.error);
}
```

### Advanced Playlist Management

```typescript
import { advancedStationService } from '@/services/AdvancedStationService';

const service = advancedStationService;
const station = await getStationById('station-123');

// 1. Search playlist
const rockTracks = service.searchPlaylist(station!, 'rock');
console.log(`Found ${rockTracks.length} rock tracks`);

// 2. Filter by type
const musicTracks = service.filterPlaylistByType(station!, 'music');
const messages = service.filterPlaylistByType(station!, 'message');

// 3. Find duplicates
const duplicates = service.findDuplicateTracks(station!);
if (duplicates.length > 0) {
  console.log(`Found ${duplicates.length} duplicate groups`);
  
  // Remove duplicates (keep first, remove others)
  const duplicateIds = duplicates.flatMap(group => 
    group.duplicates.map(track => track.id)
  );
  await service.removeMultipleTracks(station!.id, duplicateIds);
}

// 4. Reorder playlist (move track from index 0 to index 5)
await service.moveTrack(station!.id, 0, 5);

// 5. Add multiple tracks
const newTracks = [
  {
    type: 'music' as const,
    title: 'Uranium Rock',
    content: 'High-energy rock for the atomic age',
    artist: 'The Atomic Knights',
    url: 'https://example.com/uranium-rock.mp3',
    duration: 200
  },
  {
    type: 'message' as const,
    title: 'Weather Report',
    content: 'Current radiation levels are moderate to high...',
    url: '', // Will be generated
    duration: 15
  }
];

await service.addTracksToPlaylist(station!.id, newTracks);
```

---

*Last updated: 2025-01-01*  
*API Version: 1.0*  
*Compatible with Onde Spectrale v0.9.5+*