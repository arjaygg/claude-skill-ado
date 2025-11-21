#!/usr/bin/env node
/**
 * Sprint Cleanup
 * Archive all completed work items from a sprint
 *
 * Usage: node sprint-cleanup.js "<sprint-path>"
 * Example: node sprint-cleanup.js "MyProject\\Sprint 1"
 */

import { queryWorkItems, batchUpdateWorkItems } from "../ado-batch.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('Usage: node sprint-cleanup.js "<sprint-path>"');
    console.error('Example: node sprint-cleanup.js "MyProject\\\\Sprint 1"');
    process.exit(1);
  }

  const sprintPath = args[0];

  console.log(`Sprint Cleanup for: ${sprintPath}`);
  console.log("Finding completed work items...\n");

  // Query completed items from sprint
  const wiql = `
    SELECT [System.Id], [System.Title], [System.State]
    FROM WorkItems
    WHERE [System.IterationPath] = '${sprintPath}'
      AND [System.State] IN ('Closed', 'Done', 'Resolved')
  `;

  const queryResult = await queryWorkItems(wiql);

  if (!queryResult.workItems || queryResult.workItems.length === 0) {
    console.log("✓ No completed work items found. Sprint is already clean!");
    return;
  }

  const workItemIds = queryResult.workItems.map((wi: any) => wi.id);
  console.log(`Found ${workItemIds.length} completed work items`);
  console.log(`IDs: ${workItemIds.join(", ")}\n`);

  console.log("Adding 'archived' tag...");

  // Add archived tag to all items
  const updates = workItemIds.map((id: number) => ({
    id,
    operations: [
      {
        op: "add" as const,
        path: "/fields/System.Tags",
        value: "archived",
      },
    ],
  }));

  const result = await batchUpdateWorkItems(updates);

  console.log("\n✅ Cleanup Results:");
  console.log(`   Total processed: ${result.total}`);
  console.log(`   Archived: ${result.succeeded}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("\n❌ Failed to archive:");
    result.errors.forEach((error) => {
      console.log(`   Work Item ${error.id}: ${error.error}`);
    });
  }

  if (result.results.length > 0) {
    console.log("\n✓ Successfully archived:");
    result.results.forEach((item) => {
      const title = item.data.fields["System.Title"];
      const tags = item.data.fields["System.Tags"] || "";
      console.log(`   #${item.id} - ${title}`);
      console.log(`     Tags: ${tags}`);
    });
  }

  console.log("\n✅ Sprint cleanup complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
