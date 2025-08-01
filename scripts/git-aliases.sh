#!/bin/bash
# Git Aliases Setup Script
# Configures useful Git aliases for improved productivity

echo "🎯 Setting up Git aliases..."

# Basic shortcuts
git config alias.co checkout
git config alias.br branch
git config alias.ci commit
git config alias.st status
git config alias.sw switch

# Undo operations
git config alias.unstage 'reset HEAD --'
git config alias.last 'log -1 HEAD'
git config alias.undo 'reset --soft HEAD~1'
git config alias.amend 'commit --amend --no-edit'

# Log and history
git config alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
git config alias.hist 'log --pretty=format:"%h %ad | %s%d [%an]" --graph --date=short'
git config alias.today 'log --since="yesterday" --oneline --author="$(git config user.name)"'

# Branch management
git config alias.branches 'branch -a'
git config alias.remotes 'remote -v'
git config alias.cleanup 'branch --merged main | grep -v "main\|master" | xargs -n 1 git branch -d'

# Stash operations
git config alias.save 'stash save'
git config alias.pop 'stash pop'
git config alias.apply 'stash apply'

# Advanced operations
git config alias.pushf 'push --force-with-lease'
git config alias.sync '!git fetch origin && git rebase origin/main'
git config alias.wip '!git add -A && git commit -m "WIP: work in progress"'
git config alias.unwip '!git log -n 1 | grep -q -c "WIP" && git reset HEAD~1'

# Search and find
git config alias.grep 'grep --break --heading --line-number'
git config alias.find '!git ls-files | grep -i'

# Status and diff shortcuts
git config alias.d 'diff'
git config alias.ds 'diff --staged'
git config alias.dc 'diff --cached'

# Tag operations
git config alias.tags 'tag -l'
git config alias.lasttag 'describe --tags --abbrev=0'

# Show configuration
git config alias.aliases "config --get-regexp alias"
git config alias.whoami '!git config user.name && git config user.email'

echo "✅ Git aliases configured successfully!"
echo ""
echo "📋 Available aliases:"
echo "Basic: co, br, ci, st, sw"
echo "Undo: unstage, last, undo, amend"
echo "Log: lg, hist, today"
echo "Branch: branches, remotes, cleanup"
echo "Stash: save, pop, apply"
echo "Advanced: pushf, sync, wip, unwip"
echo "Search: grep, find"
echo "Diff: d, ds, dc"
echo "Tags: tags, lasttag"
echo "Info: aliases, whoami"
echo ""
echo "💡 Try: git lg (for beautiful log) or git aliases (to see all)"