# Azure DevOps Batch Operations Skill

A Claude Code skill for performing efficient batch operations with Azure DevOps REST APIs using direct API scripts.

## Features

- **Direct API Access**: No complex MCP setup - just run TypeScript scripts
- **Batch Work Item Operations**: Create, read, update, and delete work items in bulk
- **WIQL Queries**: Query work items using Work Item Query Language
- **Reusable Utilities**: Core functions for all batch operations
- **Ready-to-Run Examples**: 5 practical scripts for common scenarios
- **Comprehensive Documentation**: Full API reference and best practices

## Quick Start

### 1. Set Environment Variables

```bash
export AZURE_DEVOPS_ORG="your-organization"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

Or create a `.env` file:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 2. Install Dependencies

```bash
cd scripts
npm install
```

### 3. Run Example Scripts

```bash
# Update work item states
npm run example:bulk-update -- 1,2,3,4,5 Closed

# Create sprint tasks
npm run example:create-tasks -- 123 "Design UI" "Write tests"

# Sprint cleanup
npm run example:cleanup -- "MyProject\\Sprint 1"

# Bulk assign
npm run example:assign -- 1,2,3 "user@example.com"

# Query and update
npm run example:query
```

## Core Utilities

### `ado-client.ts`
Low-level HTTP client for Azure DevOps API:
- `adoRequest()` - Make authenticated API requests
- `getAdoConfig()` - Get configuration from environment
- `buildQueryString()` - Build URL query parameters

### `ado-batch.ts`
High-level batch operation functions:
- `batchGetWorkItems()` - Get multiple work items
- `batchUpdateWorkItems()` - Update multiple work items
- `batchCreateWorkItems()` - Create work items in bulk
- `batchDeleteWorkItems()` - Delete/destroy work items
- `queryWorkItems()` - Execute WIQL queries
- `createLinkOperation()` - Helper for creating work item links

## Example Scripts

### 1. `bulk-update-state.ts`
Update the state of multiple work items at once.

```bash
npm run example:bulk-update -- 1,2,3,4,5 Closed
```

**Use cases:**
- Close all completed sprint items
- Reopen bugs after regression
- Activate backlog items

### 2. `create-sprint-tasks.ts`
Create multiple tasks under a parent work item.

```bash
npm run example:create-tasks -- 123 "Task 1" "Task 2" "Task 3"
```

**Use cases:**
- Break down user stories into tasks
- Create standard checklist items
- Bulk task generation

### 3. `sprint-cleanup.ts`
Archive all completed work items from a sprint.

```bash
npm run example:cleanup -- "MyProject\\Sprint 1"
```

**Use cases:**
- End-of-sprint cleanup
- Archive old work items
- Bulk tagging for reporting

### 4. `bulk-assign.ts`
Assign multiple work items to a user.

```bash
npm run example:assign -- 1,2,3,4,5 "john@contoso.com"
```

**Use cases:**
- Distribute work among team members
- Reassign after team changes
- Balance workload

### 5. `query-and-update.ts`
Query work items by criteria and update them in batch.

```bash
npm run example:query
```

**Use cases:**
- Update priority for active bugs
- Add tags based on criteria
- Bulk field updates

### 6. `fetch-work-item-history.ts`
Fetch and analyze complete work item change history for forensic analysis.

```bash
# With default team (ABC)
npx tsx scripts/fetch-work-item-history.ts

# With custom team
export TEAM_MEMBERS="John Doe,Jane Smith,Bob Johnson"
export TEAM_NAME="Engineering Team"
npx tsx scripts/fetch-work-item-history.ts
```

**Features:**
- Fetches all work item updates and revisions
- Analyzes assignment changes (who moved items and when)
- Tracks state transitions, estimation changes, sprint changes
- Identifies reassignments into/out of specified team
- Generates detailed JSON analysis with change metadata

**Use cases:**
- Forensic analysis of work item changes
- Track team reassignments and workload shifts
- Analyze estimation accuracy trends
- Identify bottlenecks and rework patterns

**Configuration (via environment variables):**
- `TEAM_MEMBERS` - Comma-separated team member names (default: ABC Team)
- `TEAM_NAME` - Display name for the team (default: "ABC")
- `AZURE_DEVOPS_ORG` - Azure DevOps organization
- `AZURE_DEVOPS_PROJECT` - Azure DevOps project
- `AZURE_DEVOPS_PAT` - Personal Access Token

**Output:**
Generates `change_analysis.json` with:
- Summary of all changes
- October-November focused analysis
- Detailed change records with timestamps
- Reassignment metrics

## Writing Custom Scripts

Import the utilities and write your own batch operations:

```typescript
import { batchUpdateWorkItems, queryWorkItems } from "./ado-batch.js";

// Query work items
const result = await queryWorkItems(
  "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'"
);

// Extract IDs
const ids = result.workItems.map((wi: any) => wi.id);

// Batch update
const updateResult = await batchUpdateWorkItems(
  ids.map((id) => ({
    id,
    operations: [
      {
        op: "add",
        path: "/fields/System.Tags",
        value: "reviewed",
      },
    ],
  }))
);

console.log(`Updated ${updateResult.succeeded} work items`);
```

## Directory Structure

```
azure-devops-batch/
├── SKILL.md                           # Skill definition
├── README.md                          # This file
├── .env.example                       # Environment template
├── scripts/
│   ├── ado-client.ts                 # HTTP client
│   ├── ado-batch.ts                  # Batch operations
│   ├── ado-utils.ts                  # Legacy utilities
│   ├── ado-large-data.ts             # Large dataset utilities
│   ├── fetch-work-item-history.ts    # Work item history analysis
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── setup.sh                      # Setup script
│   └── examples/
│       ├── bulk-update-state.ts
│       ├── create-sprint-tasks.ts
│       ├── sprint-cleanup.ts
│       ├── bulk-assign.ts
│       └── query-and-update.ts
└── references/
    └── ado-batch-api-reference.md    # API documentation
```

## API Reference

See `references/ado-batch-api-reference.md` for comprehensive API documentation including:

- Authentication methods
- All batch endpoints
- JSON Patch operations
- WIQL query syntax
- Error handling
- Rate limiting best practices

## Common JSON Patch Operations

```typescript
// Update a field
{
  op: "add",
  path: "/fields/System.State",
  value: "Closed"
}

// Add a tag
{
  op: "add",
  path: "/fields/System.Tags",
  value: "reviewed"
}

// Link to parent
{
  op: "add",
  path: "/relations/-",
  value: {
    rel: "System.LinkTypes.Hierarchy-Reverse",
    url: "https://dev.azure.com/{org}/{project}/_apis/wit/workitems/123"
  }
}
```

## Common WIQL Queries

```sql
-- Active bugs assigned to me
SELECT [System.Id] FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
  AND [System.AssignedTo] = @Me

-- Items from current sprint
SELECT [System.Id] FROM WorkItems
WHERE [System.IterationPath] = @CurrentIteration

-- Recently modified items
SELECT [System.Id] FROM WorkItems
WHERE [System.ChangedDate] >= @Today - 7
ORDER BY [System.ChangedDate] DESC
```

## Security Notes

- **Never commit PAT tokens** to version control
- Use environment variables for credentials
- Implement least-privilege access
- Rotate PAT tokens regularly
- Test destructive operations in non-production first

## Troubleshooting

### Authentication Errors
```bash
# Verify environment variables are set
echo $AZURE_DEVOPS_ORG
echo $AZURE_DEVOPS_PROJECT
echo $AZURE_DEVOPS_PAT

# Check PAT permissions (Work Items: Read, Write, Manage)
```

### Rate Limiting
- Keep batch sizes under 200 items
- Implement delays between batches if needed
- Monitor API response headers for rate limit info

### API Version Issues
- Use API version 7.1 or higher for best batch support
- Check your Azure DevOps Server version compatibility

## Using with Claude Code

This skill is designed to be used with Claude Code. When loaded, Claude can:

1. **Understand batch operations** and suggest appropriate scripts
2. **Write custom scripts** using the provided utilities
3. **Execute operations** by running the example scripts
4. **Handle errors** and provide detailed feedback

Simply reference this skill when you need Azure DevOps batch operations:
```
"I need to update 50 work items to Closed state"
"Create 10 tasks under user story #123"
"Find all active bugs and set priority to High"
```

## Contributing

This skill is part of the Claude Code skills ecosystem. To contribute:

1. Test changes thoroughly
2. Update documentation
3. Follow TypeScript best practices
4. Add examples for new features

## License

MIT

## Resources

- [Azure DevOps REST API Documentation](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Work Item Tracking API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [WIQL Reference](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
- [JSON Patch RFC 6902](https://tools.ietf.org/html/rfc6902)
