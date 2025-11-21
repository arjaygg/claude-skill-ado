#!/usr/bin/env node
/**
 * Bulk Assignment
 * Assign multiple work items to a user
 *
 * Usage: node bulk-assign.js <id1,id2,id3> "<user@example.com>"
 * Example: node bulk-assign.js 1,2,3,4,5 "john@contoso.com"
 */

import { batchUpdateWorkItems } from "../ado-batch.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node bulk-assign.js <id1,id2,id3> "<user@example.com>"');
    console.error('Example: node bulk-assign.js 1,2,3,4,5 "john@contoso.com"');
    process.exit(1);
  }

  const ids = args[0].split(",").map(Number);
  const assignTo = args[1];

  console.log(`Assigning ${ids.length} work items to: ${assignTo}`);
  console.log(`Work item IDs: ${ids.join(", ")}\n`);

  const updates = ids.map((id) => ({
    id,
    operations: [
      {
        op: "add" as const,
        path: "/fields/System.AssignedTo",
        value: assignTo,
      },
    ],
  }));

  const result = await batchUpdateWorkItems(updates);

  console.log("\n✅ Results:");
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
    console.log("\n✓ Successfully assigned:");
    result.results.forEach((item) => {
      const title = item.data.fields["System.Title"];
      const assigned = item.data.fields["System.AssignedTo"]?.displayName || assignTo;
      console.log(`   #${item.id} - ${title}`);
      console.log(`     → ${assigned}`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
