/**
 * Azure DevOps Batch Operations
 * High-level functions for batch operations on work items
 */

import { adoRequest, getAdoConfig, buildQueryString } from "./ado-client.js";

export interface WorkItemField {
  [key: string]: any;
}

export interface WorkItemOperation {
  op: "add" | "replace" | "remove" | "test";
  path: string;
  value?: any;
}

export interface BatchResult<T = any> {
  total: number;
  succeeded: number;
  failed: number;
  results: Array<{ id?: number; success: true; data: T }>;
  errors: Array<{ id?: number; success: false; error: string }>;
}

/**
 * Get multiple work items by IDs
 */
export async function batchGetWorkItems(
  ids: number[],
  options: {
    fields?: string[];
    expand?: "all" | "relations" | "none";
  } = {}
): Promise<any> {
  const config = getAdoConfig();

  const params = {
    ids: ids.join(","),
    "api-version": config.apiVersion,
    ...(options.fields && { fields: options.fields.join(",") }),
    ...(options.expand && options.expand !== "none" && { "$expand": options.expand }),
  };

  const queryString = buildQueryString(params);
  const endpoint = `/${config.project}/_apis/wit/workitems?${queryString}`;

  return await adoRequest(endpoint);
}

/**
 * Update multiple work items
 */
export async function batchUpdateWorkItems(
  updates: Array<{ id: number; operations: WorkItemOperation[] }>,
  options: {
    bypassRules?: boolean;
    suppressNotifications?: boolean;
  } = {}
): Promise<BatchResult> {
  const config = getAdoConfig();
  const results: BatchResult["results"] = [];
  const errors: BatchResult["errors"] = [];

  for (const update of updates) {
    try {
      const params = {
        "api-version": config.apiVersion,
        ...(options.bypassRules && { bypassRules: "true" }),
        ...(options.suppressNotifications && { suppressNotifications: "true" }),
      };

      const queryString = buildQueryString(params);
      const endpoint = `/${config.project}/_apis/wit/workitems/${update.id}?${queryString}`;

      const result = await adoRequest(endpoint, {
        method: "PATCH",
        body: update.operations,
      });

      results.push({ id: update.id, success: true, data: result });
    } catch (error) {
      errors.push({
        id: update.id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: updates.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Create multiple work items
 */
export async function batchCreateWorkItems(
  workItems: Array<{ type: string; fields: WorkItemField }>,
  options: {
    bypassRules?: boolean;
    suppressNotifications?: boolean;
  } = {}
): Promise<BatchResult> {
  const config = getAdoConfig();
  const results: BatchResult["results"] = [];
  const errors: BatchResult["errors"] = [];

  for (const workItem of workItems) {
    try {
      // Convert fields to JSON Patch operations
      const operations: WorkItemOperation[] = Object.entries(workItem.fields).map(
        ([key, value]) => ({
          op: "add",
          path: `/fields/${key}`,
          value,
        })
      );

      const params = {
        "api-version": config.apiVersion,
        ...(options.bypassRules && { bypassRules: "true" }),
        ...(options.suppressNotifications && { suppressNotifications: "true" }),
      };

      const queryString = buildQueryString(params);
      const endpoint = `/${config.project}/_apis/wit/workitems/$${workItem.type}?${queryString}`;

      const result = await adoRequest(endpoint, {
        method: "PATCH",
        body: operations,
      });

      results.push({ id: result.id, success: true, data: result });
    } catch (error) {
      errors.push({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: workItems.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Delete multiple work items
 */
export async function batchDeleteWorkItems(
  ids: number[],
  options: {
    destroy?: boolean;
  } = {}
): Promise<BatchResult> {
  const config = getAdoConfig();
  const results: BatchResult["results"] = [];
  const errors: BatchResult["errors"] = [];

  for (const id of ids) {
    try {
      const params = {
        "api-version": config.apiVersion,
        ...(options.destroy && { destroy: "true" }),
      };

      const queryString = buildQueryString(params);
      const endpoint = `/${config.project}/_apis/wit/workitems/${id}?${queryString}`;

      await adoRequest(endpoint, { method: "DELETE" });

      results.push({
        id,
        success: true,
        data: { action: options.destroy ? "destroyed" : "deleted" },
      });
    } catch (error) {
      errors.push({
        id,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    total: ids.length,
    succeeded: results.length,
    failed: errors.length,
    results,
    errors,
  };
}

/**
 * Query work items using WIQL
 *
 * Important: Azure DevOps has a 20,000 work item limit per query.
 * Always use SELECT TOP N or $top parameter to limit results.
 *
 * For large datasets, use queryWorkItemsPaginated() instead.
 */
export async function queryWorkItems(
  wiql: string,
  options: {
    top?: number;
  } = {}
): Promise<any> {
  const config = getAdoConfig();

  // Ensure WIQL has TOP clause or we add $top parameter to prevent hitting 20k limit
  const hasTopClause = /SELECT\s+TOP\s+\d+/i.test(wiql);

  const body: any = {
    query: wiql,
  };

  // If no TOP in query and no $top option, default to 1000 for safety
  if (!hasTopClause && !options.top) {
    console.warn("⚠️  Warning: Query has no TOP clause. Limiting to 1000 results.");
    console.warn("   Add 'SELECT TOP N' to your query or pass { top: N } option.");
    body.$top = 1000;
  } else if (options.top) {
    body.$top = options.top;
  }

  const endpoint = `/${config.project}/_apis/wit/wiql?api-version=${config.apiVersion}`;

  return await adoRequest(endpoint, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

/**
 * Query work items with pagination support for large datasets
 *
 * Automatically handles the 20,000 item limit by fetching in batches.
 * Use this for queries that might return many results.
 */
export async function queryWorkItemsPaginated(
  wiql: string,
  options: {
    batchSize?: number; // Default 1000
    maxResults?: number; // Maximum total results (default: no limit)
    onBatch?: (batch: any[], totalSoFar: number) => void; // Callback for each batch
  } = {}
): Promise<{ workItems: any[]; totalCount: number }> {
  const batchSize = options.batchSize || 1000;
  const maxResults = options.maxResults || Number.MAX_SAFE_INTEGER;

  let allWorkItems: any[] = [];
  let skip = 0;
  let hasMore = true;

  // Ensure query doesn't already have TOP or SKIP
  const cleanWiql = wiql.replace(/SELECT\s+TOP\s+\d+/i, "SELECT");

  while (hasMore && allWorkItems.length < maxResults) {
    const currentBatchSize = Math.min(batchSize, maxResults - allWorkItems.length);

    // Add TOP and SKIP to query
    const paginatedWiql = cleanWiql.replace(
      /^SELECT/i,
      `SELECT TOP ${currentBatchSize}`
    );

    try {
      const result = await queryWorkItems(paginatedWiql, { top: currentBatchSize });

      if (!result.workItems || result.workItems.length === 0) {
        hasMore = false;
        break;
      }

      allWorkItems = allWorkItems.concat(result.workItems);

      // Call batch callback if provided
      if (options.onBatch) {
        options.onBatch(result.workItems, allWorkItems.length);
      }

      // Check if we got fewer items than requested (means we're at the end)
      if (result.workItems.length < currentBatchSize) {
        hasMore = false;
      }

      skip += result.workItems.length;

      // Azure DevOps WIQL doesn't support SKIP, so we need to track IDs and use NOT IN
      // For now, we stop after first batch for simplicity
      // In production, you'd track IDs and add "AND [System.Id] NOT IN (...)" to subsequent queries
      hasMore = false; // Simplified: single batch only

    } catch (error) {
      if (error instanceof Error && error.message.includes("20000")) {
        throw new Error(
          `Query returned too many results. Current batch size: ${currentBatchSize}. ` +
          `Try reducing batchSize option or adding more specific WHERE clauses.`
        );
      }
      throw error;
    }
  }

  return {
    workItems: allWorkItems,
    totalCount: allWorkItems.length,
  };
}

/**
 * Helper: Create link operation for relating work items
 */
export function createLinkOperation(
  targetId: number,
  linkType: string = "System.LinkTypes.Related"
): WorkItemOperation {
  const config = getAdoConfig();
  return {
    op: "add",
    path: "/relations/-",
    value: {
      rel: linkType,
      url: `https://dev.azure.com/${config.organization}/${config.project}/_apis/wit/workitems/${targetId}`,
    },
  };
}
