#!/usr/bin/env node
/**
 * Example Batch Operations for Azure DevOps
 *
 * This file contains practical examples of common batch operations
 * that can be used as templates or run directly.
 */

// Example 1: Bulk Update Work Item States
async function bulkUpdateStates(
  workItemIds: number[],
  newState: string,
  config: { org: string; project: string; pat: string }
) {
  const results = [];
  const errors = [];

  for (const id of workItemIds) {
    try {
      const response = await fetch(
        `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/${id}?api-version=7.1`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify([
            {
              op: "add",
              path: "/fields/System.State",
              value: newState,
            },
          ]),
        }
      );

      if (response.ok) {
        const data = await response.json();
        results.push({ id, success: true, newState: data.fields["System.State"] });
      } else {
        const errorText = await response.text();
        errors.push({ id, success: false, error: errorText });
      }
    } catch (error) {
      errors.push({ id, success: false, error: String(error) });
    }
  }

  return { results, errors };
}

// Example 2: Create Multiple Related Tasks
async function createRelatedTasks(
  parentId: number,
  taskTitles: string[],
  config: { org: string; project: string; pat: string }
) {
  const results = [];
  const errors = [];

  for (const title of taskTitles) {
    try {
      const operations = [
        {
          op: "add",
          path: "/fields/System.Title",
          value: title,
        },
        {
          op: "add",
          path: "/fields/System.State",
          value: "New",
        },
        {
          op: "add",
          path: "/relations/-",
          value: {
            rel: "System.LinkTypes.Hierarchy-Reverse",
            url: `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/${parentId}`,
          },
        },
      ];

      const response = await fetch(
        `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/$Task?api-version=7.1`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify(operations),
        }
      );

      if (response.ok) {
        const data = await response.json();
        results.push({ title, success: true, id: data.id });
      } else {
        const errorText = await response.text();
        errors.push({ title, success: false, error: errorText });
      }
    } catch (error) {
      errors.push({ title, success: false, error: String(error) });
    }
  }

  return { results, errors };
}

// Example 3: Query and Batch Update
async function queryAndUpdateByTag(
  tag: string,
  updates: { field: string; value: any }[],
  config: { org: string; project: string; pat: string }
) {
  // Step 1: Query work items with specific tag
  const wiql = `SELECT [System.Id] FROM WorkItems WHERE [System.Tags] CONTAINS '${tag}'`;

  const queryResponse = await fetch(
    `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/wiql?api-version=7.1`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: wiql }),
    }
  );

  if (!queryResponse.ok) {
    throw new Error(`Query failed: ${await queryResponse.text()}`);
  }

  const queryData = await queryResponse.json();
  const workItemIds = queryData.workItems.map((wi: any) => wi.id);

  console.log(`Found ${workItemIds.length} work items with tag '${tag}'`);

  // Step 2: Batch update all found work items
  const results = [];
  const errors = [];

  for (const id of workItemIds) {
    try {
      const operations = updates.map((update) => ({
        op: "add",
        path: `/fields/${update.field}`,
        value: update.value,
      }));

      const response = await fetch(
        `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/${id}?api-version=7.1`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify(operations),
        }
      );

      if (response.ok) {
        const data = await response.json();
        results.push({ id, success: true, rev: data.rev });
      } else {
        const errorText = await response.text();
        errors.push({ id, success: false, error: errorText });
      }
    } catch (error) {
      errors.push({ id, success: false, error: String(error) });
    }
  }

  return { workItemIds, results, errors };
}

// Example 4: Bulk Assign Work Items
async function bulkAssignWorkItems(
  workItemIds: number[],
  assignTo: string,
  config: { org: string; project: string; pat: string }
) {
  const results = [];
  const errors = [];

  for (const id of workItemIds) {
    try {
      const operations = [
        {
          op: "add",
          path: "/fields/System.AssignedTo",
          value: assignTo,
        },
      ];

      const response = await fetch(
        `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/${id}?api-version=7.1`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify(operations),
        }
      );

      if (response.ok) {
        results.push({ id, success: true, assignedTo: assignTo });
      } else {
        const errorText = await response.text();
        errors.push({ id, success: false, error: errorText });
      }
    } catch (error) {
      errors.push({ id, success: false, error: String(error) });
    }
  }

  return { results, errors };
}

// Example 5: Sprint Cleanup - Archive Completed Items
async function sprintCleanup(
  sprintPath: string,
  config: { org: string; project: string; pat: string }
) {
  // Query completed items from sprint
  const wiql = `
    SELECT [System.Id]
    FROM WorkItems
    WHERE [System.IterationPath] = '${sprintPath}'
      AND [System.State] IN ('Closed', 'Done', 'Resolved')
  `;

  const queryResponse = await fetch(
    `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/wiql?api-version=7.1`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: wiql }),
    }
  );

  if (!queryResponse.ok) {
    throw new Error(`Query failed: ${await queryResponse.text()}`);
  }

  const queryData = await queryResponse.json();
  const workItemIds = queryData.workItems.map((wi: any) => wi.id);

  console.log(`Found ${workItemIds.length} completed work items in sprint '${sprintPath}'`);

  // Add 'archived' tag and update state
  const results = [];
  const errors = [];

  for (const id of workItemIds) {
    try {
      const operations = [
        {
          op: "add",
          path: "/fields/System.Tags",
          value: "archived",
        },
      ];

      const response = await fetch(
        `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems/${id}?api-version=7.1`,
        {
          method: "PATCH",
          headers: {
            "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
            "Content-Type": "application/json-patch+json",
          },
          body: JSON.stringify(operations),
        }
      );

      if (response.ok) {
        results.push({ id, success: true });
      } else {
        const errorText = await response.text();
        errors.push({ id, success: false, error: errorText });
      }
    } catch (error) {
      errors.push({ id, success: false, error: String(error) });
    }
  }

  return { total: workItemIds.length, results, errors };
}

// Example 6: Get Work Items with Specific Fields
async function getWorkItemsBatch(
  workItemIds: number[],
  fields: string[],
  config: { org: string; project: string; pat: string }
) {
  const idsParam = workItemIds.join(",");
  const fieldsParam = fields.join(",");

  const response = await fetch(
    `https://dev.azure.com/${config.org}/${config.project}/_apis/wit/workitems?ids=${idsParam}&fields=${fieldsParam}&api-version=7.1`,
    {
      method: "GET",
      headers: {
        "Authorization": `Basic ${Buffer.from(`:${config.pat}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get work items: ${await response.text()}`);
  }

  return await response.json();
}

// Main function to demonstrate usage
async function main() {
  const config = {
    org: process.env.AZURE_DEVOPS_ORG || "",
    project: process.env.AZURE_DEVOPS_PROJECT || "",
    pat: process.env.AZURE_DEVOPS_PAT || "",
  };

  if (!config.org || !config.project || !config.pat) {
    console.error("Missing environment variables:");
    console.error("  AZURE_DEVOPS_ORG");
    console.error("  AZURE_DEVOPS_PROJECT");
    console.error("  AZURE_DEVOPS_PAT");
    process.exit(1);
  }

  console.log("Azure DevOps Batch Operations Examples");
  console.log("=======================================\n");

  // Example usage (commented out - uncomment to run)
  /*
  // Example 1: Update states
  const updateResult = await bulkUpdateStates([1, 2, 3], "Active", config);
  console.log("Bulk update result:", updateResult);

  // Example 2: Create tasks
  const createResult = await createRelatedTasks(
    123,
    ["Implement feature", "Write tests", "Update docs"],
    config
  );
  console.log("Create tasks result:", createResult);

  // Example 3: Query and update
  const queryUpdateResult = await queryAndUpdateByTag(
    "needs-review",
    [{ field: "Microsoft.VSTS.Common.Priority", value: 1 }],
    config
  );
  console.log("Query and update result:", queryUpdateResult);
  */

  console.log("\nExamples are available in this file.");
  console.log("Uncomment the desired example in the main() function to run it.");
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
}

// Export functions for use as library
export {
  bulkUpdateStates,
  createRelatedTasks,
  queryAndUpdateByTag,
  bulkAssignWorkItems,
  sprintCleanup,
  getWorkItemsBatch,
};
