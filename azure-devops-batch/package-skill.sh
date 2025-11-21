#!/bin/bash
# Package the Azure DevOps Batch skill for distribution

set -e

SKILL_NAME="azure-devops-batch"
OUTPUT_DIR="./dist"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
OUTPUT_FILE="${OUTPUT_DIR}/${SKILL_NAME}_${TIMESTAMP}.zip"

echo "================================================"
echo "Packaging Azure DevOps Batch Skill"
echo "================================================"
echo ""

# Create dist directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Create a temporary directory for staging
TEMP_DIR=$(mktemp -d)
STAGING_DIR="${TEMP_DIR}/${SKILL_NAME}"
mkdir -p "$STAGING_DIR"

echo "Staging files..."

# Copy essential files
cp SKILL.md "$STAGING_DIR/"
cp README.md "$STAGING_DIR/"
cp .env.example "$STAGING_DIR/"

# Copy scripts directory
mkdir -p "$STAGING_DIR/scripts"
cp scripts/ado-client.ts "$STAGING_DIR/scripts/"
cp scripts/ado-batch.ts "$STAGING_DIR/scripts/"
cp scripts/package.json "$STAGING_DIR/scripts/"
cp scripts/tsconfig.json "$STAGING_DIR/scripts/"
cp scripts/setup.sh "$STAGING_DIR/scripts/"

# Copy examples
mkdir -p "$STAGING_DIR/scripts/examples"
cp scripts/examples/*.ts "$STAGING_DIR/scripts/examples/"

# Copy references
mkdir -p "$STAGING_DIR/references"
cp references/*.md "$STAGING_DIR/references/"

# Create assets directory (even if empty)
mkdir -p "$STAGING_DIR/assets"

echo "Creating archive..."

# Create zip file
cd "$TEMP_DIR"
zip -r "$OUTPUT_FILE" "$SKILL_NAME" -q

cd - > /dev/null

# Clean up
rm -rf "$TEMP_DIR"

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)

echo ""
echo "✅ Skill packaged successfully!"
echo ""
echo "   Output: $OUTPUT_FILE"
echo "   Size: $FILE_SIZE"
echo ""
echo "Distribution options:"
echo "  1. Share the zip file directly with team members"
echo "  2. Upload to a shared repository (GitHub, internal)"
echo "  3. Place in Claude Code skills directory"
echo ""
echo "Installation instructions:"
echo "  unzip ${SKILL_NAME}_*.zip -d ~/.claude/skills/"
echo "  cd ~/.claude/skills/${SKILL_NAME}/scripts && npm install"
echo ""
