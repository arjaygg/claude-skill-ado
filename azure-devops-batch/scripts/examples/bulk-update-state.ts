#!/usr/bin/env node
/**
 * Bulk Update State
 * Update the state of multiple work items at once
 *
 * Usage: node bulk-update-state.js <id1,id2,id3> <newState>
 * Example: node bulk-update-state.js 1,2,3,4,5 Closed
 */

import { batchUpdateWorkItems } from "../ado-batch.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error("Usage: node bulk-update-state.js <id1,id2,id3> <newState>");
    console.error("Example: node bulk-update-state.js 1,2,3,4,5 Closed");
    process.exit(1);
  }

  const ids = args[0].split(",").map(Number);
  const newState = args[1];

  console.log(`Updating ${ids.length} work items to state: ${newState}`);
  console.log(`Work item IDs: ${ids.join(", ")}\n`);

  const updates = ids.map((id) => ({
    id,
    operations: [
      {
        op: "add" as const,
        path: "/fields/System.State",
        value: newState,
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
    console.log("\n✓ Successfully updated:");
    result.results.forEach((item) => {
      console.log(`   Work Item ${item.id} → ${item.data.fields["System.State"]}`);
    });
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
