#!/usr/bin/env node
/**
 * Query and Update
 * Find work items by criteria and update them in batch
 *
 * Usage: node query-and-update.js
 * This is a template - modify the WIQL query and updates as needed
 */

import { queryWorkItems, batchUpdateWorkItems } from "../ado-batch.js";

async function main() {
  console.log("Query and Update Example");
  console.log("========================\n");

  // Example: Find all active bugs assigned to current user
  const wiql = `
    SELECT [System.Id], [System.Title]
    FROM WorkItems
    WHERE [System.WorkItemType] = 'Bug'
      AND [System.State] = 'Active'
      AND [System.AssignedTo] = @Me
  `;

  console.log("Executing query...");
  console.log(wiql);

  const queryResult = await queryWorkItems(wiql, { top: 50 });

  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    console.log("\n✓ No work items found matching the query.");
    return;
  }

  const workItemIds = queryResult.workItems.map((wi: any) => wi.id);
  console.log(`\nFound ${workItemIds.length} work items:`);
  console.log(`IDs: ${workItemIds.join(", ")}\n`);

  // Update priority to High and add tag
  console.log("Updating work items...");
  console.log("  - Setting Priority to High (1)");
  console.log("  - Adding 'needs-attention' tag\n");

  const updates = workItemIds.map((id: number) => ({
    id,
    operations: [
      {
        op: "add" as const,
        path: "/fields/Microsoft.VSTS.Common.Priority",
        value: 1,
      },
      {
        op: "add" as const,
        path: "/fields/System.Tags",
        value: "needs-attention",
      },
    ],
  }));

  const result = await batchUpdateWorkItems(updates);

  console.log("✅ Update Results:");
  console.log(`   Total: ${result.total}`);
  console.log(`   Succeeded: ${result.succeeded}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    result.errors.forEach((error) => {
      console.log(`   Work Item ${error.id}: ${error.error}`);
    });
  }

  if (result.results.length > 0) {
    console.log("\n✓ Successfully updated:");
    result.results.forEach((item) => {
      const title = item.data.fields["System.Title"];
      const priority = item.data.fields["Microsoft.VSTS.Common.Priority"];
      console.log(`   #${item.id} - ${title} (Priority: ${priority})`);
    });
  }

  console.log("\n💡 Tip: Modify the WIQL query and operations in this script for your use case!");
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
