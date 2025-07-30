#!/bin/bash

# 🔧 Onde Spectrale - Scripts de Workflow
# Outils pour automatiser les tâches de développement courantes

set -e

# Couleurs pour les messages
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Fonctions utilitaires
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# ===============================
# NOUVELLE FEATURE
# ===============================
new_feature() {
    local feature_name=$1
    
    if [ -z "$feature_name" ]; then
        error "Usage: ./workflow.sh feature <nom-de-la-feature>"
        exit 1
    fi
    
    log "Création de la nouvelle feature: $feature_name"
    
    # Vérifier qu'on est sur develop
    current_branch=$(git branch --show-current)
    if [ "$current_branch" != "develop" ]; then
        warning "Passage sur la branche develop..."
        git checkout develop
        git pull origin develop
    fi
    
    # Créer et changer vers la nouvelle branche
    branch_name="feature/$feature_name"
    git checkout -b "$branch_name"
    
    success "Branche $branch_name créée et active"
    log "Commencez à développer votre feature !"
    
    # Template de commit initial
    cat << EOF

📝 Template de commit pour votre feature:
git commit -m "✨ feat($feature_name): description de votre fonctionnalité"

🔄 Pour finir votre feature:
./workflow.sh finish-feature $feature_name
EOF
}

# ===============================
# FINIR FEATURE
# ===============================
finish_feature() {
    local feature_name=$1
    
    if [ -z "$feature_name" ]; then
        error "Usage: ./workflow.sh finish-feature <nom-de-la-feature>"
        exit 1
    fi
    
    branch_name="feature/$feature_name"
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$branch_name" ]; then
        error "Vous n'êtes pas sur la branche $branch_name"
        exit 1
    fi
    
    log "Finalisation de la feature: $feature_name"
    
    # Vérifications pre-push
    log "Exécution des vérifications..."
    npm run typecheck
    npm run lint
    npm run test
    
    # Push de la branche
    git push origin "$branch_name"
    
    success "Feature $feature_name prête pour Pull Request"
    log "Créez maintenant votre PR sur GitHub: $branch_name → develop"
    
    # Ouvrir GitHub PR si gh cli est installé
    if command -v gh &> /dev/null; then
        log "Ouverture de la PR avec GitHub CLI..."
        gh pr create --base develop --head "$branch_name" --title "✨ feat: $feature_name" --body "## Description\n\nNouvelle fonctionnalité: $feature_name\n\n## Type de Changement\n- [x] ✨ New feature\n\n## Testing\n- [x] Tests passent\n- [ ] Tests E2E à valider"
    fi
}

# ===============================
# CORRECTION DE BUG
# ===============================
new_bugfix() {
    local bug_name=$1
    
    if [ -z "$bug_name" ]; then
        error "Usage: ./workflow.sh bugfix <nom-du-bug>"
        exit 1
    fi
    
    log "Création du bugfix: $bug_name"
    
    # Partir de develop
    git checkout develop
    git pull origin develop
    
    # Créer branche bugfix
    branch_name="bugfix/$bug_name"
    git checkout -b "$branch_name"
    
    success "Branche $branch_name créée"
    log "Template de commit: git commit -m '🐛 fix($bug_name): description du fix'"
}

# ===============================
# HOTFIX PRODUCTION
# ===============================
hotfix() {
    local hotfix_name=$1
    
    if [ -z "$hotfix_name" ]; then
        error "Usage: ./workflow.sh hotfix <nom-du-hotfix>"
        exit 1
    fi
    
    warning "⚠️  HOTFIX PRODUCTION - Procédure critique !"
    read -p "Confirmez-vous le hotfix de production '$hotfix_name'? (y/N): " confirm
    
    if [ "$confirm" != "y" ]; then
        log "Hotfix annulé"
        exit 0
    fi
    
    log "Création du hotfix: $hotfix_name"
    
    # Partir de main
    git checkout main
    git pull origin main
    
    # Créer branche hotfix
    branch_name="hotfix/$hotfix_name"
    git checkout -b "$branch_name"
    
    success "Branche $branch_name créée"
    warning "Développez uniquement le fix critique nécessaire"
    log "Utilisez: ./workflow.sh deploy-hotfix $hotfix_name quand prêt"
}

# ===============================
# DEPLOYER HOTFIX
# ===============================
deploy_hotfix() {
    local hotfix_name=$1
    
    if [ -z "$hotfix_name" ]; then
        error "Usage: ./workflow.sh deploy-hotfix <nom-du-hotfix>"
        exit 1
    fi
    
    branch_name="hotfix/$hotfix_name"
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$branch_name" ]; then
        error "Vous n'êtes pas sur la branche $branch_name"
        exit 1
    fi
    
    warning "🚀 DEPLOIEMENT HOTFIX EN PRODUCTION"
    read -p "Confirmez-vous le déploiement? (y/N): " confirm
    
    if [ "$confirm" != "y" ]; then
        log "Déploiement annulé"
        exit 0
    fi
    
    # Vérifications critiques
    log "Vérifications critiques..."
    npm run typecheck
    npm run build
    
    # Merge vers main
    git checkout main
    git merge "$branch_name"
    
    # Tag de version
    read -p "Version du hotfix (ex: 1.2.1): " version
    git tag "v$version"
    
    # Push
    git push origin main --tags
    
    # Merge vers develop aussi
    git checkout develop
    git merge "$branch_name"
    git push origin develop
    
    # Cleanup
    git branch -d "$branch_name"
    git push origin --delete "$branch_name"
    
    success "🎉 Hotfix v$version déployé en production !"
}

# ===============================
# NETTOYAGE
# ===============================
cleanup() {
    log "Nettoyage des branches..."
    
    # Supprimer branches locales mergées
    merged_branches=$(git branch --merged develop | grep -v develop | grep -v main | tr -d ' ')
    
    if [ -n "$merged_branches" ]; then
        echo "$merged_branches" | xargs -n 1 git branch -d
        success "Branches locales mergées supprimées"
    else
        log "Aucune branche à supprimer"
    fi
    
    # Nettoyer remote tracking
    git remote prune origin
    
    # Lister branches non mergées
    unmerged=$(git branch --no-merged develop | grep -v develop | grep -v main)
    if [ -n "$unmerged" ]; then
        warning "Branches non mergées (à vérifier manuellement):"
        echo "$unmerged"
    fi
    
    success "Nettoyage terminé"
}

# ===============================
# RELEASE
# ===============================
release() {
    local version=$1
    
    if [ -z "$version" ]; then
        error "Usage: ./workflow.sh release <version> (ex: 1.2.0)"
        exit 1
    fi
    
    log "Préparation de la release v$version"
    
    # Partir de develop
    git checkout develop
    git pull origin develop
    
    # Créer branche release
    branch_name="release/v$version"
    git checkout -b "$branch_name"
    
    # Bump version
    npm version "$version" --no-git-tag-version
    
    # Générer changelog
    if command -v conventional-changelog &> /dev/null; then
        conventional-changelog -p angular -i CHANGELOG.md -s
        git add package.json CHANGELOG.md
        git commit -m "🚀 release: v$version"
    else
        warning "conventional-changelog non installé, changelog à créer manuellement"
        git add package.json
        git commit -m "🚀 release: bump version to v$version"
    fi
    
    success "Release v$version préparée sur branche $branch_name"
    log "Validez puis utilisez: ./workflow.sh deploy-release $version"
}

# ===============================
# DEPLOY RELEASE
# ===============================
deploy_release() {
    local version=$1
    
    if [ -z "$version" ]; then
        error "Usage: ./workflow.sh deploy-release <version>"
        exit 1
    fi
    
    branch_name="release/v$version"
    current_branch=$(git branch --show-current)
    
    if [ "$current_branch" != "$branch_name" ]; then
        error "Vous n'êtes pas sur la branche $branch_name"
        exit 1
    fi
    
    log "Déploiement de la release v$version"
    
    # Tests finaux
    npm run test
    npm run build
    
    # Merge vers main
    git checkout main
    git merge "$branch_name"
    git tag "v$version"
    git push origin main --tags
    
    # Merge vers develop
    git checkout develop
    git merge "$branch_name"
    git push origin develop
    
    # Cleanup
    git branch -d "$branch_name"
    git push origin --delete "$branch_name"
    
    success "🎉 Release v$version déployée !"
}

# ===============================
# MENU PRINCIPAL
# ===============================
show_help() {
    cat << EOF
🔧 Onde Spectrale - Workflow Tools

USAGE:
    ./workflow.sh <command> [args]

COMMANDS:
    feature <name>              Créer nouvelle feature
    finish-feature <name>       Finaliser feature pour PR
    bugfix <name>              Créer bugfix
    hotfix <name>              Créer hotfix production
    deploy-hotfix <name>       Déployer hotfix en production
    release <version>          Préparer release
    deploy-release <version>   Déployer release
    cleanup                    Nettoyer branches mergées
    
EXAMPLES:
    ./workflow.sh feature advanced-analytics
    ./workflow.sh bugfix audio-player-crash
    ./workflow.sh hotfix critical-security-fix
    ./workflow.sh release 1.2.0
    ./workflow.sh cleanup

Pour plus d'informations: docs/GIT_WORKFLOW.md
EOF
}

# ===============================
# EXECUTION
# ===============================
case "$1" in
    "feature")
        new_feature "$2"
        ;;
    "finish-feature")
        finish_feature "$2"
        ;;
    "bugfix")
        new_bugfix "$2"
        ;;
    "hotfix")
        hotfix "$2"
        ;;
    "deploy-hotfix")
        deploy_hotfix "$2"
        ;;
    "release")
        release "$2"
        ;;
    "deploy-release")
        deploy_release "$2"
        ;;
    "cleanup")
        cleanup
        ;;
    "help"|"--help"|"-h"|"")
        show_help
        ;;
    *)
        error "Commande inconnue: $1"
        show_help
        exit 1
        ;;
esac