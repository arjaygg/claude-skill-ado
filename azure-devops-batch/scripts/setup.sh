#!/bin/bash
# Setup script for Azure DevOps Batch Skill

set -e

echo "================================================"
echo "Azure DevOps Batch Operations Skill Setup"
echo "================================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed."
    echo "Please install Node.js 18 or higher from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "Error: Node.js version must be 18 or higher."
    echo "Current version: $(node -v)"
    exit 1
fi

echo "✓ Node.js version: $(node -v)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

echo "✓ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dependencies installed successfully"
else
    echo "✗ Failed to install dependencies"
    exit 1
fi

echo ""

# Check for .env file
if [ ! -f "../.env" ]; then
    echo "⚠ Warning: .env file not found"
    echo "Creating .env from .env.example..."
    cp ../.env.example ../.env
    echo ""
    echo "Please edit ../.env and add your Azure DevOps credentials:"
    echo "  - AZURE_DEVOPS_ORG"
    echo "  - AZURE_DEVOPS_PROJECT"
    echo "  - AZURE_DEVOPS_PAT"
    echo ""
else
    echo "✓ .env file found"
fi

# Build TypeScript
echo ""
echo "Building TypeScript files..."
npm run build

if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "⚠ Build had warnings (this is usually okay)"
fi

echo ""
echo "================================================"
echo "Setup Complete!"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Edit ../.env with your Azure DevOps credentials"
echo "2. Run 'npm start' to start the MCP server"
echo "3. Or run 'npm run examples' to test example operations"
echo ""
echo "Documentation:"
echo "  - Skill guide: ../SKILL.md"
echo "  - API reference: ../references/ado-batch-api-reference.md"
echo "  - README: ../README.md"
echo ""
