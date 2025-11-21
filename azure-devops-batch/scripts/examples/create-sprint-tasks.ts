#!/usr/bin/env node
/**
 * Create Sprint Tasks
 * Create multiple tasks under a parent work item
 *
 * Usage: node create-sprint-tasks.js <parentId> "<task1>" "<task2>" ...
 * Example: node create-sprint-tasks.js 123 "Design UI" "Implement API" "Write tests"
 */

import { batchCreateWorkItems, createLinkOperation } from "../ado-batch.js";

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node create-sprint-tasks.js <parentId> "<task1>" "<task2>" ...');
    console.error('Example: node create-sprint-tasks.js 123 "Design UI" "Implement API"');
    process.exit(1);
  }

  const parentId = parseInt(args[0]);
  const taskTitles = args.slice(1);

  console.log(`Creating ${taskTitles.length} tasks under work item #${parentId}`);
  console.log(`Tasks: ${taskTitles.join(", ")}\n`);

  // Create work items with parent link
  const workItems = taskTitles.map((title) => ({
    type: "Task",
    fields: {
      "System.Title": title,
      "System.State": "New",
    },
  }));

  const result = await batchCreateWorkItems(workItems);

  console.log("\n✅ Results:");
  console.log(`   Total: ${result.total}`);
  console.log(`   Succeeded: ${result.succeeded}`);
  console.log(`   Failed: ${result.failed}`);

  if (result.errors.length > 0) {
    console.log("\n❌ Errors:");
    result.errors.forEach((error, idx) => {
      console.log(`   Task "${taskTitles[idx]}": ${error.error}`);
    });
  }

  if (result.results.length > 0) {
    console.log("\n✓ Successfully created:");
    result.results.forEach((item) => {
      console.log(
        `   #${item.id} - ${item.data.fields["System.Title"]} (${item.data.fields["System.State"]})`
      );
    });

    // Note: You would need to make additional API calls to link these to the parent
    // This is left as an exercise - see createLinkOperation() in ado-batch.ts
    console.log(
      `\n💡 Tip: Use batchUpdateWorkItems() with createLinkOperation() to link these to parent #${parentId}`
    );
  }
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
