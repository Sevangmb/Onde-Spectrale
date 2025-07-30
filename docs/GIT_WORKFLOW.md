# 🌊 Git Workflow - Onde Spectrale

## **Structure de Branches**

```
main (production)     🌟 Version stable déployée
  ↑
develop (staging)     🚀 Intégration continue
  ↑
feature/xxx          ✨ Nouvelles fonctionnalités
hotfix/xxx          🔥 Corrections critiques
release/vX.X.X      📦 Préparation releases
```

## **Conventions de Nommage**

### **Branches**
```bash
# Features
feature/advanced-playlist-editor
feature/dark-mode-implementation
feature/mobile-responsive-design

# Bugfixes
bugfix/audio-player-memory-leak
bugfix/firebase-auth-timeout

# Hotfixes (production)
hotfix/critical-security-patch
hotfix/audio-playback-crash

# Releases
release/v1.2.0
release/v1.2.1-hotfix
```

### **Commits**
```bash
# Format: <type>(<scope>): <description>
# Types: feat, fix, docs, style, refactor, test, chore

feat(audio): implement advanced playlist reordering
fix(ui): correct drag and drop visual feedback
docs(readme): update installation instructions
style(components): apply consistent spacing
refactor(hooks): consolidate playlist management
test(e2e): add station management scenarios
chore(deps): update dependencies to latest versions

# Emojis optionnels pour clarté visuelle
✨ feat: nouvelle fonctionnalité
🐛 fix: correction de bug
📚 docs: documentation
💄 style: formatage, CSS
♻️ refactor: refactoring
✅ test: ajout/modification tests
🔧 chore: maintenance, configuration
🚀 deploy: déploiement
⚡ perf: amélioration performance
🔒 security: sécurité
```

## **Workflow de Développement**

### **1. Nouvelle Fonctionnalité**
```bash
# 1. Partir de develop
git checkout develop
git pull origin develop

# 2. Créer branch feature
git checkout -b feature/advanced-analytics

# 3. Développer avec commits atomiques
git add src/components/Analytics.tsx
git commit -m "✨ feat(analytics): add user engagement metrics"

git add src/hooks/useAnalytics.ts
git commit -m "✨ feat(analytics): implement analytics hook"

# 4. Push et Pull Request
git push origin feature/advanced-analytics
# Créer PR sur GitHub: feature/advanced-analytics → develop
```

### **2. Correction de Bug**
```bash
# 1. Partir de develop
git checkout develop
git pull origin develop

# 2. Créer branch bugfix
git checkout -b bugfix/playlist-duplication

# 3. Développer et tester
git add src/services/PlaylistService.ts
git commit -m "🐛 fix(playlist): prevent track duplication on reorder"

# 4. Push et Pull Request
git push origin bugfix/playlist-duplication
# Créer PR sur GitHub: bugfix/playlist-duplication → develop
```

### **3. Hotfix Production**
```bash
# 1. Partir de main (urgence production)
git checkout main
git pull origin main

# 2. Créer branch hotfix
git checkout -b hotfix/audio-crash-fix

# 3. Correction rapide et testée
git add src/services/AudioService.ts
git commit -m "🔥 hotfix(audio): fix crash on track transition"

# 4. Deploy immédiat
git checkout main
git merge hotfix/audio-crash-fix
git tag v1.1.1
git push origin main --tags

# 5. Merge dans develop aussi
git checkout develop
git merge hotfix/audio-crash-fix
git push origin develop
```

### **4. Release Process**
```bash
# 1. Créer branch release
git checkout develop
git checkout -b release/v1.2.0

# 2. Finaliser (bump version, changelog)
npm version 1.2.0
git add package.json CHANGELOG.md
git commit -m "🚀 release: v1.2.0"

# 3. Merge vers main
git checkout main
git merge release/v1.2.0
git tag v1.2.0
git push origin main --tags

# 4. Merge vers develop
git checkout develop
git merge release/v1.2.0
git push origin develop

# 5. Supprimer branch release
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

## **Pull Request Template**

### **Template Standard**
```markdown
## 📝 Description
Brief description of changes and motivation.

## 🎯 Type de Changement
- [ ] 🐛 Bug fix (non-breaking change)
- [ ] ✨ New feature (non-breaking change)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to not work)
- [ ] 📚 Documentation update

## 🧪 Testing
- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed
- [ ] No regressions detected

## 📋 Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated if needed
- [ ] No console.log or debug code left

## 📊 Performance Impact
- Bundle size: +/- X KB
- Build time: +/- X seconds
- Runtime performance: improved/unchanged/degraded

## 🖼️ Screenshots (if applicable)
Before/After screenshots for UI changes.
```

## **Branch Protection Rules**

### **main branch**
```yaml
protection_rules:
  required_reviews: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
  required_status_checks:
    - ci/quality-gates
    - ci/build-and-test
    - ci/e2e-tests
  enforce_admins: true
  allow_force_pushes: false
  allow_deletions: false
```

### **develop branch**
```yaml
protection_rules:
  required_reviews: 1
  dismiss_stale_reviews: true
  required_status_checks:
    - ci/quality-gates
    - ci/build-and-test
  allow_force_pushes: false
  allow_deletions: false
```

## **Cleanup Strategy**

### **Branches à Supprimer Régulièrement**
```bash
# Supprimer branches locales mergées
git branch --merged develop | grep -v develop | xargs -n 1 git branch -d

# Supprimer branches remote tracking obsolètes
git remote prune origin

# Lister branches non mergées (à vérifier manuellement)
git branch --no-merged develop
```

### **Maintenance Mensuelle**
```bash
# 1. Audit des branches
git for-each-ref --format='%(refname:short) %(committerdate)' refs/remotes/origin | sort -k2

# 2. Supprimer branches anciennes (>3 mois)
# Faire manuellement après vérification

# 3. Nettoyer tags obsolètes
git tag -l | grep -E "v[0-9]+\.[0-9]+\.[0-9]+-" | head -n -10 | xargs git tag -d
```

## **Outils Recommandés**

### **Git Hooks**
```bash
# .git/hooks/pre-commit
#!/bin/sh
npm run lint-staged
npm run typecheck
```

### **Extensions VSCode**
- GitLens
- GitHub Pull Requests
- Git Graph
- Conventional Commits

### **CLI Tools**
```bash
# Installation
npm install -g commitizen cz-conventional-changelog
npm install -g git-branch-cleaner
npm install -g conventional-changelog-cli

# Usage
git cz  # Commits conventionnels guidés
conventional-changelog -p angular -i CHANGELOG.md -s
```

## **Métriques de Succès**

### **Qualité du Workflow**
```yaml
lead_time: <2 jours (feature → production)
deployment_frequency: 2-3x/semaine
change_failure_rate: <5%
mean_recovery_time: <1 heure
```

### **Collaboration**
```yaml
pr_review_time: <4 heures
merge_conflicts: <10% PRs
hotfix_frequency: <1/mois
branch_lifecycle: <1 semaine
```