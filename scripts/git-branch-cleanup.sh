#!/bin/bash
# Git Branch Cleanup and Management Script

set -e

echo "🌿 Git Branch Cleanup Starting..."

# Function to safely delete branches
safe_delete_branch() {
    local branch=$1
    local force=${2:-false}
    
    echo "🔍 Analyzing branch: $branch"
    
    # Check if branch exists
    if ! git show-ref --verify --quiet refs/heads/$branch; then
        echo "  ℹ️  Branch $branch does not exist locally"
        return
    fi
    
    # Check if branch is merged
    if git merge-base --is-ancestor $branch HEAD; then
        echo "  ✅ Branch $branch is merged, safe to delete"
        git branch -d $branch 2>/dev/null || {
            if [ "$force" = "true" ]; then
                echo "  🗑️  Force deleting unmerged branch: $branch"
                git branch -D $branch
            else
                echo "  ⚠️  Branch $branch is not merged, skipping (use --force to delete)"
            fi
        }
    else
        echo "  ⚠️  Branch $branch is not merged"
        if [ "$force" = "true" ]; then
            echo "  🗑️  Force deleting: $branch"
            git branch -D $branch
        else
            echo "  💾 Keeping unmerged branch: $branch"
        fi
    fi
}

# Update remote references
echo "🔄 Updating remote references..."
git fetch --prune origin

# List all branches
echo "📋 Current branches:"
git branch -a --format='%(refname:short) %(committerdate:relative)' | sort -k2

# Clean up merged local branches
echo "🧹 Cleaning up merged local branches..."
merged_branches=$(git for-each-ref --format='%(refname:short)' refs/heads/ | grep -v "main\|master\|develop" || true)

if [ -n "$merged_branches" ]; then
    echo "Found local branches to analyze:"
    echo "$merged_branches" | while read branch; do
        if [ -n "$branch" ]; then
            safe_delete_branch "$branch"
        fi
    done
else
    echo "  ✅ No local branches to clean up"
fi

# Clean up remote tracking branches
echo "🌐 Cleaning up stale remote tracking branches..."
git remote prune origin

# Check for branches that exist on remote but not locally
echo "📡 Remote branches not tracked locally:"
git branch -r | grep -v "HEAD\|main\|master" | sed 's/origin\///' | while read branch; do
    if ! git show-ref --verify --quiet refs/heads/$branch; then
        echo "  📋 Remote branch: $branch (consider: git checkout -b $branch origin/$branch)"
    fi
done

# Suggest main branch migration if still on master
current_branch=$(git branch --show-current)
if [ "$current_branch" = "master" ]; then
    echo "💡 Recommendation: Consider migrating from 'master' to 'main' branch:"
    echo "   git checkout -b main"
    echo "   git push -u origin main"
    echo "   # Then update default branch on GitHub/GitLab"
fi

# Display repository statistics
echo "📊 Repository statistics:"
echo "  Local branches: $(git branch | wc -l)"
echo "  Remote branches: $(git branch -r | wc -l)"
echo "  Stash entries: $(git stash list | wc -l)"
echo "  Recent commits: $(git rev-list --count --since="1 month ago" HEAD)"

echo "✅ Branch cleanup completed!"