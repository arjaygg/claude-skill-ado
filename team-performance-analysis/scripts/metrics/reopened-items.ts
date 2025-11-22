/**
 * Reopened Items Analysis
 * Identify items that were reopened (quality/rework issues)
 */

import { WorkItem, ReopenedItemsResult } from '../types.js';
import { extractField, getAssignedToName } from '../utils/data-loader.js';

export function analyzeReopenedItems(workItems: WorkItem[]): ReopenedItemsResult {
  const reworkItems: Array<{
    id: number;
    state: string;
    reason: string;
    assignedTo: string;
  }> = [];

  for (const item of workItems) {
    const state = extractField<string>(item, 'System.State', '');
    const reason = extractField<string>(item, 'System.Reason', '');
    const assignedTo = extractField(item, 'System.AssignedTo');

    // Look for indicators of rework
    const reasonLower = reason.toLowerCase();
    const isRework = reasonLower.includes('reactivated') ||
                     reasonLower.includes('reopened');

    if (isRework) {
      reworkItems.push({
        id: item.id,
        state,
        reason,
        assignedTo: getAssignedToName(assignedTo)
      });
    }
  }

  const reworkCount = reworkItems.length;
  const reworkRatePct = workItems.length > 0
    ? (reworkCount / workItems.length) * 100
    : 0;

  return {
    reworkCount,
    reworkRatePct,
    items: reworkItems
  };
}

/**
 * Format reopened items as TOON
 */
export function reopenedItemsToToon(result: ReopenedItemsResult): string {
  let output = `[1]{metric,value}:\n`;
  output += `  rework_count,${result.reworkCount}\n`;
  output += `  rework_rate_pct,${result.reworkRatePct.toFixed(2)}\n`;
  return output;
}
