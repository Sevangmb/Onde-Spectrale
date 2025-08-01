# 🌊 Stratégie de Branches - Onde Spectrale

## **Structure Recommandée**

```
main (production)         🌟 Code stable en production
  ↑
develop (staging)         🚀 Intégration continue
  ↑
feature/xxx              ✨ Nouvelles fonctionnalités  
bugfix/xxx               🐛 Corrections de bugs
hotfix/xxx               🔥 Corrections critiques production
release/vX.X.X           📦 Préparation des releases
```

## **Règles de Gestion**

### **Protection des Branches**
```yaml
main:
  - require_pull_request_reviews: 2
  - dismiss_stale_reviews: true
  - require_status_checks: true
  - enforce_admins: true
  - allow_force_pushes: false

develop:  
  - require_pull_request_reviews: 1
  - require_status_checks: true
  - allow_force_pushes: false
```

### **Cycle de Vie des Branches**

#### **Features**
```bash
# Création depuis develop
git checkout develop
git pull origin develop
git checkout -b feature/advanced-analytics

# Développement avec commits fréquents
git commit -m "feat(analytics): add user metrics collection"

# Pull Request vers develop
# Suppression après merge
```

#### **Hotfixes**
```bash  
# Création depuis main (urgence)
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-fix

# Fix et tests
git commit -m "fix(security): patch XSS vulnerability"

# Merge vers main ET develop
git checkout main && git merge hotfix/critical-security-fix
git checkout develop && git merge hotfix/critical-security-fix
```

### **Nettoyage Automatique**

#### **Script de Maintenance**
```bash
#!/bin/bash
# Nettoyer branches mergées (hebdomadaire)
git branch --merged develop | grep -v develop | grep -v main | xargs -n 1 git branch -d
git remote prune origin

# Alerter branches anciennes (>30 jours)
git for-each-ref --format='%(refname:short) %(committerdate)' refs/remotes/origin | awk '$2 < "'$(date -d '30 days ago' '+%Y-%m-%d')'"'
```

## **Conventions de Nommage**

### **Préfixes Obligatoires**
- `feature/` - Nouvelles fonctionnalités
- `bugfix/` - Corrections de bugs
- `hotfix/` - Urgences production  
- `release/` - Préparation releases
- `chore/` - Maintenance, refactoring

### **Descriptions Claires**
- `feature/drag-drop-playlist` ✅
- `bugfix/audio-memory-leak` ✅
- `hotfix/firebase-auth-timeout` ✅
- `update-deps` ❌ (manque préfixe)
- `fix-stuff` ❌ (trop vague)

## **Métriques de Succès**

### **Objectifs**
```yaml
branch_lifetime: <7 jours (features)
merge_conflicts: <5% des PRs  
hotfix_frequency: <1/mois
cleanup_frequency: hebdomadaire
```

### **Monitoring**
- Branches actives: max 10
- Branches stales: 0 (>30 jours)
- Protection compliance: 100%
- Auto-cleanup: activé