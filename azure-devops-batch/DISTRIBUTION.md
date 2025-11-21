# Distribution Guide - Azure DevOps Batch Skill

This guide explains how to package, distribute, and install the Azure DevOps Batch skill across projects and teams.

## Quick Distribution

### Package the Skill

```bash
# Create distributable zip file
./package-skill.sh
```

This creates `dist/azure-devops-batch_TIMESTAMP.zip` containing all necessary files.

## Distribution Options

### Option 1: GitHub Repository (Recommended for Open Source)

**Best for:** Public sharing, version control, community contributions

```bash
# 1. Create a GitHub repository
gh repo create azure-devops-batch-skill --public

# 2. Push the skill
git init
git add .
git commit -m "Initial commit: Azure DevOps Batch skill"
git remote add origin https://github.com/YOUR_USERNAME/azure-devops-batch-skill.git
git push -u origin main

# 3. Users can clone directly
git clone https://github.com/YOUR_USERNAME/azure-devops-batch-skill.git ~/.claude/skills/azure-devops-batch
```

**Installation for users:**
```bash
# Clone into Claude skills directory
git clone https://github.com/YOUR_USERNAME/azure-devops-batch-skill.git ~/.claude/skills/azure-devops-batch
cd ~/.claude/skills/azure-devops-batch/scripts
npm install
```

### Option 2: Internal Git Repository (Private Teams)

**Best for:** Enterprise teams, private organizations

```bash
# 1. Push to internal GitLab/Azure DevOps Repos
git remote add origin https://gitlab.company.com/devops/azure-devops-batch-skill.git
git push -u origin main

# 2. Users install via git clone
git clone https://gitlab.company.com/devops/azure-devops-batch-skill.git ~/.claude/skills/azure-devops-batch
```

### Option 3: Packaged Archive Distribution

**Best for:** One-time distribution, air-gapped environments, email sharing

```bash
# 1. Package the skill
./package-skill.sh

# 2. Share the zip file via:
#    - Email attachment
#    - Shared drive
#    - Internal artifact repository
#    - Slack/Teams

# 3. Users install manually
unzip azure-devops-batch_*.zip -d ~/.claude/skills/
cd ~/.claude/skills/azure-devops-batch/scripts
npm install
```

### Option 4: NPM Package (Advanced)

**Best for:** Large organizations with internal NPM registries

```bash
# 1. Add to scripts/package.json
{
  "name": "@mycompany/azure-devops-batch-skill",
  "version": "1.0.0",
  "files": ["../SKILL.md", "*.ts", "examples/*.ts"]
}

# 2. Publish to internal registry
cd scripts
npm publish --registry https://registry.company.com

# 3. Users install via npm
npm install -g @mycompany/azure-devops-batch-skill
```

## Claude Code Skills Directory

Claude Code looks for skills in these locations:

### macOS/Linux
```bash
~/.claude/skills/          # User skills
/usr/local/share/claude/skills/  # System-wide skills (requires sudo)
```

### Windows
```powershell
%USERPROFILE%\.claude\skills\     # User skills
%PROGRAMDATA%\Claude\skills\      # System-wide skills
```

### Project-Specific
```bash
.claude/skills/            # Project-local skills
```

## Installation Methods

### Method 1: Direct Installation (Development)

When actively developing the skill:

```bash
# Link directly to development directory
ln -s /Users/axos-agallentes/git/claude-skill-ado/azure-devops-batch ~/.claude/skills/azure-devops-batch
```

### Method 2: User Installation (Standard)

For regular use:

```bash
# Copy to user skills directory
mkdir -p ~/.claude/skills
cp -r azure-devops-batch ~/.claude/skills/
cd ~/.claude/skills/azure-devops-batch/scripts
npm install
```

### Method 3: System-Wide Installation (Teams)

For all users on a machine:

```bash
# Install system-wide (requires sudo)
sudo mkdir -p /usr/local/share/claude/skills
sudo cp -r azure-devops-batch /usr/local/share/claude/skills/
cd /usr/local/share/claude/skills/azure-devops-batch/scripts
sudo npm install
```

### Method 4: Project-Specific Installation

For a specific project only:

```bash
# Install in project directory
mkdir -p .claude/skills
cp -r azure-devops-batch .claude/skills/
cd .claude/skills/azure-devops-batch/scripts
npm install

# Add to .gitignore
echo ".claude/skills/*/scripts/node_modules" >> .gitignore
```

## Using the Skill

### Load Skill in Claude Code

Skills are loaded automatically from the skills directories. To explicitly reference:

```
# In a Claude Code conversation
"Load the Azure DevOps batch skill and help me update 50 work items"

# Or reference specific functionality
"Using the ADO batch skill, create a script to archive completed sprint items"
```

### Configuration Per Project

Each project should have its own `.env` file:

```bash
# Project A
cd ~/projects/project-a
cat > .env << EOF
AZURE_DEVOPS_ORG=org-a
AZURE_DEVOPS_PROJECT=project-a
AZURE_DEVOPS_PAT=pat_token_a
EOF

# Project B
cd ~/projects/project-b
cat > .env << EOF
AZURE_DEVOPS_ORG=org-b
AZURE_DEVOPS_PROJECT=project-b
AZURE_DEVOPS_PAT=pat_token_b
EOF
```

## Updating the Skill

### For Git-based Distribution

```bash
# Users pull latest changes
cd ~/.claude/skills/azure-devops-batch
git pull
cd scripts && npm install
```

### For Archive Distribution

```bash
# Remove old version
rm -rf ~/.claude/skills/azure-devops-batch

# Install new version
unzip azure-devops-batch_NEW.zip -d ~/.claude/skills/
cd ~/.claude/skills/azure-devops-batch/scripts
npm install
```

## Skill Registry (Optional)

For large organizations, maintain a skills registry:

```yaml
# skills-registry.yaml
skills:
  - name: azure-devops-batch
    version: 1.0.0
    source: https://github.com/company/azure-devops-batch-skill
    description: Batch operations for Azure DevOps
    install: |
      git clone https://github.com/company/azure-devops-batch-skill ~/.claude/skills/azure-devops-batch
      cd ~/.claude/skills/azure-devops-batch/scripts && npm install

  - name: jira-batch
    version: 1.0.0
    source: https://github.com/company/jira-batch-skill
    description: Batch operations for Jira
```

## Best Practices

### Version Management

1. **Use Git Tags**: Tag releases with semantic versioning
   ```bash
   git tag -a v1.0.0 -m "Initial release"
   git push --tags
   ```

2. **Include VERSION file**:
   ```bash
   echo "1.0.0" > VERSION
   ```

3. **Changelog**: Maintain CHANGELOG.md with each release

### Documentation

- Always include README.md with installation instructions
- Provide clear examples in the SKILL.md
- Document environment variables needed
- Include troubleshooting section

### Dependencies

- Keep dependencies minimal (this skill has zero runtime deps!)
- Lock versions in package.json
- Include package-lock.json for reproducibility
- Document Node.js version requirements

### Security

- Never include .env files in distributions
- Provide .env.example instead
- Document required PAT permissions
- Include security best practices in README

## Distribution Checklist

Before distributing your skill:

- [ ] README.md is complete and accurate
- [ ] SKILL.md has clear instructions
- [ ] .env.example is included (.env is NOT)
- [ ] package.json has correct metadata
- [ ] All example scripts are tested
- [ ] Documentation includes installation steps
- [ ] VERSION or git tag is set
- [ ] LICENSE file is included (if open source)
- [ ] No sensitive information in code
- [ ] Dependencies are locked

## Example: Complete Distribution Workflow

```bash
# 1. Finalize the skill
cd azure-devops-batch
./scripts/setup.sh  # Test installation

# 2. Package it
./package-skill.sh

# 3. Option A: Upload to GitHub
gh release create v1.0.0 dist/azure-devops-batch_*.zip --title "v1.0.0" --notes "Initial release"

# 4. Option B: Share on internal network
cp dist/azure-devops-batch_*.zip /mnt/shared/claude-skills/

# 5. Users install
unzip azure-devops-batch_*.zip -d ~/.claude/skills/
cd ~/.claude/skills/azure-devops-batch/scripts
npm install

# 6. Configure for their project
cd ~/projects/their-project
cp ~/.claude/skills/azure-devops-batch/.env.example .env
# Edit .env with their credentials

# 7. Use with Claude Code
# Skills are now available automatically!
```

## Troubleshooting

### Skill Not Loading

```bash
# Check skill is in the right location
ls -la ~/.claude/skills/azure-devops-batch

# Verify SKILL.md exists
cat ~/.claude/skills/azure-devops-batch/SKILL.md

# Check permissions
chmod -R 755 ~/.claude/skills/azure-devops-batch
```

### Dependencies Not Installed

```bash
# Reinstall dependencies
cd ~/.claude/skills/azure-devops-batch/scripts
rm -rf node_modules package-lock.json
npm install
```

### Script Execution Fails

```bash
# Check environment variables
echo $AZURE_DEVOPS_ORG
echo $AZURE_DEVOPS_PROJECT
echo $AZURE_DEVOPS_PAT

# Verify Node.js version
node --version  # Should be >= 18.0.0

# Test script directly
cd ~/.claude/skills/azure-devops-batch/scripts
npx tsx examples/bulk-update-state.ts
```

## Support and Contributions

### For Open Source Distribution

- Include CONTRIBUTING.md
- Set up GitHub Issues for bug reports
- Use Pull Requests for contributions
- Maintain a CODE_OF_CONDUCT.md

### For Internal Distribution

- Set up internal Slack/Teams channel
- Document support contacts
- Maintain internal wiki/docs
- Regular training sessions

## Conclusion

The Azure DevOps Batch skill can be distributed in multiple ways depending on your needs:

- **Quick sharing**: Use packaged `.zip` files
- **Version control**: Use Git repositories (GitHub/GitLab)
- **Enterprise**: Use internal package registries
- **Development**: Use symbolic links

Choose the method that best fits your team's workflow and infrastructure.
