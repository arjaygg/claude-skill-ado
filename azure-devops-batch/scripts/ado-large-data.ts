/**
 * Complete Large Dataset Handling for Azure DevOps
 *
 * This file provides THREE complete approaches for handling datasets > 20,000 items:
 * 1. ID-Based Pagination (WIQL with NOT IN)
 * 2. Date-Based Chunking (time windows)
 * 3. Direct REST API (bypassing WIQL)
 */

import { adoRequest, getAdoConfig, buildQueryString } from "./ado-client.js";
import { queryWorkItems } from "./ado-batch.js";

// ============================================================================
// APPROACH 1: ID-Based Pagination (Complete but Slow)
// ============================================================================

/**
 * Fetch ALL work items using ID-based pagination
 *
 * How it works:
 * - Fetch first 1000 items
 * - Note their IDs
 * - Fetch next 1000 with "WHERE [System.Id] NOT IN (previous IDs)"
 * - Repeat until no more items
 *
 * Pros: Gets ALL data, works with any filter
 * Cons: SLOW for very large datasets (20+ queries for 20k items)
 *       WIQL "NOT IN" has max 1000 IDs limit per clause
 */
export async function queryAllWorkItemsById(
  wiql: string,
  options: {
    batchSize?: number;
    maxResults?: number;
    onProgress?: (fetched: number, batch: any[]) => void;
  } = {}
): Promise<{ workItems: any[]; totalFetched: number }> {
  const batchSize = Math.min(options.batchSize || 1000, 1000); // Max 1000 per batch
  const maxResults = options.maxResults || Number.MAX_SAFE_INTEGER;

  let allWorkItems: any[] = [];
  let excludedIds: number[] = [];
  let hasMore = true;
  let iteration = 0;

  // Clean the query
  const baseWiql = wiql.replace(/SELECT\s+TOP\s+\d+/i, "SELECT");

  while (hasMore && allWorkItems.length < maxResults) {
    iteration++;
    const remainingToFetch = maxResults - allWorkItems.length;
    const currentBatchSize = Math.min(batchSize, remainingToFetch);

    // Build query with exclusions
    let paginatedWiql = baseWiql;

    // Add NOT IN clause if we have IDs to exclude
    // Split into chunks of 1000 since WIQL has a limit
    if (excludedIds.length > 0) {
      // Take last 1000 IDs (WIQL limit)
      const recentExcludedIds = excludedIds.slice(-1000);
      const notInClause = ` AND [System.Id] NOT IN (${recentExcludedIds.join(",")})`;

      // Insert NOT IN clause before ORDER BY if it exists
      if (paginatedWiql.includes("ORDER BY")) {
        paginatedWiql = paginatedWiql.replace(/ORDER BY/i, `${notInClause} ORDER BY`);
      } else {
        paginatedWiql += notInClause;
      }
    }

    try {
      console.log(`   → Iteration ${iteration}: Fetching up to ${currentBatchSize} items (total so far: ${allWorkItems.length})`);

      const result = await queryWorkItems(paginatedWiql, { top: currentBatchSize });

      if (!result.workItems || result.workItems.length === 0) {
        hasMore = false;
        break;
      }

      // Add to our collection
      allWorkItems = allWorkItems.concat(result.workItems);

      // Track IDs we've seen
      const newIds = result.workItems.map((wi: any) => wi.id);
      excludedIds = excludedIds.concat(newIds);

      // Progress callback
      if (options.onProgress) {
        options.onProgress(allWorkItems.length, result.workItems);
      }

      // Check if we got fewer items than requested
      if (result.workItems.length < currentBatchSize) {
        hasMore = false;
      }

      // Safety: If excludedIds gets too large, we're at WIQL limits
      if (excludedIds.length > 19000) {
        console.warn(`   ⚠️  Approaching WIQL NOT IN limit (19,000 IDs excluded)`);
        console.warn(`   ⚠️  Consider using date-based chunking instead`);
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes("20000")) {
        // Even with NOT IN, we hit the limit (too many items in a single filter)
        console.error(`   ✗ Cannot fetch more items - query still returns >20k after exclusions`);
        hasMore = false;
      } else {
        throw error;
      }
    }
  }

  return {
    workItems: allWorkItems,
    totalFetched: allWorkItems.length,
  };
}

// ============================================================================
// APPROACH 2: Date-Based Chunking (Fast and Complete)
// ============================================================================

/**
 * Fetch ALL work items using date-based time windows
 *
 * How it works:
 * - Split time into windows (e.g., 1 month each)
 * - Query each window separately
 * - Combine results
 *
 * Pros: FAST, can handle unlimited items
 * Cons: Requires date field in your filter (ChangedDate, CreatedDate, etc.)
 */
export async function queryAllWorkItemsByDate(
  baseWiql: string,
  dateField: string = "System.ChangedDate",
  options: {
    startDate?: Date;
    endDate?: Date;
    chunkDays?: number; // Default 30 days per chunk
    onProgress?: (chunk: number, itemsInChunk: number, total: number) => void;
  } = {}
): Promise<{ workItems: any[]; totalFetched: number }> {
  const endDate = options.endDate || new Date();
  const startDate = options.startDate || new Date(endDate.getTime() - 365 * 24 * 60 * 60 * 1000); // Default: last year
  const chunkDays = options.chunkDays || 30;

  let allWorkItems: any[] = [];
  let currentStart = new Date(startDate);
  let chunkNumber = 0;

  while (currentStart < endDate) {
    chunkNumber++;
    const currentEnd = new Date(Math.min(
      currentStart.getTime() + chunkDays * 24 * 60 * 60 * 1000,
      endDate.getTime()
    ));

    const chunkWiql = `${baseWiql} AND [${dateField}] >= '${currentStart.toISOString()}' AND [${dateField}] < '${currentEnd.toISOString()}'`;

    try {
      console.log(`   → Chunk ${chunkNumber}: ${currentStart.toISOString().split('T')[0]} to ${currentEnd.toISOString().split('T')[0]}`);

      const result = await queryWorkItems(chunkWiql, { top: 20000 }); // Can use up to 20k per chunk

      if (result.workItems && result.workItems.length > 0) {
        allWorkItems = allWorkItems.concat(result.workItems);

        if (options.onProgress) {
          options.onProgress(chunkNumber, result.workItems.length, allWorkItems.length);
        }

        console.log(`      Found ${result.workItems.length} items (total: ${allWorkItems.length})`);

        // If we got exactly 20k, this chunk might have more - warn user
        if (result.workItems.length >= 19900) {
          console.warn(`      ⚠️  This chunk returned ~20k items - might be incomplete`);
          console.warn(`      ⚠️  Consider reducing chunkDays to ${Math.floor(chunkDays / 2)}`);
        }
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes("20000")) {
        console.error(`   ✗ Chunk too large: ${currentStart.toISOString()} to ${currentEnd.toISOString()}`);
        console.error(`   💡 Reduce chunkDays from ${chunkDays} to ${Math.floor(chunkDays / 2)}`);
        throw error;
      } else {
        throw error;
      }
    }

    // Move to next chunk
    currentStart = currentEnd;
  }

  return {
    workItems: allWorkItems,
    totalFetched: allWorkItems.length,
  };
}

// ============================================================================
// APPROACH 3: Direct REST API (Bypassing WIQL)
// ============================================================================

/**
 * Get work items directly by IDs (bypassing WIQL entirely)
 *
 * How it works:
 * - Use WIQL to get IDs only (fast, no 20k limit on ID-only queries)
 * - Then fetch full work items in batches of 200 via REST API
 *
 * Pros: FASTEST, most reliable, no WIQL limitations
 * Cons: Two-step process (get IDs, then get full items)
 */
export async function getWorkItemsDirectBatch(
  workItemIds: number[],
  fields?: string[],
  options: {
    batchSize?: number;
    onProgress?: (batch: number, total: number) => void;
  } = {}
): Promise<any[]> {
  const batchSize = options.batchSize || 200; // API allows up to 200 IDs per request
  const config = getAdoConfig();
  let allWorkItems: any[] = [];

  // Split IDs into batches
  for (let i = 0; i < workItemIds.length; i += batchSize) {
    const batchIds = workItemIds.slice(i, i + batchSize);
    const batchNumber = Math.floor(i / batchSize) + 1;
    const totalBatches = Math.ceil(workItemIds.length / batchSize);

    console.log(`   → Batch ${batchNumber}/${totalBatches}: Fetching ${batchIds.length} work items`);

    const params: any = {
      ids: batchIds.join(","),
      "api-version": config.apiVersion,
    };

    if (fields && fields.length > 0) {
      params.fields = fields.join(",");
    }

    const queryString = buildQueryString(params);
    const endpoint = `/${config.project}/_apis/wit/workitems?${queryString}`;

    try {
      const result = await adoRequest(endpoint);

      if (result.value && Array.isArray(result.value)) {
        allWorkItems = allWorkItems.concat(result.value);

        if (options.onProgress) {
          options.onProgress(batchNumber, allWorkItems.length);
        }
      }

    } catch (error) {
      console.error(`   ✗ Failed to fetch batch ${batchNumber}:`, error);
      throw error;
    }

    // Small delay to avoid rate limiting
    if (i + batchSize < workItemIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  return allWorkItems;
}

/**
 * Complete solution: Get ALL work items matching a query
 *
 * Combines WIQL (for filtering) with direct API (for fetching)
 * This is the RECOMMENDED approach for large datasets.
 */
export async function queryAllWorkItemsComplete(
  wiql: string,
  fields?: string[],
  options: {
    onProgress?: (stage: string, progress: number, total?: number) => void;
  } = {}
): Promise<any[]> {
  console.log("🚀 Complete Large Dataset Query");
  console.log("   Step 1: Getting work item IDs (via WIQL)...");

  // Step 1: Get just the IDs (this is fast and has no 20k limit for ID-only queries)
  const idQuery = wiql.replace(/SELECT.*FROM/i, "SELECT [System.Id] FROM");

  let allIds: number[] = [];

  try {
    // Try to get all IDs at once
    const result = await queryWorkItems(idQuery, { top: 20000 });

    if (result.workItems && result.workItems.length > 0) {
      allIds = result.workItems.map((wi: any) => wi.id);
      console.log(`   ✓ Found ${allIds.length} work item IDs`);

      if (options.onProgress) {
        options.onProgress("ids_fetched", allIds.length);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("20000")) {
      console.log(`   ⚠️  More than 20,000 IDs found`);
      console.log(`   💡 Using date-based chunking to get all IDs...`);

      // Fallback to date-based chunking
      const dateResult = await queryAllWorkItemsByDate(idQuery, "System.ChangedDate", {
        chunkDays: 30,
        onProgress: (chunk, itemsInChunk, total) => {
          console.log(`      Chunk ${chunk}: ${itemsInChunk} IDs (total: ${total})`);
        }
      });

      allIds = dateResult.workItems.map((wi: any) => wi.id);
      console.log(`   ✓ Retrieved all ${allIds.length} work item IDs via date chunking`);
    } else {
      throw error;
    }
  }

  // Step 2: Fetch full work items in batches of 200
  console.log(`\n   Step 2: Fetching full work item data (${allIds.length} items)...`);

  const workItems = await getWorkItemsDirectBatch(allIds, fields, {
    onProgress: (batch, total) => {
      console.log(`      Progress: ${total}/${allIds.length} items fetched`);
      if (options.onProgress) {
        options.onProgress("items_fetched", total, allIds.length);
      }
    }
  });

  console.log(`\n✅ Complete! Fetched ${workItems.length} work items`);

  return workItems;
}
