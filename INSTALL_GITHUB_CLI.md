# 🚀 Install GitHub CLI (gh) - Guide

## Method 1: Direct Download (Recommended)

### Windows Installer
1. **Download**: Go to https://github.com/cli/cli/releases/latest
2. **Select**: Download `gh_*_windows_amd64.msi` (latest version)
3. **Install**: Run the MSI installer as Administrator
4. **Verify**: Open new terminal and run `gh --version`

### Manual Steps
```powershell
# Open PowerShell as Administrator and run:
# Download and install directly
Invoke-WebRequest -Uri "https://github.com/cli/cli/releases/latest/download/gh_2.76.1_windows_amd64.msi" -OutFile "$env:TEMP\gh.msi"
Start-Process msiexec.exe -ArgumentList "/i", "$env:TEMP\gh.msi", "/quiet" -Wait
```

## Method 2: Windows Package Manager (if available)

```powershell
# Open PowerShell as Administrator
winget install --id GitHub.cli
# Accept terms when prompted
```

## Method 3: Scoop Package Manager

```powershell
# Install Scoop first (if not installed)
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
iwr -useb get.scoop.sh | iex

# Install GitHub CLI
scoop install gh
```

## Method 4: Manual Binary Installation

```powershell
# Create directory
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\gh"

# Download and extract (replace with latest version)
$url = "https://github.com/cli/cli/releases/latest/download/gh_2.76.1_windows_amd64.zip"
Invoke-WebRequest -Uri $url -OutFile "$env:TEMP\gh.zip"
Expand-Archive -Path "$env:TEMP\gh.zip" -DestinationPath "$env:USERPROFILE\gh" -Force

# Add to PATH (temporary for current session)
$env:PATH += ";$env:USERPROFILE\gh\gh_2.76.1_windows_amd64\bin"

# Add to PATH permanently
$currentPath = [Environment]::GetEnvironmentVariable("PATH", "User")
$newPath = $currentPath + ";$env:USERPROFILE\gh\gh_2.76.1_windows_amd64\bin"
[Environment]::SetEnvironmentVariable("PATH", $newPath, "User")
```

## Verification & Setup

### 1. Verify Installation
```bash
gh --version
# Should show: gh version 2.76.1 (or latest)
```

### 2. Authenticate with GitHub
```bash
# Login to GitHub
gh auth login

# Follow the prompts:
# - Choose GitHub.com
# - Choose HTTPS (recommended)
# - Authenticate via web browser (recommended)
```

### 3. Test Basic Functionality
```bash
# Check current repository
gh repo view

# List your repositories
gh repo list

# Check authentication status
gh auth status
```

## Enable Advanced Features

### 1. Set up Branch Protection (from our script)
```bash
# Run our branch protection script
./scripts/setup-branch-protection.sh

# Or manually configure via GitHub CLI
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["continuous-integration"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true}'
```

### 2. Create Pull Requests
```bash
# Create a PR from current branch
gh pr create --title "Feature: Description" --body "Detailed description"

# List PRs
gh pr list

# View PR details
gh pr view <pr-number>

# Merge PR
gh pr merge <pr-number> --squash
```

### 3. Manage Issues
```bash
# Create issue
gh issue create --title "Bug: Description" --body "Details"

# List issues
gh issue list

# Close issue
gh issue close <issue-number>
```

### 4. Repository Management
```bash
# Clone repositories
gh repo clone owner/repo

# Create new repository
gh repo create my-new-repo --public

# View repository info
gh repo view owner/repo
```

## Integration with Our Git Workflow

### Update Branch Protection Script
Once GitHub CLI is installed, our branch protection script will automatically use it:

```bash
# This will now work with gh CLI installed
./scripts/setup-branch-protection.sh
```

### Enhanced Git Aliases
Add these GitHub CLI aliases to complement our Git setup:

```bash
# Add to our git aliases
git config alias.pr '!gh pr create'
git config alias.prview '!gh pr view'
git config alias.prlist '!gh pr list'
git config alias.issue '!gh issue create'
git config alias.repo '!gh repo view'
```

## Troubleshooting

### Common Issues

1. **Command not found after installation**
   - Restart terminal/command prompt
   - Check PATH environment variable
   - Reinstall with administrator privileges

2. **Authentication failures**
   - Run `gh auth login` again
   - Clear credentials: `gh auth logout`
   - Check GitHub token permissions

3. **API rate limits**
   - Authenticate to increase rate limits
   - Use personal access token if needed

4. **Repository access issues**
   - Ensure you have proper repository permissions
   - Check if repository is private/public
   - Verify authentication scope

### Get Help
```bash
# General help
gh help

# Command-specific help
gh pr --help
gh issue --help
gh repo --help
```

## Next Steps After Installation

1. **Authenticate**: `gh auth login`
2. **Test**: `gh repo view` in your project
3. **Enable branch protection**: `./scripts/setup-branch-protection.sh`
4. **Create a test PR**: Make a small change and use `gh pr create`
5. **Explore**: Try `gh pr list`, `gh issue list`, etc.

The GitHub CLI will greatly enhance your Git workflow with direct GitHub integration!