#!/bin/bash
# Git Repository Optimization Script
# Optimizes Git configuration and repository performance

set -e

echo "🔧 Git Repository Optimization Starting..."

# Git Configuration Optimization
echo "📝 Optimizing Git configuration..."

# Performance configurations
git config core.preloadindex true
git config core.fscache true
git config gc.auto 256
git config pack.window 10
git config pack.depth 50

# Line ending configuration for cross-platform development
git config core.autocrlf input
git config core.eol lf

# Push configuration
git config push.default current
git config push.autoSetupRemote true

# Pull configuration
git config pull.rebase true

# Branch configuration
git config branch.autosetupmerge always
git config branch.autosetuprebase always

# Diff and merge tools
git config diff.algorithm histogram
git config merge.conflictstyle diff3

# Color configuration
git config color.ui auto
git config color.branch auto
git config color.diff auto
git config color.status auto

# Advanced configurations
git config rebase.autoStash true
git config fetch.prune true
git config log.date iso
git config commit.verbose true

echo "🧹 Repository cleanup..."

# Cleanup unnecessary files
git gc --aggressive --prune=now

# Repack for better performance
git repack -Ad

# Clean up reflog
git reflog expire --expire=90.days --all
git reflog expire --expire-unreachable=30.days --all

# Clean up loose objects
git prune --expire=30.days

echo "📊 Repository statistics..."
echo "Repository size: $(du -sh .git | cut -f1)"
echo "Number of objects: $(git count-objects -v | grep 'count' | cut -d' ' -f2)"
echo "Packed objects: $(git count-objects -v | grep 'in-pack' | cut -d' ' -f2)"

echo "🔍 Analyzing large files..."
git ls-files | xargs -I {} du -h {} | sort -hr | head -10

echo "📈 Performance optimizations applied:"
echo "  ✅ Core performance settings"
echo "  ✅ Cross-platform line endings"
echo "  ✅ Modern push/pull defaults"
echo "  ✅ Enhanced diff/merge tools"
echo "  ✅ Automatic cleanup configuration"
echo "  ✅ Repository compaction completed"

echo "✅ Git optimization completed successfully!"