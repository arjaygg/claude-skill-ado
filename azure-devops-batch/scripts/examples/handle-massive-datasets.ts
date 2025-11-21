#!/usr/bin/env node
/**
 * Demonstrate Complete Large Dataset Handling
 *
 * This example shows THREE complete approaches for handling >20,000 work items
 */

import {
  queryAllWorkItemsById,
  queryAllWorkItemsByDate,
  queryAllWorkItemsComplete,
} from "../ado-large-data.js";

async function main() {
  console.log("================================================");
  console.log("Complete Large Dataset Handling Demo");
  console.log("================================================\n");

  console.log("This demo shows 3 approaches for handling datasets > 20,000 items:\n");

  // ============================================================================
  // APPROACH 1: ID-Based Pagination
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("📋 APPROACH 1: ID-Based Pagination");
  console.log("─────────────────────────────────────────────────");
  console.log("How it works:");
  console.log("  • Fetch 1000 items");
  console.log("  • Track their IDs");
  console.log("  • Query again with 'NOT IN (previous IDs)'");
  console.log("  • Repeat until done\n");

  console.log("✅ Pros: Gets ALL data, works with any filter");
  console.log("❌ Cons: SLOW (20+ API calls for 20k items)\n");

  console.log("Example:");
  console.log('  const result = await queryAllWorkItemsById(');
  console.log('    "SELECT [System.Id] FROM WorkItems WHERE [System.State] = \'Active\'",');
  console.log('    { batchSize: 1000, maxResults: 5000 }');
  console.log('  );\n');

  // Uncomment to run:
  // const result1 = await queryAllWorkItemsById(
  //   "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
  //   {
  //     batchSize: 1000,
  //     maxResults: 5000,
  //     onProgress: (fetched, batch) => {
  //       console.log(`   Fetched ${fetched} items so far...`);
  //     }
  //   }
  // );
  // console.log(`Result: ${result1.totalFetched} items\n`);

  // ============================================================================
  // APPROACH 2: Date-Based Chunking (RECOMMENDED)
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("📅 APPROACH 2: Date-Based Chunking (RECOMMENDED)");
  console.log("─────────────────────────────────────────────────");
  console.log("How it works:");
  console.log("  • Split time range into chunks (e.g., 30 days)");
  console.log("  • Query each chunk separately");
  console.log("  • Combine results\n");

  console.log("✅ Pros: FAST, handles unlimited items, parallel-capable");
  console.log("❌ Cons: Requires date field in filter\n");

  console.log("Example:");
  console.log('  const result = await queryAllWorkItemsByDate(');
  console.log('    "SELECT [System.Id] FROM WorkItems",');
  console.log('    "System.ChangedDate",');
  console.log('    {');
  console.log('      startDate: new Date("2024-01-01"),');
  console.log('      endDate: new Date(),');
  console.log('      chunkDays: 30');
  console.log('    }');
  console.log('  );\n');

  // Uncomment to run:
  // const result2 = await queryAllWorkItemsByDate(
  //   "SELECT [System.Id] FROM WorkItems",
  //   "System.ChangedDate",
  //   {
  //     startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Last 90 days
  //     endDate: new Date(),
  //     chunkDays: 30,
  //     onProgress: (chunk, itemsInChunk, total) => {
  //       console.log(`   Chunk ${chunk}: ${itemsInChunk} items (total: ${total})`);
  //     }
  //   }
  // );
  // console.log(`Result: ${result2.totalFetched} items\n`);

  // ============================================================================
  // APPROACH 3: Direct REST API (FASTEST)
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("⚡ APPROACH 3: Direct REST API (FASTEST)");
  console.log("─────────────────────────────────────────────────");
  console.log("How it works:");
  console.log("  • Step 1: Get IDs only via WIQL (fast)");
  console.log("  • Step 2: Fetch full items in batches of 200 via REST");
  console.log("  • Automatically handles >20k using date chunking if needed\n");

  console.log("✅ Pros: FASTEST, most reliable, no WIQL limits");
  console.log("✅ Pros: Can specify exact fields needed");
  console.log("❌ Cons: Two-step process\n");

  console.log("Example:");
  console.log('  const result = await queryAllWorkItemsComplete(');
  console.log('    "SELECT [System.Id] FROM WorkItems WHERE [System.State] = \'Active\'",');
  console.log('    ["System.Title", "System.State", "System.AssignedTo"]');
  console.log('  );\n');

  console.log("💡 This is the RECOMMENDED approach for production!\n");

  // Uncomment to run:
  // const result3 = await queryAllWorkItemsComplete(
  //   "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'",
  //   ["System.Id", "System.Title", "System.State"],
  //   {
  //     onProgress: (stage, progress, total) => {
  //       if (stage === "ids_fetched") {
  //         console.log(`   Found ${progress} work item IDs`);
  //       } else if (stage === "items_fetched") {
  //         console.log(`   Fetched ${progress}/${total} full work items`);
  //       }
  //     }
  //   }
  // );
  // console.log(`Result: ${result3.length} items with full data\n`);

  // ============================================================================
  // COMPARISON TABLE
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("📊 Comparison Table");
  console.log("─────────────────────────────────────────────────\n");

  console.log("| Approach          | Speed  | Completeness | Use Case                    |");
  console.log("|-------------------|--------|--------------|----------------------------|");
  console.log("| ID-Based Paging   | ⭐     | ✅ 100%      | Simple filters, <10k items |");
  console.log("| Date Chunking     | ⭐⭐⭐  | ✅ 100%      | Large datasets, has dates  |");
  console.log("| Direct REST API   | ⭐⭐⭐⭐⭐| ✅ 100%      | Production, any size       |");
  console.log();

  // ============================================================================
  // REAL-WORLD USAGE
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("🌍 Real-World Usage Examples");
  console.log("─────────────────────────────────────────────────\n");

  console.log("1️⃣  Get ALL work items from last year:");
  console.log('   await queryAllWorkItemsByDate(');
  console.log('     "SELECT [System.Id] FROM WorkItems",');
  console.log('     "System.CreatedDate",');
  console.log('     { startDate: new Date("2023-01-01"), chunkDays: 30 }');
  console.log('   );\n');

  console.log("2️⃣  Get ALL active bugs with full details:");
  console.log('   await queryAllWorkItemsComplete(');
  console.log('     "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = \'Bug\' AND [System.State] = \'Active\'",');
  console.log('     ["System.Title", "System.State", "System.Priority"]');
  console.log('   );\n');

  console.log("3️⃣  Export ALL work items for backup:");
  console.log('   const items = await queryAllWorkItemsComplete(');
  console.log('     "SELECT [System.Id] FROM WorkItems"');
  console.log('   );');
  console.log('   fs.writeFileSync("backup.json", JSON.stringify(items, null, 2));\n');

  // ============================================================================
  // PERFORMANCE ESTIMATES
  // ============================================================================
  console.log("─────────────────────────────────────────────────");
  console.log("⏱️  Performance Estimates");
  console.log("─────────────────────────────────────────────────\n");

  console.log("For 50,000 work items:");
  console.log("  • ID-Based:     ~5-10 minutes  (50 sequential queries)");
  console.log("  • Date-Based:   ~1-2 minutes   (12-24 chunks, can parallelize)");
  console.log("  • Direct API:   ~30-60 seconds (250 batches of 200)");
  console.log();

  console.log("For 100,000 work items:");
  console.log("  • ID-Based:     NOT RECOMMENDED (would take 20+ min)");
  console.log("  • Date-Based:   ~3-5 minutes");
  console.log("  • Direct API:   ~2-3 minutes");
  console.log();

  console.log("================================================");
  console.log("💡 RECOMMENDATION");
  console.log("================================================");
  console.log();
  console.log("For production use:");
  console.log("  1. Use queryAllWorkItemsComplete() - it's the most reliable");
  console.log("  2. It automatically handles >20k by using date chunking");
  console.log("  3. Fetches only the fields you need (faster, less data)");
  console.log("  4. Progress callbacks for user feedback");
  console.log();
  console.log("Uncomment the examples above to test with your data!");
  console.log();
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
