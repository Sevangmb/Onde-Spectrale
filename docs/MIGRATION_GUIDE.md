# 📋 Guide de Migration - Qualité du Code

Ce guide détaille les étapes pour migrer le projet vers les nouvelles normes de qualité de code.

## 🎯 Objectifs

1. **Éliminer tous les types `any`** - Remplacer par des types spécifiques
2. **Nettoyer les logs de production** - Utiliser le système de logging conditionnel
3. **Standardiser la gestion d'erreurs** - Utiliser les classes d'erreurs personnalisées

## 📦 Nouveaux Modules Créés

### Types Spécialisés
- `src/types/plex.ts` - Types pour l'intégration Plex
- `src/types/firebase.ts` - Types pour Firebase
- `src/types/monitoring.ts` - Types pour le monitoring
- `src/types/index.ts` - Export centralisé

### Système de Logging
- `src/lib/logger.ts` - Logger conditionnel avec niveaux

### Gestion d'Erreurs
- `src/lib/errors.ts` - Classes d'erreurs améliorées (déjà existant, amélioré)

## 🔄 Migration des Types `any`

### Avant
```typescript
function handleData(data: any) {
  return data.someProperty;
}

const response: any = await fetch('/api/data');
```

### Après
```typescript
import { PlexTrack, ApiResponse } from '@/types';

function handleData(data: PlexTrack) {
  return data.title;
}

const response: ApiResponse<PlexTrack[]> = await fetch('/api/data');
```

### Types de Remplacement Courants

| `any` Usage | Remplacement Recommandé |
|-------------|------------------------|
| `error: any` | `error: Error \| BackendError` |
| `data: any` | Interface spécifique ou `unknown` |
| `props: any` | Interface de props typée |
| `event: any` | `Event \| React.SyntheticEvent` |
| `response: any` | `ApiResponse<T>` |

## 🔧 Migration du Logging

### Avant
```typescript
console.log('User logged in:', user);
console.error('Failed to load data:', error);
console.warn('Deprecated feature used');
```

### Après
```typescript
import { log } from '@/lib/logger';

log.info('User logged in', 'AuthService', { userId: user.id });
log.error('Failed to load data', 'DataService', { error: error.message });
log.warn('Deprecated feature used', 'FeatureService', { feature: 'oldApi' });
```

### Niveaux de Log

- `log.debug()` - Informations de débogage (dev uniquement)
- `log.info()` - Informations générales
- `log.warn()` - Avertissements
- `log.error()` - Erreurs

### Configuration par Environnement

```bash
# .env.local
NEXT_PUBLIC_LOG_LEVEL=DEBUG  # development
NEXT_PUBLIC_LOG_LEVEL=WARN   # production
```

## ⚠️ Migration de la Gestion d'Erreurs

### Avant
```typescript
try {
  const result = await someOperation();
  return result;
} catch (error: any) {
  console.error('Operation failed:', error);
  throw new Error('Something went wrong');
}
```

### Après
```typescript
import { handleAsyncError, BackendError, ErrorCode } from '@/lib/errors';

// Option 1: Avec handleAsyncError
const [error, result] = await handleAsyncError(someOperation());
if (error) {
  throw error;
}
return result;

// Option 2: Try-catch avec erreurs typées
try {
  const result = await someOperation();
  return result;
} catch (error) {
  throw new BackendError(
    ErrorCode.INTERNAL_SERVER_ERROR,
    'Operation failed',
    500,
    { originalError: error instanceof Error ? error.message : String(error) }
  );
}
```

### Classes d'Erreurs Disponibles

- `ValidationError` - Erreurs de validation
- `AuthenticationError` - Erreurs d'authentification
- `ResourceNotFoundError` - Ressource non trouvée
- `FrequencyConflictError` - Conflit de fréquence
- `PlexServiceError` - Erreurs Plex
- `AIServiceError` - Erreurs IA

## 🚀 Script de Migration Automatique

### Recherche et Remplacement Global

```bash
# Remplacer console.log basiques
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.log(/log.info(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.error(/log.error(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i 's/console\.warn(/log.warn(/g'

# Ajouter les imports nécessaires (manuel)
```

### Vérification des Types

```bash
# Trouver tous les usages de 'any'
grep -r ": any" src/ --include="*.ts" --include="*.tsx"

# Trouver tous les console.log restants
grep -r "console\." src/ --include="*.ts" --include="*.tsx"
```

## 📋 Checklist de Migration par Fichier

### Pour chaque fichier TypeScript :

- [ ] **Imports** : Ajouter `import { log } from '@/lib/logger'`
- [ ] **Imports** : Ajouter `import { BackendError, ErrorCode } from '@/lib/errors'`
- [ ] **Types** : Remplacer tous les `any` par des types spécifiques
- [ ] **Logging** : Remplacer `console.*` par `log.*`
- [ ] **Erreurs** : Utiliser les classes d'erreurs personnalisées
- [ ] **Tests** : Vérifier que les tests passent toujours

### Exemple de Migration Complète

```typescript
// AVANT
import { Station } from '@/lib/types';

export class MyService {
  async loadData(id: string): Promise<any> {
    try {
      console.log('Loading data for:', id);
      const response = await fetch(`/api/data/${id}`);
      const data = await response.json();
      console.log('Data loaded successfully');
      return data;
    } catch (error: any) {
      console.error('Failed to load data:', error);
      throw new Error('Load failed');
    }
  }
}

// APRÈS
import { Station, ApiResponse } from '@/types';
import { log } from '@/lib/logger';
import { BackendError, ErrorCode, handleAsyncError } from '@/lib/errors';

interface DataResponse {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

export class MyService {
  async loadData(id: string): Promise<DataResponse> {
    log.info('Loading data', 'MyService', { id });
    
    const [error, response] = await handleAsyncError(
      fetch(`/api/data/${id}`).then(r => r.json())
    );
    
    if (error) {
      log.error('Failed to load data', 'MyService', { id, error: error.message });
      throw new BackendError(
        ErrorCode.RESOURCE_NOT_FOUND,
        'Data not found',
        404,
        { id }
      );
    }
    
    log.info('Data loaded successfully', 'MyService', { id });
    return response as DataResponse;
  }
}
```

## 🔍 Validation Post-Migration

### Tests Automatiques
```bash
npm run typecheck  # Vérifier les types
npm run lint       # Vérifier le style
npm run test       # Lancer les tests
```

### Vérifications Manuelles
1. Aucun usage de `any` restant
2. Aucun `console.*` en production
3. Gestion d'erreurs cohérente
4. Logs structurés avec contexte

## 📈 Métriques de Succès

- **0 types `any`** dans le code de production
- **0 console.log** dans le code de production
- **100% des erreurs** utilisent les classes personnalisées
- **Logs structurés** avec contexte et métadonnées

## 🎯 Prochaines Étapes

1. Migrer les services critiques en priorité
2. Migrer les composants React
3. Migrer les hooks personnalisés
4. Migrer les actions et API routes
5. Tests et validation finale