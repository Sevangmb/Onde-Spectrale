# 🌊 Git Workflow Guide - Onde Spectrale

## 🎯 Branch Strategy

### Primary Branches
- **`main`** - Production-ready code, protected branch
- **`master`** - Legacy branch (being phased out)
- **`develop`** - Integration branch for features (optional)

### Feature Branches
```bash
# Create feature branch
git checkout -b feat/audio-improvements main
git push -u origin feat/audio-improvements

# Work and commit
git add .
git commit -m "feat(audio): improve playback quality"

# Keep up to date
git fetch origin
git rebase origin/main

# Create pull request when ready
gh pr create --title "Improve audio playback quality" --body "..."
```

## 🔧 Git Configuration (Applied)

### Performance Optimizations
```bash
core.preloadindex=true      # Faster index operations
core.fscache=true          # Enable file system cache
gc.auto=256                # Auto garbage collection
pack.window=10             # Optimize pack files
pack.depth=50              # Delta compression depth
```

### Workflow Configuration
```bash
push.default=current           # Push current branch to same name
push.autoSetupRemote=true     # Auto-create remote branch
pull.rebase=true              # Rebase instead of merge on pull
fetch.prune=true              # Auto-prune remote branches
```

### Quality Configuration
```bash
diff.algorithm=histogram      # Better diff algorithm
merge.conflictstyle=diff3     # Show original + both sides in conflicts
commit.verbose=true           # Show diff in commit message editor
```

## 🎛️ Git Hooks (Active)

### Pre-commit Hook
- ✅ TypeScript type checking
- ✅ ESLint code quality checks
- ✅ Prettier formatting validation
- ✅ Prevents commits with formatting issues

### Commit-msg Hook
- ✅ Validates commit message format
- ✅ Enforces conventional commits
- ✅ Pattern: `type(scope): description`

### Pre-push Hook (New)
- ✅ Runs full test suite
- ✅ Scans for sensitive data
- ✅ Validates commit messages in push range
- ✅ Prevents pushing failing tests

### Post-commit Hook (New)
- ✅ Checks package-lock.json sync
- ✅ Detects merge conflict markers
- ✅ Tracks build metrics
- ✅ Automated maintenance tasks

## 📝 Commit Message Standards

### Format
```
type(scope): description

[optional body]

[optional footer]
```

### Types
- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, etc.)
- **refactor**: Code refactoring
- **test**: Adding or updating tests
- **chore**: Maintenance tasks
- **perf**: Performance improvements
- **ci**: CI/CD changes
- **build**: Build system changes
- **revert**: Revert previous commit

### Examples
```bash
feat(audio): add volume control slider
fix(playlist): resolve track skipping issue
docs(api): update authentication guide
test(player): add comprehensive AudioPlayer tests
chore(deps): update dependencies to latest versions
```

## 🚀 Daily Workflow

### Starting Work
```bash
# Switch to main and get latest changes
git checkout main
git pull origin main

# Create feature branch
git checkout -b feat/your-feature-name

# Start coding...
```

### During Development
```bash
# Commit frequently with descriptive messages
git add .
git commit -m "feat(scope): implement feature logic"

# Keep branch up to date
git fetch origin
git rebase origin/main

# Push to remote
git push origin feat/your-feature-name
```

### Finishing Work
```bash
# Final rebase and cleanup
git rebase origin/main
git push --force-with-lease origin feat/your-feature-name

# Create pull request
gh pr create --title "Feature: Your Feature Name" --body "Description..."

# After merge, cleanup
git checkout main
git pull origin main
git branch -d feat/your-feature-name
```

## 🔍 Repository Analysis Tools

### Check Repository Health
```bash
# Run optimization script
./scripts/git-optimize.sh

# Clean up branches
./scripts/git-branch-cleanup.sh

# Check repository size
du -sh .git

# Analyze large files
git ls-files | xargs -I {} du -h {} | sort -hr | head -10
```

### Performance Monitoring
```bash
# Object count
git count-objects -v

# Recent activity
git log --oneline --since="1 week ago"

# Branch status
git for-each-ref --format='%(refname:short) %(committerdate:relative)' refs/heads/
```

## 🛡️ Best Practices

### Security
- ✅ Never commit secrets, API keys, or passwords
- ✅ Use `.gitignore` for sensitive files
- ✅ Pre-push hook scans for sensitive data
- ✅ Use environment variables for configuration

### Performance
- ✅ Keep commits focused and atomic
- ✅ Use meaningful commit messages
- ✅ Regular repository cleanup with GC
- ✅ Avoid large binary files in Git

### Collaboration
- ✅ Use pull requests for code review
- ✅ Keep feature branches short-lived
- ✅ Rebase instead of merge for cleaner history
- ✅ Use conventional commit format

## 🎯 Repository Statistics

### Current Status
- **Repository size**: ~1.2MB (optimized from 3.5MB)
- **Total objects**: 1,903 (packed efficiently)
- **Active branches**: 2 local, 5 remote
- **Recent commits**: 224 in last month
- **Largest files**: package-lock.json (924KB)

### Optimization Results
- 🔥 **65% size reduction** through aggressive garbage collection
- ⚡ **Enhanced performance** with core optimization settings
- 🧹 **Automated cleanup** with post-commit maintenance
- 🔐 **Security scanning** with pre-push validation

## 🚀 Advanced Features

### Git Aliases (Available)
```bash
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.visual '!gitk'
```

### Repository Maintenance
```bash
# Monthly maintenance
git gc --aggressive --prune=now
git repack -Ad
git reflog expire --expire=90.days --all

# Weekly branch cleanup  
./scripts/git-branch-cleanup.sh

# As needed optimization
./scripts/git-optimize.sh
```

This workflow ensures code quality, security, and maintainability while optimizing for team collaboration and repository performance.