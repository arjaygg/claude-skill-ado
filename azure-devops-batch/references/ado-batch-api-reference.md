# Azure DevOps Batch API Reference

## Overview

Azure DevOps provides comprehensive REST APIs for batch operations, enabling efficient bulk management of work items and other resources. This reference covers the most commonly used batch endpoints.

## API Version Support

| Server Version | REST API Version | Batch Support |
|---|---|---|
| Azure DevOps Services | 7.2 | Full |
| Azure DevOps Server 2022.1 | 7.1 | Full |
| Azure DevOps Server 2022 | 7.0 | Partial |
| Azure DevOps Server 2020 | 6.0 | Limited |

**Recommendation**: Use API version 7.1 or higher for best batch operation support.

## Authentication

All requests require authentication using Personal Access Tokens (PAT).

### Request Header
```
Authorization: Basic {base64encoded(:PAT)}
Content-Type: application/json-patch+json
```

### Example
```bash
# Encode PAT (the colon before PAT is required)
echo -n ":your_pat_here" | base64

# Use in request
curl -H "Authorization: Basic OnlvdXJfcGF0X2hlcmU=" \
     -H "Content-Type: application/json-patch+json" \
     https://dev.azure.com/{org}/{project}/_apis/wit/workitems?api-version=7.1
```

## Work Item Batch Operations

### 1. Batch Get Work Items

Retrieve multiple work items in a single request.

**Endpoint**: `GET https://dev.azure.com/{organization}/{project}/_apis/wit/workitems`

**Query Parameters**:
- `ids` (required): Comma-separated list of work item IDs
- `fields` (optional): Comma-separated list of fields to return
- `asOf` (optional): Return work items as of a specific date/time
- `$expand` (optional): Expand related data (`all`, `relations`, `none`)
- `api-version` (required): API version (use `7.1` or higher)

**Example Request**:
```http
GET https://dev.azure.com/myorg/myproject/_apis/wit/workitems?ids=1,2,3,4,5&fields=System.Title,System.State&$expand=relations&api-version=7.1
```

**Response**:
```json
{
  "count": 5,
  "value": [
    {
      "id": 1,
      "rev": 3,
      "fields": {
        "System.Title": "Implement login feature",
        "System.State": "Active"
      },
      "relations": [...]
    },
    ...
  ]
}
```

### 2. Batch Update Work Items

Update multiple work items using JSON Patch format.

**Endpoint**: `PATCH https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}`

**Important**: While this endpoint updates a single work item, you should call it multiple times for batch operations. The v7.1+ API handles these efficiently and supports partial success.

**Query Parameters**:
- `api-version` (required): API version
- `bypassRules` (optional): Bypass work item validation rules (default: false)
- `suppressNotifications` (optional): Don't send notifications (default: false)

**Request Body** (JSON Patch):
```json
[
  {
    "op": "add",
    "path": "/fields/System.State",
    "value": "Closed"
  },
  {
    "op": "add",
    "path": "/fields/Microsoft.VSTS.Common.Priority",
    "value": 1
  }
]
```

**JSON Patch Operations**:
- `add`: Add or update a field value
- `replace`: Replace existing value
- `remove`: Remove a field value
- `test`: Test that a field has a specific value

**Example Request**:
```http
PATCH https://dev.azure.com/myorg/myproject/_apis/wit/workitems/123?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.State",
    "value": "Closed"
  }
]
```

**Response**:
```json
{
  "id": 123,
  "rev": 4,
  "fields": {
    "System.State": "Closed",
    ...
  }
}
```

### 3. Batch Create Work Items

Create multiple work items by calling the create endpoint multiple times.

**Endpoint**: `PATCH https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/$Task`

Replace `$Task` with the work item type (e.g., `$Bug`, `$UserStory`, `$Task`).

**Request Body** (JSON Patch):
```json
[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "New task"
  },
  {
    "op": "add",
    "path": "/fields/System.Description",
    "value": "Task description"
  }
]
```

**Example Request**:
```http
PATCH https://dev.azure.com/myorg/myproject/_apis/wit/workitems/$Task?api-version=7.1
Content-Type: application/json-patch+json

[
  {
    "op": "add",
    "path": "/fields/System.Title",
    "value": "Implement feature X"
  }
]
```

### 4. Batch Delete Work Items

Delete or destroy multiple work items.

**Endpoint**: `DELETE https://dev.azure.com/{organization}/{project}/_apis/wit/workitems/{id}`

**Query Parameters**:
- `api-version` (required): API version
- `destroy` (optional): Permanently destroy (true) or move to recycle bin (false, default)

**Example Request**:
```http
DELETE https://dev.azure.com/myorg/myproject/_apis/wit/workitems/123?destroy=false&api-version=7.1
```

**Response**:
```json
{
  "id": 123,
  "code": 200,
  "deletedBy": "user@example.com",
  "deletedDate": "2024-01-15T10:30:00Z"
}
```

**Batch Delete Endpoint (v7.1-preview)**:
```http
POST https://dev.azure.com/{organization}/_apis/wit/workitemsbatch?api-version=7.1-preview

{
  "ids": [1, 2, 3, 4, 5],
  "destroy": false
}
```

### 5. Query Work Items (WIQL)

Query work items using Work Item Query Language.

**Endpoint**: `POST https://dev.azure.com/{organization}/{project}/_apis/wit/wiql`

**Query Parameters**:
- `api-version` (required): API version
- `$top` (optional): Maximum number of results

**Request Body**:
```json
{
  "query": "SELECT [System.Id], [System.Title], [System.State] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active' ORDER BY [System.CreatedDate] DESC"
}
```

**Example Request**:
```http
POST https://dev.azure.com/myorg/myproject/_apis/wit/wiql?api-version=7.1
Content-Type: application/json

{
  "query": "SELECT [System.Id] FROM WorkItems WHERE [State] = 'Active' AND [Assigned To] = @Me"
}
```

**Response**:
```json
{
  "queryType": "flat",
  "queryResultType": "workItem",
  "asOf": "2024-01-15T10:30:00Z",
  "workItems": [
    { "id": 1, "url": "..." },
    { "id": 2, "url": "..." },
    { "id": 5, "url": "..." }
  ]
}
```

## Common Field Paths

Use these paths in JSON Patch operations:

| Field | Path |
|---|---|
| Title | `/fields/System.Title` |
| State | `/fields/System.State` |
| Assigned To | `/fields/System.AssignedTo` |
| Description | `/fields/System.Description` |
| Tags | `/fields/System.Tags` |
| Priority | `/fields/Microsoft.VSTS.Common.Priority` |
| Story Points | `/fields/Microsoft.VSTS.Scheduling.StoryPoints` |
| Iteration Path | `/fields/System.IterationPath` |
| Area Path | `/fields/System.AreaPath` |

## Rate Limits and Best Practices

### Rate Limiting
- Azure DevOps Services: ~200 requests per second per organization
- Use batch operations to reduce API calls
- Implement exponential backoff for retries

### Best Practices
1. **Batch Size**: Keep batches under 200 items for optimal performance
2. **Field Selection**: Only request fields you need to reduce payload size
3. **Error Handling**: Check each item's response status in batch operations
4. **Pagination**: Use `$top` and `$skip` for large queries
5. **Caching**: Cache work item data when appropriate
6. **Parallel Requests**: Make independent requests in parallel

### Error Handling Example
```typescript
const results = {
  succeeded: [],
  failed: []
};

for (const id of workItemIds) {
  try {
    const result = await updateWorkItem(id, operations);
    results.succeeded.push({ id, result });
  } catch (error) {
    results.failed.push({ id, error: error.message });
  }
}

console.log(`Succeeded: ${results.succeeded.length}, Failed: ${results.failed.length}`);
```

## WIQL Query Examples

### Get all active bugs
```sql
SELECT [System.Id], [System.Title]
FROM WorkItems
WHERE [System.WorkItemType] = 'Bug'
  AND [System.State] = 'Active'
```

### Get work items assigned to current user
```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.AssignedTo] = @Me
  AND [System.State] <> 'Closed'
```

### Get work items from current iteration
```sql
SELECT [System.Id]
FROM WorkItems
WHERE [System.IterationPath] = @CurrentIteration
  AND [System.State] <> 'Removed'
```

### Get recently modified work items
```sql
SELECT [System.Id], [System.Title], [System.ChangedDate]
FROM WorkItems
WHERE [System.ChangedDate] >= @Today - 7
ORDER BY [System.ChangedDate] DESC
```

## Error Codes

| Code | Description |
|---|---|
| 200 | Success |
| 400 | Bad Request - Invalid parameters or body |
| 401 | Unauthorized - Invalid or expired PAT |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Work item or project doesn't exist |
| 409 | Conflict - Work item rule violation |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

## Additional Resources

- [Azure DevOps REST API Reference](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
- [Work Item Tracking API](https://learn.microsoft.com/en-us/rest/api/azure/devops/wit/)
- [JSON Patch RFC 6902](https://tools.ietf.org/html/rfc6902)
- [WIQL Syntax Reference](https://learn.microsoft.com/en-us/azure/devops/boards/queries/wiql-syntax)
