# Plan de Tests - Onde Spectrale

## Objectif
Atteindre >80% de coverage de code avec des tests unitaires et d'intégration.

## Priorités de Tests

### 1. Services Core (Priorité Haute)
- [x] `AudioService` - Service audio principal
- [ ] `PlaylistManagerService` - Gestion des playlists
- [ ] `StationService` - Gestion des stations
- [ ] `FirebaseService` - Intégration Firebase

### 2. Hooks React (Priorité Haute)
- [ ] `useUnifiedStationManager` - Hook principal de gestion des stations
- [ ] `usePlayerMonitoring` - Monitoring temps réel
- [ ] `useSystemLogs` - Logs système
- [ ] `useAutoPlay` - Autoplay audio

### 3. Composants UI (Priorité Moyenne)
- [x] `AudioPlayer` - Lecteur audio
- [ ] `RealTimePlayerMonitor` - Monitoring temps réel
- [ ] `SystemLogsViewer` - Affichage des logs
- [ ] `OndeSpectraleRadio` - Composant principal

### 4. Utilitaires (Priorité Basse)
- [ ] `testUtils` - Utilitaires de test
- [ ] `types` - Types TypeScript
- [ ] `actions` - Actions serveur

## Structure des Tests

### Tests Unitaires
```typescript
// Exemple de structure
describe('ServiceName', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    // Cleanup
  });

  it('should handle normal case', () => {
    // Test
  });

  it('should handle error case', () => {
    // Test error handling
  });

  it('should handle edge cases', () => {
    // Test edge cases
  });
});
```

### Tests d'Intégration
```typescript
// Tests d'intégration entre services
describe('Service Integration', () => {
  it('should work with multiple services', () => {
    // Test integration
  });
});
```

## Configuration Jest

### Coverage Goals
- **Statements**: >80%
- **Branches**: >75%
- **Functions**: >80%
- **Lines**: >80%

### Exclusions
- Fichiers de configuration
- Fichiers de types
- Fichiers de migration
- Composants Storybook

## Stratégie de Test

### Phase 1: Services Core
1. Tester les méthodes publiques
2. Tester la gestion d'erreurs
3. Tester les cas limites

### Phase 2: Hooks React
1. Tester les états initiaux
2. Tester les mises à jour d'état
3. Tester les effets de bord

### Phase 3: Composants UI
1. Tester le rendu
2. Tester les interactions utilisateur
3. Tester l'accessibilité

### Phase 4: Intégration
1. Tester les flux complets
2. Tester les interactions entre composants
3. Tester les performances

## Scripts de Test

```bash
# Tests unitaires
npm test

# Tests avec coverage
npm run test:coverage

# Tests en mode watch
npm run test:watch

# Tests spécifiques
npm test -- --testPathPattern="AudioService"
```

## Métriques de Qualité

### Coverage Minimum
- **Total**: 80%
- **Services**: 85%
- **Hooks**: 80%
- **Composants**: 75%

### Performance
- Temps d'exécution < 30s
- Mémoire < 500MB
- Tests parallèles

## Corrections Nécessaires

### Erreurs TypeScript à Corriger
1. Types manquants dans `testUtils.ts`
2. Imports incorrects dans les services
3. Propriétés manquantes dans les interfaces
4. Erreurs de compatibilité SSR

### Solutions Prioritaires
1. Corriger les types de base
2. Simplifier les tests complexes
3. Utiliser des mocks appropriés
4. Éviter les dépendances circulaires

## Prochaines Étapes

1. **Corriger les erreurs TypeScript critiques**
2. **Implémenter les tests de base pour les services**
3. **Ajouter les tests d'intégration**
4. **Optimiser la performance des tests**
5. **Maintenir la coverage >80%**

## Notes Techniques

### Mocks Requis
- Firebase/Firestore
- Web Audio API
- React Router
- Next.js

### Environnement de Test
- Node.js 18+
- Jest 29+
- Testing Library
- jsdom

### Configuration
- TypeScript strict
- ESLint
- Prettier
- Husky hooks 