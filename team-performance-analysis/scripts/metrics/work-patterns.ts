/**
 * Work Patterns Analysis
 * Analyze work creation vs completion patterns and size distribution
 */

import { WorkItem, WorkPatternsResult } from '../types.js';
import { extractField, getMonth } from '../utils/data-loader.js';

export function analyzeWorkPatterns(workItems: WorkItem[]): WorkPatternsResult {
  const createdByMonth: Record<string, number> = {};
  const completedByMonth: Record<string, number> = {};
  const sizeDistribution: Record<string, number> = {
    'Tiny (0-2h)': 0,
    'Small (2-8h)': 0,
    'Medium (8-20h)': 0,
    'Large (20-40h)': 0,
    'XLarge (>40h)': 0,
    'No estimate': 0
  };

  for (const item of workItems) {
    const createdDate = extractField<string>(item, 'System.CreatedDate');
    const closedDate = extractField<string>(item, 'System.ClosedDate')
      || extractField<string>(item, 'Microsoft.VSTS.Common.ClosedDate');
    const state = extractField<string>(item, 'System.State');
    const completedWork = extractField<number>(item, 'Microsoft.VSTS.Scheduling.CompletedWork');

    // Track creation by month
    const createdMonth = getMonth(createdDate);
    if (createdMonth) {
      createdByMonth[createdMonth] = (createdByMonth[createdMonth] || 0) + 1;
    }

    // Track completion by month
    if (state && ['Done', '5 - Done', 'Closed'].includes(state) && closedDate) {
      const closedMonth = getMonth(closedDate);
      if (closedMonth) {
        completedByMonth[closedMonth] = (completedByMonth[closedMonth] || 0) + 1;
      }
    }

    // Track size distribution
    if (!completedWork) {
      sizeDistribution['No estimate']++;
    } else if (completedWork <= 2) {
      sizeDistribution['Tiny (0-2h)']++;
    } else if (completedWork <= 8) {
      sizeDistribution['Small (2-8h)']++;
    } else if (completedWork <= 20) {
      sizeDistribution['Medium (8-20h)']++;
    } else if (completedWork <= 40) {
      sizeDistribution['Large (20-40h)']++;
    } else {
      sizeDistribution['XLarge (>40h)']++;
    }
  }

  // Build creation vs completion map
  const creationVsCompletion: Record<string, any> = {};
  const allMonths = new Set([...Object.keys(createdByMonth), ...Object.keys(completedByMonth)]);

  for (const month of allMonths) {
    const created = createdByMonth[month] || 0;
    const completed = completedByMonth[month] || 0;
    creationVsCompletion[month] = {
      created,
      completed,
      delta: completed - created
    };
  }

  return {
    creationVsCompletion,
    sizeDistribution
  };
}

/**
 * Format work patterns as TOON
 */
export function workPatternsToToon(result: WorkPatternsResult): string {
  let output = '[N]{month,created,completed,delta}:\n';

  for (const [month, data] of Object.entries(result.creationVsCompletion).sort()) {
    const deltaStr = data.delta > 0 ? `+${data.delta}` : `${data.delta}`;
    output += `  ${month},${data.created},${data.completed},${deltaStr}\n`;
  }

  return output;
}
