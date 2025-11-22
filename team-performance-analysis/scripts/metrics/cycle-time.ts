/**
 * Cycle Time Analysis
 * Calculate time from creation to completion for work items
 */

import { WorkItem, CycleTimeResult, TeamMember } from '../types.js';
import {
  extractField,
  getAssignedToName,
  parseDate,
  getMonth,
  calculateStats
} from '../utils/data-loader.js';

export function analyzeCycleTime(
  workItems: WorkItem[],
  teamMembers: TeamMember[]
): CycleTimeResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  const cycleTimesByMember: Record<string, number[]> = {};
  const cycleTimesByMonth: Record<string, number[]> = {};
  const cycleTimesByType: Record<string, number[]> = {};

  // Initialize maps
  for (const member of teamMemberNames) {
    cycleTimesByMember[member] = [];
  }

  for (const item of workItems) {
    const createdDate = extractField<string>(item, 'System.CreatedDate');
    const closedDate = extractField<string>(item, 'System.ClosedDate')
      || extractField<string>(item, 'Microsoft.VSTS.Common.ClosedDate');
    const state = extractField<string>(item, 'System.State');
    const assignedTo = extractField(item, 'System.AssignedTo');
    const workItemType = extractField<string>(item, 'System.WorkItemType') || 'Unknown';

    const assignedName = getAssignedToName(assignedTo);

    // Only analyze completed items
    if (!state || !['Done', '5 - Done', 'Closed'].includes(state)) {
      continue;
    }

    if (!createdDate || !closedDate) {
      continue;
    }

    const created = parseDate(createdDate);
    const closed = parseDate(closedDate);

    if (!created || !closed) {
      continue;
    }

    const cycleTimeDays = Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    // By member
    if (teamMemberNames.includes(assignedName)) {
      if (!cycleTimesByMember[assignedName]) {
        cycleTimesByMember[assignedName] = [];
      }
      cycleTimesByMember[assignedName].push(cycleTimeDays);
    }

    // By month
    const month = getMonth(createdDate);
    if (month) {
      if (!cycleTimesByMonth[month]) {
        cycleTimesByMonth[month] = [];
      }
      cycleTimesByMonth[month].push(cycleTimeDays);
    }

    // By type
    if (!cycleTimesByType[workItemType]) {
      cycleTimesByType[workItemType] = [];
    }
    cycleTimesByType[workItemType].push(cycleTimeDays);
  }

  // Calculate stats
  const byMember: Record<string, any> = {};
  for (const [member, times] of Object.entries(cycleTimesByMember)) {
    if (times.length > 0) {
      const stats = calculateStats(times);
      byMember[member] = {
        avg: stats.avg,
        median: stats.median,
        count: stats.count,
        min: stats.min,
        max: stats.max
      };
    }
  }

  const byMonth: Record<string, any> = {};
  for (const [month, times] of Object.entries(cycleTimesByMonth)) {
    if (times.length > 0) {
      const stats = calculateStats(times);
      byMonth[month] = {
        avg: stats.avg,
        median: stats.median,
        count: stats.count
      };
    }
  }

  const byType: Record<string, any> = {};
  for (const [type, times] of Object.entries(cycleTimesByType)) {
    if (times.length >= 3) { // Only include if enough samples
      const stats = calculateStats(times);
      byType[type] = {
        avg: stats.avg,
        median: stats.median,
        count: stats.count
      };
    }
  }

  return {
    byMember,
    byMonth,
    byType
  };
}

/**
 * Format cycle time results as TOON
 */
export function cycleTimeToToon(result: CycleTimeResult): string {
  let output = '[N]{member,avg_cycle_days,median_cycle_days,completed_count}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.avg.toFixed(1)},${data.median.toFixed(1)},${data.count}\n`;
  }

  return output;
}
