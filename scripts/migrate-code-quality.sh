#!/bin/bash

# Script de migration automatique pour améliorer la qualité du code
# Usage: bash scripts/migrate-code-quality.sh

set -e

echo "🚀 Démarrage de la migration de qualité du code..."

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "package.json" ]; then
    log_error "Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Créer un backup
BACKUP_DIR="backup-$(date +%Y%m%d-%H%M%S)"
log_info "Création du backup dans $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r src "$BACKUP_DIR/"
log_success "Backup créé"

# Fonction pour compter les occurrences
count_occurrences() {
    local pattern="$1"
    local description="$2"
    local count=$(grep -r "$pattern" src/ --include="*.ts" --include="*.tsx" | wc -l)
    echo "$count occurrences de $description trouvées"
    return $count
}

# Analyse initiale
log_info "Analyse initiale du code..."
echo "📊 État actuel :"
count_occurrences ": any" "types 'any'"
ANY_COUNT=$?
count_occurrences "console\." "console.*"
CONSOLE_COUNT=$?

# Phase 1: Migration des types any les plus courants
log_info "Phase 1: Migration des types 'any' courants..."

# Remplacer les patterns courants de 'any'
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    # Sauvegarder le fichier original
    cp "$file" "$file.bak"
    
    # Remplacements courants
    sed -i.tmp 's/error: any/error: Error | unknown/g' "$file"
    sed -i.tmp 's/data: any\[\]/data: unknown[]/g' "$file"
    sed -i.tmp 's/props: any/props: Record<string, unknown>/g' "$file"
    sed -i.tmp 's/event: any/event: Event/g' "$file"
    sed -i.tmp 's/response: any/response: unknown/g' "$file"
    sed -i.tmp 's/metadata: any/metadata: Record<string, unknown>/g' "$file"
    sed -i.tmp 's/context: any/context: Record<string, unknown>/g' "$file"
    
    # Nettoyer les fichiers temporaires
    rm -f "$file.tmp"
done

log_success "Migration des types 'any' courants terminée"

# Phase 2: Migration du logging
log_info "Phase 2: Migration du système de logging..."

# Ajouter les imports nécessaires aux fichiers qui utilisent console.*
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    if grep -q "console\." "$file"; then
        # Vérifier si l'import existe déjà
        if ! grep -q "import.*logger" "$file"; then
            # Ajouter l'import après les autres imports
            sed -i.tmp '/^import.*from/a\
import { log } from '\''@/lib/logger'\'';' "$file"
        fi
    fi
    rm -f "$file.tmp"
done

# Remplacer les console.* par log.*
find src -name "*.ts" -o -name "*.tsx" | while read file; do
    cp "$file" "$file.bak"
    
    # Remplacements de base
    sed -i.tmp 's/console\.log(/log.info(/g' "$file"
    sed -i.tmp 's/console\.info(/log.info(/g' "$file"
    sed -i.tmp 's/console\.warn(/log.warn(/g' "$file"
    sed -i.tmp 's/console\.error(/log.error(/g' "$file"
    sed -i.tmp 's/console\.debug(/log.debug(/g' "$file"
    
    rm -f "$file.tmp"
done

log_success "Migration du logging terminée"

# Phase 3: Vérification TypeScript
log_info "Phase 3: Vérification TypeScript..."

if npm run typecheck > /dev/null 2>&1; then
    log_success "Vérification TypeScript réussie"
else
    log_warning "Erreurs TypeScript détectées - vérification manuelle nécessaire"
    echo "Exécutez 'npm run typecheck' pour voir les détails"
fi

# Phase 4: Analyse post-migration
log_info "Phase 4: Analyse post-migration..."
echo "📊 État après migration :"
count_occurrences ": any" "types 'any'"
NEW_ANY_COUNT=$?
count_occurrences "console\." "console.*"
NEW_CONSOLE_COUNT=$?

# Calcul des améliorations
ANY_IMPROVED=$((ANY_COUNT - NEW_ANY_COUNT))
CONSOLE_IMPROVED=$((CONSOLE_COUNT - NEW_CONSOLE_COUNT))

echo ""
echo "📈 Résultats de la migration :"
echo "   Types 'any' réduits : $ANY_IMPROVED ($ANY_COUNT → $NEW_ANY_COUNT)"
echo "   Console.* réduits : $CONSOLE_IMPROVED ($CONSOLE_COUNT → $NEW_CONSOLE_COUNT)"

# Phase 5: Génération du rapport
log_info "Phase 5: Génération du rapport de migration..."

REPORT_FILE="migration-report-$(date +%Y%m%d-%H%M%S).md"
cat > "$REPORT_FILE" << EOF
# Rapport de Migration - Qualité du Code

**Date :** $(date)
**Backup :** $BACKUP_DIR

## Résultats

### Types 'any'
- **Avant :** $ANY_COUNT occurrences
- **Après :** $NEW_ANY_COUNT occurrences
- **Amélioré :** $ANY_IMPROVED occurrences (-$(( ANY_IMPROVED * 100 / (ANY_COUNT + 1) ))%)

### Console Logging
- **Avant :** $CONSOLE_COUNT occurrences
- **Après :** $NEW_CONSOLE_COUNT occurrences
- **Amélioré :** $CONSOLE_IMPROVED occurrences (-$(( CONSOLE_IMPROVED * 100 / (CONSOLE_COUNT + 1) ))%)

## Fichiers Modifiés

\`\`\`bash
$(find src -name "*.bak" | sed 's/\.bak$//' | head -20)
$([ $(find src -name "*.bak" | wc -l) -gt 20 ] && echo "... et $(( $(find src -name "*.bak" | wc -l) - 20 )) autres fichiers")
\`\`\`

## Actions Manuelles Requises

1. **Révision des types :** Vérifier les remplacements automatiques
2. **Contexte des logs :** Ajouter le contexte et les métadonnées
3. **Gestion d'erreurs :** Migrer vers les classes d'erreurs personnalisées
4. **Tests :** Vérifier que tous les tests passent

## Commandes de Vérification

\`\`\`bash
npm run typecheck  # Vérifier les types
npm run lint       # Vérifier le style
npm run test       # Lancer les tests
\`\`\`

## Rollback

En cas de problème, restaurer depuis le backup :
\`\`\`bash
rm -rf src
cp -r $BACKUP_DIR/src .
\`\`\`
EOF

log_success "Rapport généré : $REPORT_FILE"

# Phase 6: Nettoyage optionnel
echo ""
read -p "🧹 Supprimer les fichiers de backup (.bak) ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    find src -name "*.bak" -delete
    log_success "Fichiers de backup supprimés"
else
    log_info "Fichiers de backup conservés (*.bak)"
fi

# Recommandations finales
echo ""
log_info "Migration automatique terminée !"
echo ""
echo "🎯 Prochaines étapes recommandées :"
echo "   1. Réviser les changements avec 'git diff'"
echo "   2. Exécuter 'npm run typecheck' pour vérifier les types"
echo "   3. Exécuter 'npm run test' pour vérifier les tests"
echo "   4. Réviser manuellement les fichiers critiques"
echo "   5. Ajouter le contexte aux logs selon le guide de migration"
echo ""
echo "📖 Consultez docs/MIGRATION_GUIDE.md pour les détails"
echo "📊 Rapport détaillé : $REPORT_FILE"

# Afficher les fichiers avec le plus de problèmes restants
echo ""
log_info "Fichiers nécessitant le plus d'attention :"
echo "Types 'any' restants :"
grep -r ": any" src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -nr | head -5

echo ""
echo "Console.* restants :"
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | cut -d: -f1 | sort | uniq -c | sort -nr | head -5

log_success "Migration terminée avec succès ! 🎉"