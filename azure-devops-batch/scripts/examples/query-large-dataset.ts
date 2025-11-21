#!/usr/bin/env node
/**
 * Query Large Dataset
 * Example of handling queries that return many work items
 *
 * Azure DevOps has a hard limit of 20,000 work items per query.
 * This example shows how to work with large datasets safely.
 */

import { queryWorkItems, queryWorkItemsPaginated } from "../ado-batch.js";

async function main() {
  console.log("================================================");
  console.log("Query Large Dataset Example");
  console.log("================================================\n");

  console.log("❗ Important: Azure DevOps Query Limits");
  console.log("   • Maximum 20,000 work items per query");
  console.log("   • Always use SELECT TOP N to limit results");
  console.log("   • For large datasets, use pagination\n");

  // Example 1: Safe query with TOP clause
  console.log("1️⃣  Safe Query (with TOP clause)");
  console.log("   ─────────────────────────");

  try {
    const wiql = "SELECT TOP 100 [System.Id], [System.Title] FROM WorkItems ORDER BY [System.ChangedDate] DESC";
    console.log(`   Query: ${wiql}\n`);

    const result = await queryWorkItems(wiql);

    console.log(`   ✓ Success! Found ${result.workItems?.length || 0} work items`);
    if (result.workItems && result.workItems.length > 0) {
      console.log(`   ✓ Most recent: ID ${result.workItems[0].id}\n`);
    }
  } catch (error) {
    console.error(`   ✗ Error: ${(error as Error).message}\n`);
  }

  // Example 2: Query with filters to reduce results
  console.log("2️⃣  Filtered Query (specific criteria)");
  console.log("   ─────────────────────────");

  try {
    const wiql = `
      SELECT TOP 500 [System.Id], [System.Title], [System.State]
      FROM WorkItems
      WHERE [System.State] = 'Active'
        AND [System.WorkItemType] = 'Bug'
        AND [System.ChangedDate] >= @Today - 30
      ORDER BY [System.Priority]
    `;
    console.log("   Query: Active bugs from last 30 days\n");

    const result = await queryWorkItems(wiql);

    console.log(`   ✓ Success! Found ${result.workItems?.length || 0} work items`);
    console.log(`   ✓ This query is scoped by state, type, and date\n`);
  } catch (error) {
    console.error(`   ✗ Error: ${(error as Error).message}\n`);
  }

  // Example 3: Count query (efficient for large datasets)
  console.log("3️⃣  Count Query (no work item data)");
  console.log("   ─────────────────────────");

  try {
    // Count queries don't return work item data, so no 20k limit
    const wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.State] = 'Active'";
    console.log("   Query: Count all active work items\n");

    const result = await queryWorkItems(wiql, { top: 1 });

    console.log(`   ✓ Success! Query executed`);
    console.log(`   💡 Tip: Use analytics API for counts instead of WIQL\n`);
  } catch (error) {
    console.error(`   ✗ Error: ${(error as Error).message}\n`);
  }

  // Example 4: Paginated query
  console.log("4️⃣  Paginated Query (for very large results)");
  console.log("   ─────────────────────────");

  try {
    const wiql = "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Task'";
    console.log("   Query: All tasks (with pagination)\n");

    let batchCount = 0;
    const result = await queryWorkItemsPaginated(wiql, {
      batchSize: 1000,
      maxResults: 5000, // Limit to 5000 for this example
      onBatch: (batch, total) => {
        batchCount++;
        console.log(`   → Batch ${batchCount}: Fetched ${batch.length} items (total: ${total})`);
      },
    });

    console.log(`\n   ✓ Success! Total work items: ${result.totalCount}`);
    console.log(`   ✓ Fetched in ${batchCount} batch(es)\n`);
  } catch (error) {
    console.error(`   ✗ Error: ${(error as Error).message}\n`);
  }

  // Best Practices Summary
  console.log("================================================");
  console.log("Best Practices for Large Datasets");
  console.log("================================================");
  console.log();
  console.log("✅ DO:");
  console.log("  • Always use SELECT TOP N in queries");
  console.log("  • Add WHERE clauses to filter results");
  console.log("  • Use date ranges to limit scope");
  console.log("  • Query by iteration/area path for sprints");
  console.log("  • Use queryWorkItemsPaginated() for large results");
  console.log();
  console.log("❌ DON'T:");
  console.log("  • Query with 'SELECT [System.Id] FROM WorkItems' (no TOP)");
  console.log("  • Try to fetch all work items at once");
  console.log("  • Query without WHERE clause on large projects");
  console.log();
  console.log("💡 TIPS:");
  console.log("  • Start with TOP 100, increase if needed");
  console.log("  • Use Analytics API for aggregations/counts");
  console.log("  • Consider work item types, states, dates in filters");
  console.log("  • Test queries in Azure DevOps UI first");
  console.log();
}

main().catch((error) => {
  console.error("Fatal error:", error.message);
  process.exit(1);
});
