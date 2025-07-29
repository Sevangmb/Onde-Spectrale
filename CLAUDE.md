# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Onde Spectrale** is a post-apocalyptic interactive radio application inspired by Fallout. Users can scan radio frequencies (87.0-108.0 MHz), create custom stations, and listen to AI-generated content in an immersive wasteland universe.

**Key Features:**
- Interactive frequency scanner with realistic interference simulation
- Custom radio station creation with AI-powered DJ personalities
- Real-time playlist management with Plex integration
- Voice generation via Google Cloud Text-to-Speech
- Admin interface for comprehensive station and user management

## Development Commands

```bash
# Development
npm run dev                # Start development server on port 9002
npm run genkit:dev        # Launch Genkit AI development environment
npm run genkit:watch      # Watch mode for AI flows

# Testing
npm test                  # Run Jest tests
npm run test:coverage     # Run tests with coverage report
npm run typecheck         # TypeScript type checking

# Building & Deployment
npm run build             # Production build
npm run start             # Start production server
npm run lint              # ESLint code checking
npm run deploy            # Run deployment script
npm run deploy:firebase   # Deploy to Firebase hosting
npm run deploy:vercel     # Deploy to Vercel

# Development Tools
npm run storybook         # Start Storybook component explorer
```

## Architecture Overview

### Service Layer Architecture
The application uses a sophisticated service layer pattern with singleton services:

- **`RadioStationManager`** - Complete CRUD operations for radio stations with frequency conflict detection
- **`PlaylistManagerService`** - AI-powered playlist generation and management with optimization algorithms  
- **`AudioService`** - Audio streaming and playback management
- **`CacheService`** - Multi-level caching (memory, session, local storage)
- **`AdminMonitoringService`** - Real-time system monitoring and user activity tracking

### State Management
- **Zustand stores** for global state (radio frequency, playback state)
- **Custom hooks** for component-level state with service integration
- **`useUnifiedStationManager`** - Unified hook combining station + playlist management
- **`useAdminLayout`** - Admin context provider with Firebase Auth integration

### Component Architecture

#### Main Radio Interface
- **`OndeSpectraleRadio.tsx`** - Main radio scanner interface with Pip-Boy styling
- **`AudioPlayer.tsx`** - Complete audio player with spectrum analyzer
- **`SpectrumAnalyzer.tsx`** - Real-time audio visualization

#### Admin Interface  
- **`/admin/dashboard`** - Unified admin dashboard with tabbed interface (Overview, Stations, Playlists, Analytics)
- **`/admin/stations`** - Modern station management with CRUD operations, batch actions, and filtering
- **`RadioStationManager.tsx`** - Complete station management component with search, filters, and real-time operations
- **`StationEditor.tsx`** - Advanced station editor with tabbed interface (General, Playlist, Advanced)

#### Playlist Management
- **`EnhancedPlaylistInterface.tsx`** - Advanced playlist manager with AI generation, drag & drop, and optimization
- **`PlaylistManagerService`** - Backend service with templates, smart generation, and analytics

### AI Integration
The application integrates Google Genkit for AI-powered content generation:

- **Flows in `/src/ai/flows/`** - AI generation workflows for playlists and DJ messages
- **DJ Personalities** - Predefined characters (Marcus, Sarah, Tommy) with unique voices and themes
- **Dynamic Content** - Context-aware message generation based on station themes and music

### Firebase Integration
- **Authentication** - Firebase Auth with Google provider
- **Database** - Firestore for stations, users, playlists, and DJ characters
- **Storage** - Firebase Storage for audio files and assets
- **Real-time** - Live synchronization of station data across admin interfaces

### Plex Media Server Integration
- **Music Library** - Direct integration with Plex for real audio content
- **API Routes** - `/api/plex/` endpoints for genre-based track fetching
- **Fallback System** - Graceful degradation when Plex is unavailable

## Key Development Patterns

### Service Layer Pattern
All business logic is encapsulated in singleton services with consistent error handling:

```typescript
// Services follow this pattern
export class ServiceName {
  private static instance: ServiceName | null = null;
  
  static getInstance(): ServiceName {
    if (!ServiceName.instance) {
      ServiceName.instance = new ServiceName();
    }
    return ServiceName.instance;
  }
  
  async operation(): Promise<{success: boolean; data?: any; error?: string}> {
    try {
      // Implementation
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
```

### Enhanced Hook Pattern
Hooks combine multiple services and provide comprehensive interfaces:

```typescript
export function useUnifiedManager() {
  const [state, setState] = useState();
  const [loading, setLoading] = useState(false);
  
  const operation = useCallback(async () => {
    setLoading(true);
    try {
      const result = await service.operation();
      if (result.success) {
        setState(result.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);
  
  return { state, loading, operation };
}
```

### Firebase Integration Pattern
All Firebase operations use consistent error handling and type safety:

```typescript
// Firebase operations follow this pattern
try {
  const docRef = await addDoc(collection(db, 'collection'), data);
  return { success: true, id: docRef.id };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

## Important Implementation Details

### Audio Autoplay Compliance
The application respects browser autoplay restrictions through:
- User interaction detection before audio playback
- Graceful fallback when autoplay is blocked
- Clear user prompts for audio permission

### Performance Optimizations
- React.memo and useMemo for expensive components
- Service worker caching for audio files
- Lazy loading for admin components
- Debounced search and filter operations

### Error Handling Strategy
- Comprehensive try-catch blocks in all async operations
- User-friendly error messages with technical details in console
- Graceful degradation when external services (Plex, Firebase) are unavailable
- Automatic retry mechanisms for transient failures

### TypeScript Usage
- Strict TypeScript configuration with comprehensive type definitions
- All API responses properly typed with success/error patterns
- Custom types for Station, User, PlaylistItem, and DJCharacter entities
- Proper typing for Firebase documents and Plex API responses

## Testing Configuration

Jest is configured for React Testing Library with:
- Module path mapping (`@/` → `src/`)
- JSDoc test environment for components
- Coverage collection from all TypeScript source files
- Transform ignore patterns for ES modules (lucide-react)

Test files should be placed in:
- `src/**/__tests__/**/*.(test|spec).(ts|tsx)`
- `src/**/*.(test|spec).(ts|tsx)`

## Environment Setup

Required environment variables:
- Firebase configuration (API key, project ID, etc.)
- Google Cloud Platform project ID and location
- Optional Plex server URL and token

The application gracefully handles missing Plex configuration by using placeholder audio and mock data.

## Admin Development Notes

The admin interface uses a unified layout (`/admin/layout.tsx`) with:
- Firebase Auth state management
- Sidebar navigation with role-based access
- Real-time data synchronization across tabs
- Development tools accessible in development mode only

When working on admin features, use the `useAdminLayout()` hook to access:
- Current user authentication state
- User's stations and custom DJ characters
- Loading states and error handling
- Cross-tab synchronization utilities