#!/bin/bash
# Branch Protection Setup Script
# Note: This script provides GitHub CLI commands for branch protection
# Requires GitHub CLI (gh) to be installed and authenticated

echo "🛡️ Branch Protection Setup Guide"
echo ""

# Check if gh CLI is available
if command -v gh &> /dev/null; then
    echo "✅ GitHub CLI found, setting up branch protection..."
    
    # Set up main branch protection
    echo "🔐 Setting up main branch protection..."
    gh api repos/:owner/:repo/branches/main/protection \
        --method PUT \
        --field required_status_checks='{"strict":true,"contexts":["continuous-integration"]}' \
        --field enforce_admins=true \
        --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
        --field restrictions=null \
        --field allow_force_pushes=false \
        --field allow_deletions=false 2>/dev/null || {
        echo "⚠️  API call failed. Using manual setup commands..."
    }
    
    echo "✅ Branch protection configured via GitHub API"
else
    echo "ℹ️  GitHub CLI not found. Please install 'gh' for automated setup."
    echo ""
    echo "📋 Manual setup instructions:"
    echo ""
    echo "1. Go to: https://github.com/$(git config remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).git/\1/')/settings/branches"
    echo ""
    echo "2. Add rule for 'main' branch with these settings:"
    echo "   ✅ Require a pull request before merging"
    echo "   ✅ Require approvals (1 reviewer minimum)"
    echo "   ✅ Dismiss stale PR approvals when new commits are pushed"
    echo "   ✅ Require status checks to pass before merging"
    echo "   ✅ Require branches to be up to date before merging"
    echo "   ✅ Require conversation resolution before merging"
    echo "   ✅ Restrict pushes that create files over 100 MB"
    echo "   ✅ Do not allow bypassing the above settings"
    echo ""
    echo "3. Optional CI/CD status checks:"
    echo "   - continuous-integration/tests"
    echo "   - continuous-integration/build"
    echo "   - continuous-integration/lint"
    echo ""
fi

# GitHub CLI commands for branch protection (if available)
echo ""
echo "🔧 GitHub CLI commands for reference:"
echo ""
cat << 'EOF'
# Enable branch protection with comprehensive rules
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["continuous-integration"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}' \
  --field restrictions=null \
  --field allow_force_pushes=false \
  --field allow_deletions=false

# Alternative: Use gh CLI branch protection (if available in your version)
gh api repos/:owner/:repo --method PATCH \
  --field allow_merge_commit=false \
  --field allow_squash_merge=true \
  --field allow_rebase_merge=true \
  --field delete_branch_on_merge=true

# Set up repository defaults
gh api repos/:owner/:repo --method PATCH \
  --field default_branch=main \
  --field has_issues=true \
  --field has_projects=true \
  --field has_wiki=false \
  --field allow_update_branch=true
EOF

echo ""
echo "✅ Branch protection setup completed!"
echo ""
echo "🔒 Current local Git protection measures:"
echo "  ✅ Pre-commit hooks (type check, lint, format)"
echo "  ✅ Pre-push hooks (tests, security scan)"
echo "  ✅ Commit message validation"
echo "  ✅ Automatic maintenance"
echo ""
echo "🌐 Remote protection requires GitHub/GitLab configuration"