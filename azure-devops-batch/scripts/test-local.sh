#!/bin/bash
# Interactive test setup for the Azure DevOps Batch skill

set -e

echo "================================================"
echo "Azure DevOps Batch Skill - Interactive Setup"
echo "================================================"
echo ""

# Check if .env exists
if [ -f "../.env" ]; then
    echo "Found existing .env file"
    read -p "Do you want to use it? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        rm ../.env
        echo "Removed existing .env"
    else
        echo "Loading existing .env..."
        export $(cat ../.env | grep -v '^#' | xargs)
    fi
fi

# If no .env or user chose to recreate
if [ ! -f "../.env" ]; then
    echo "Let's set up your Azure DevOps credentials..."
    echo ""

    # Get organization
    read -p "Azure DevOps Organization (e.g., 'mycompany'): " ADO_ORG

    # Get project
    read -p "Azure DevOps Project (e.g., 'MyProject'): " ADO_PROJECT

    # Get PAT (hidden input)
    echo -n "Azure DevOps PAT (Personal Access Token): "
    read -s ADO_PAT
    echo ""

    # Create .env file
    cat > ../.env << EOF
# Azure DevOps Configuration
AZURE_DEVOPS_ORG=${ADO_ORG}
AZURE_DEVOPS_PROJECT=${ADO_PROJECT}
AZURE_DEVOPS_PAT=${ADO_PAT}
EOF

    echo ""
    echo "✓ Configuration saved to .env"
    echo ""

    # Load the variables
    export AZURE_DEVOPS_ORG="${ADO_ORG}"
    export AZURE_DEVOPS_PROJECT="${ADO_PROJECT}"
    export AZURE_DEVOPS_PAT="${ADO_PAT}"
fi

# Display current config
echo "Current configuration:"
echo "  Organization: ${AZURE_DEVOPS_ORG}"
echo "  Project: ${AZURE_DEVOPS_PROJECT}"
echo "  PAT: ${AZURE_DEVOPS_PAT:0:4}...${AZURE_DEVOPS_PAT: -4}"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    echo ""
fi

# Run the test script
echo "Running connection tests..."
echo ""
npx tsx test-skill.ts

echo ""
echo "================================================"
echo ""
echo "Your skill is ready! Try these examples:"
echo ""
echo "  # Query work items"
echo "  npm run example:query"
echo ""
echo "  # Update work item states (replace with real IDs)"
echo "  npm run example:bulk-update -- 1,2,3 Active"
echo ""
echo "  # Create tasks under a story (replace with real parent ID)"
echo "  npm run example:create-tasks -- 123 \"Task 1\" \"Task 2\""
echo ""
