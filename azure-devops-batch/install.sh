#!/bin/bash
# Quick install script for Azure DevOps Batch skill

set -e

SKILL_NAME="azure-devops-batch"
INSTALL_DIR="${HOME}/.claude/skills/${SKILL_NAME}"

echo "================================================"
echo "Azure DevOps Batch Skill Installer"
echo "================================================"
echo ""

# Determine script directory (handles symlinks)
SOURCE="${BASH_SOURCE[0]}"
while [ -h "$SOURCE" ]; do
  DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"
  SOURCE="$(readlink "$SOURCE")"
  [[ $SOURCE != /* ]] && SOURCE="$DIR/$SOURCE"
done
SCRIPT_DIR="$( cd -P "$( dirname "$SOURCE" )" && pwd )"

echo "Installing to: $INSTALL_DIR"
echo ""

# Create skills directory if it doesn't exist
mkdir -p "${HOME}/.claude/skills"

# Check if already installed
if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Skill already installed at $INSTALL_DIR"
    read -p "Do you want to overwrite it? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Installation cancelled."
        exit 0
    fi
    rm -rf "$INSTALL_DIR"
fi

# Copy skill files
echo "Copying skill files..."
cp -r "$SCRIPT_DIR" "$INSTALL_DIR"

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$INSTALL_DIR/scripts"
npm install

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "  1. Copy the environment template:"
echo "     cp $INSTALL_DIR/.env.example .env"
echo ""
echo "  2. Edit .env and add your Azure DevOps credentials:"
echo "     - AZURE_DEVOPS_ORG"
echo "     - AZURE_DEVOPS_PROJECT"
echo "     - AZURE_DEVOPS_PAT"
echo ""
echo "  3. Test the skill:"
echo "     cd $INSTALL_DIR/scripts"
echo "     npm run example:bulk-update -- 1,2,3 Active"
echo ""
echo "  4. Use with Claude Code:"
echo "     The skill is now available in all Claude Code sessions!"
echo ""
echo "Documentation:"
echo "  - README: $INSTALL_DIR/README.md"
echo "  - Skill Guide: $INSTALL_DIR/SKILL.md"
echo "  - API Reference: $INSTALL_DIR/references/ado-batch-api-reference.md"
echo "  - Distribution: $INSTALL_DIR/DISTRIBUTION.md"
echo ""
