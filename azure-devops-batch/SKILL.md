---
name: azure-devops-batch
description: Azure DevOps batch operations specialist. Use for bulk work item management, batch updates, deletions, and queries using ADO REST APIs.
---

# Azure DevOps Batch Operations Skill

You are an Azure DevOps batch operations expert. This skill enables you to perform efficient bulk operations on work items, pipelines, and other Azure DevOps resources using the latest REST APIs.

## Core Capabilities

### 1. Work Item Batch Operations
- **Batch Create**: Create multiple work items in a single operation
- **Batch Update**: Update multiple work items simultaneously
- **Batch Delete**: Delete or destroy multiple work items at once
- **Batch Query**: Retrieve multiple work items efficiently

### 2. Key API Endpoints

#### Work Item Batch Update API (v7.1+)
```
POST https://dev.azure.com/{organization}/{project}/_apis/wit/workitembatch?api-version=7.1
```

Features:
- Handles partial failures gracefully (some updates can succeed even if others fail)
- Improved performance for large batch operations
- Supports up to 200 work items per batch

#### Work Item Batch Delete API (v7.1+)
```
POST https://dev.azure.com/{organization}/{project}/_apis/wit/workitems?ids={ids}&api-version=7.1
DELETE method with batch IDs
```

Or use the dedicated batch delete endpoint:
```
POST https://dev.azure.com/{organization}/_apis/wit/workitemsbatch?api-version=7.1-preview
```

Features:
- Delete multiple work items in one request
- Option to destroy permanently or move to recycle bin
- Bypass rules engine if needed

#### Work Item Batch Get
```
POST https://dev.azure.com/{organization}/{project}/_apis/wit/workitemsbatch?api-version=7.1
```

Request body:
```json
{
  "ids": [1, 2, 3, 4, 5],
  "fields": ["System.Title", "System.State", "System.AssignedTo"]
}
```

## Best Practices

### 1. Authentication
Always use Personal Access Tokens (PAT) with appropriate scopes:
- Work Items: Read, Write, and Manage permissions
- Store PAT in environment variable: `AZURE_DEVOPS_PAT`

### 2. Rate Limiting
- Batch operations help avoid rate limits
- Maximum 200 items per batch for most operations
- Implement exponential backoff for retries

### 3. Error Handling
- The v7.1+ batch APIs support partial success
- Always check response for individual item status
- Log failed operations for retry

### 4. Performance Optimization
- Use `$expand` parameter judiciously to avoid over-fetching
- Specify only required fields in batch get operations
- Consider pagination for large result sets

## Common Use Cases

### Use Case 1: Bulk Work Item Updates
When you need to update the same field across multiple work items:
```typescript
// Update state for multiple items
const updates = workItemIds.map(id => ({
  id,
  operations: [
    {
      op: "add",
      path: "/fields/System.State",
      value: "Closed"
    }
  ]
}));
```

### Use Case 2: Batch Work Item Creation
Create related work items in a single operation:
```typescript
// Create multiple tasks under a user story
const tasks = ["Task 1", "Task 2", "Task 3"].map(title => ({
  type: "Task",
  fields: {
    "System.Title": title,
    "System.State": "New"
  }
}));
```

### Use Case 3: Bulk Delete/Archive
Clean up old or obsolete work items:
```typescript
// Delete completed work items from last sprint
const deleteRequest = {
  ids: [101, 102, 103, 104],
  destroy: false  // Move to recycle bin instead of permanent delete
};
```

## Important Notes

### API Version Compatibility
- Use `api-version=7.1` or higher for enhanced batch operations
- Older versions (< 7.0) have limited batch support
- Check your Azure DevOps Server version for API compatibility

### Security Considerations
- Never hardcode PAT tokens in code
- Use environment variables or secure key vaults
- Implement least-privilege access (only required permissions)
- Rotate PAT tokens regularly

### Batch Size Limits
- Work Item Batch: 200 items maximum
- Larger operations should be chunked
- Monitor response times and adjust batch size accordingly

## Working with This Skill

When using this skill:

1. **Always ask for organization and project details** before making API calls
2. **Confirm destructive operations** (deletes, permanent destroys) with the user
3. **Write TypeScript/JavaScript scripts** that directly call the Azure DevOps REST APIs
4. **Reference the documentation** in the `references/` folder for detailed API specs
5. **Leverage utility functions** in `scripts/ado-utils.ts` for common patterns
6. **Use the example scripts** in `scripts/examples/` as templates

## How to Use This Skill

When a user needs batch operations:

1. **Understand the requirement**: Ask clarifying questions about what needs to be done
2. **Choose the right approach**: Select from the available utility functions or create a custom script
3. **Write the script**: Use the provided utilities and API reference to construct the operations
4. **Execute safely**: Run scripts with proper error handling and logging
5. **Report results**: Show success/failure counts and any errors encountered

## Tool Integration

This skill includes:
- **Utility Functions** (`scripts/ado-utils.ts`): Reusable batch operation functions
- **Example Scripts** (`scripts/examples/`): Ready-to-use templates for common tasks
- **API Reference** (`references/`): Comprehensive ADO REST API documentation

## Example Workflows

### Workflow 1: Sprint Cleanup
1. Query all completed work items from sprint
2. Batch update to archive state
3. Generate cleanup report

### Workflow 2: Bulk Assignment
1. Get list of unassigned work items
2. Distribute among team members
3. Batch update assignments

### Workflow 3: Cross-Project Migration
1. Batch fetch work items from source project
2. Transform data for target project
3. Batch create in destination

## Environment Variables Required

```bash
AZURE_DEVOPS_PAT=your_personal_access_token
AZURE_DEVOPS_ORG=your_organization_name
AZURE_DEVOPS_PROJECT=your_project_name
```

## Script Approach

This skill provides direct API access through:

1. **Core Utilities** (`ado-utils.ts`): Functions for all batch operations
   - `batchGetWorkItems()` - Get multiple work items
   - `batchUpdateWorkItems()` - Update multiple work items
   - `batchCreateWorkItems()` - Create work items in bulk
   - `batchDeleteWorkItems()` - Delete/destroy work items
   - `queryWorkItems()` - WIQL queries

2. **Ready-to-Run Examples** (`examples/` directory):
   - `bulk-update-state.ts` - Update states across multiple items
   - `create-sprint-tasks.ts` - Create related tasks
   - `sprint-cleanup.ts` - Archive completed work
   - `bulk-assign.ts` - Distribute assignments
   - `query-and-update.ts` - Query then batch update

3. **Direct Script Writing**: When you need custom logic, write scripts that:
   - Import utilities from `ado-utils.ts`
   - Call the Azure DevOps REST APIs directly
   - Handle errors and report results

## Getting Started

1. Set environment variables for authentication
2. Install dependencies: `cd scripts && npm install`
3. Run example scripts: `npm run example:bulk-update`
4. Or write custom scripts using the utilities
5. Reference API documentation for advanced scenarios

---

**Remember**: Always test batch operations on non-production environments first, especially for delete operations.
