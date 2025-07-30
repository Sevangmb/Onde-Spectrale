# 🚀 Workflow de Développement - Onde Spectrale

## **🎯 Vue d'Ensemble**

Ce document décrit le workflow de développement professionnel pour Onde Spectrale, une radio post-apocalyptique interactive. Notre workflow est conçu pour maximiser la productivité, la qualité du code et la collaboration d'équipe.

## **📋 Table des Matières**

1. [Configuration Initiale](#configuration-initiale)
2. [Workflow Quotidien](#workflow-quotidien)
3. [Standards de Code](#standards-de-code)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Déploiement](#déploiement)
6. [Maintenance](#maintenance)

---

## **⚙️ Configuration Initiale**

### **1. Clone et Setup**
```bash
# Clone du repository
git clone https://github.com/Sevangmb/Onde-Spectrale.git
cd Onde-Spectrale

# Installation des dépendances
npm install

# Configuration environnement
cp .env.example .env.local
# Éditez .env.local avec vos configurations

# Vérification setup
npm run typecheck
npm run test
npm run build
```

### **2. Configuration Git**
```bash
# Configuration utilisateur
git config user.name "Votre Nom"
git config user.email "votre.email@example.com"

# Installation des hooks
npm install -g husky lint-staged
npx husky install

# Configuration des alias utiles
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
```

### **3. Outils Recommandés**
```json
{
  "vscode_extensions": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-playwright.playwright",
    "eamodio.gitlens"
  ],
  "cli_tools": [
    "gh",
    "firebase-tools",
    "conventional-changelog-cli",
    "size-limit"
  ]
}
```

---

## **🔄 Workflow Quotidien**

### **1. Démarrage de Feature**
```bash
# Partir de develop
git checkout develop
git pull origin develop

# Créer feature branch
./scripts/workflow.sh feature nom-de-la-feature
# Ou manuellement:
# git checkout -b feature/nom-de-la-feature

# Développement avec live reload
npm run dev
```

### **2. Développement Actif**
```bash
# Commits fréquents et atomiques
git add src/components/NewComponent.tsx
git commit -m "✨ feat(component): add new component with tests"

# Vérifications périodiques
npm run typecheck  # TypeScript
npm run lint       # ESLint
npm run test       # Jest tests
```

### **3. Finalisation Feature**
```bash
# Vérifications complètes
npm run test:coverage  # Coverage >80%
npm run test:e2e      # Tests E2E
npm run build         # Build production

# Finalisation
./scripts/workflow.sh finish-feature nom-de-la-feature
# Crée automatiquement la PR
```

### **4. Review Process**
```yaml
pull_request_checklist:
  - [ ] Tests unitaires passent
  - [ ] Tests E2E passent  
  - [ ] Coverage >80%
  - [ ] TypeScript sans erreurs
  - [ ] ESLint sans warnings
  - [ ] Build production réussi
  - [ ] Documentation mise à jour
  - [ ] Screenshots si UI changes
```

---

## **📏 Standards de Code**

### **1. Structure des Fichiers**
```
src/
├── app/                    # App Router (Next.js 13+)
│   ├── (routes)/          # Route groups
│   ├── api/               # API routes
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── admin/            # Admin-specific components
│   └── [feature]/        # Feature-specific components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
├── services/             # Business logic services
├── stores/               # State management (Zustand)
└── types/                # TypeScript type definitions
```

### **2. Conventions de Nommage**
```typescript
// Files & Folders
PascalCase: Components (Button.tsx)
camelCase: hooks (usePlaylist.ts), utilities (formatTime.ts)
kebab-case: pages (admin-dashboard), CSS classes
UPPER_CASE: constants (API_ENDPOINTS.ts)

// Code Conventions
interface ComponentProps {      // Props avec suffix
  isLoading: boolean;          // Boolean avec is/has/can
  onSubmit: () => void;        // Handlers avec on prefix
}

const MyComponent = ({ isLoading }: ComponentProps) => {
  const handleClick = () => {}; // Handlers avec handle prefix
  
  return <div className="my-component" />;
};
```

### **3. Standards TypeScript**
```typescript
// Strict Configuration
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}

// Type Definitions
export interface Station {
  readonly id: string;
  name: string;
  frequency: number;
  playlist: readonly PlaylistItem[];
}

// Utility Types Usage
type PartialStation = Partial<Pick<Station, 'name' | 'frequency'>>;
type StationWithoutPlaylist = Omit<Station, 'playlist'>;
```

### **4. Testing Standards**
```typescript
// Unit Tests (Jest + Testing Library)
describe('PlaylistManager', () => {
  it('should add track to playlist', async () => {
    // Arrange
    const mockStation = createMockStation();
    
    // Act
    const result = await addTrackToPlaylist(mockStation, mockTrack);
    
    // Assert
    expect(result.playlist).toHaveLength(mockStation.playlist.length + 1);
  });
});

// E2E Tests (Playwright)
test('user can manage station playlist', async ({ page }) => {
  await page.goto('/admin/stations/test-id');
  await page.click('[data-testid="add-track"]');
  await expect(page.locator('[data-testid="playlist-item"]')).toHaveCount(1);
});
```

---

## **🏗️ CI/CD Pipeline**

### **1. GitHub Actions Workflow**
```yaml
# Déclenché sur: push to main/develop, PRs
# Étapes:
1. Quality Gates (lint, typecheck, format)
2. Security Scan (audit, dependency check)
3. Build & Test (multiple Node versions)
4. E2E Tests (Playwright)
5. Deploy (staging/production)
```

### **2. Quality Gates**
```bash
# Automatiques sur chaque commit
npm run typecheck     # TypeScript errors: 0
npm run lint          # ESLint warnings: 0
npm run test          # Coverage: >80%
npm run build         # Build: success

# Automatiques sur chaque PR
npm run test:e2e      # E2E tests: pass
npm run size-limit    # Bundle size: <500KB
```

### **3. Branch Protection**
```yaml
main:
  required_reviews: 2
  require_status_checks: true
  checks: [ci/quality-gates, ci/e2e-tests]
  
develop:
  required_reviews: 1
  require_status_checks: true
  checks: [ci/quality-gates]
```

---

## **🚀 Déploiement**

### **1. Environnements**
```yaml
development:
  url: http://localhost:9002
  database: firebase-dev
  features: all_enabled
  
staging:
  url: https://onde-spectrale-staging.web.app
  database: firebase-staging
  features: stable_only
  
production:
  url: https://onde-spectrale.web.app
  database: firebase-prod
  features: production_ready
```

### **2. Processus de Release**
```bash
# 1. Préparer release
./scripts/workflow.sh release 1.2.0

# 2. Tests finaux sur staging
npm run test:e2e
npm run build:production

# 3. Déployer
./scripts/workflow.sh deploy-release 1.2.0

# 4. Monitoring post-déploiement
firebase functions:log
```

### **3. Rollback Strategy**
```bash
# Rollback automatique si:
- Health check fails
- Error rate >5%
- Response time >5s

# Rollback manuel:
git revert <commit-hash>
./scripts/deploy.sh
```

---

## **🔧 Maintenance**

### **1. Maintenance Hebdomadaire**
```bash
# Mise à jour dépendances
npm outdated
npm update
npm audit fix

# Nettoyage Git
./scripts/workflow.sh cleanup
git remote prune origin

# Vérification performance
npm run build:analyze
npm run size-limit
```

### **2. Maintenance Mensuelle**
```bash
# Audit sécurité complet
npm audit --audit-level moderate
npm install -g npm-check-updates
ncu -u

# Métriques qualité
npx ts-prune              # Code mort
npx madge --circular .    # Dépendances circulaires
npx depcheck              # Dépendances inutiles
```

### **3. Monitoring Continu**
```yaml
metrics_tracked:
  - build_time: <5min
  - bundle_size: <500KB
  - test_coverage: >80%
  - deployment_frequency: 2-3x/week
  - lead_time: <2 days
  - recovery_time: <1 hour
```

---

## **📚 Ressources Supplémentaires**

### **Documentation**
- [Git Workflow](./GIT_WORKFLOW.md) - Processus Git détaillé
- [Architecture Guide](./ARCHITECTURE_GUIDE.md) - Structure du code
- [API Documentation](./API.md) - Documentation des APIs

### **Outils**
- [GitHub Repository](https://github.com/Sevangmb/Onde-Spectrale)
- [Firebase Console](https://console.firebase.google.com)
- [Storybook](http://localhost:6006) - Components showcase

### **Support**
- Issues GitHub pour bugs et features
- Discussions pour questions générales
- Wiki pour documentation collaborative

---

## **🎯 Métriques de Succès**

### **Productivité**
```yaml
lead_time: <2 jours (idea → production)
deployment_frequency: 2-3x/semaine
change_failure_rate: <5%
mean_recovery_time: <1 heure
```

### **Qualité**
```yaml
test_coverage: >80%
build_success_rate: >95%
zero_downtime_deployments: 100%
security_vulnerabilities: 0 critical
```

### **Collaboration**
```yaml
pr_review_time: <4 heures
merge_conflicts: <10%
documentation_coverage: >90%
team_satisfaction: >8/10
```

Ce workflow garantit une développement efficace, une qualité élevée et une collaboration fluide pour faire d'Onde Spectrale la meilleure radio post-apocalyptique interactive ! 🎛️📡