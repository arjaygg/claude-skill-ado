/**
 * Work Item Age Analysis
 * Analyze age of incomplete work items
 */

import { WorkItem, WorkItemAgeResult, TeamMember } from '../types.js';
import {
  extractField,
  getAssignedToName,
  parseDate,
  calculateStats
} from '../utils/data-loader.js';

export function analyzeWorkItemAge(
  workItems: WorkItem[],
  teamMembers: TeamMember[],
  ageThresholdDays: number = 60
): WorkItemAgeResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);
  const now = new Date();

  const agesByMember: Record<string, number[]> = {};
  const itemsByMember: Record<string, Array<{ id: number; age: number; state: string }>> = {};

  for (const member of teamMemberNames) {
    agesByMember[member] = [];
    itemsByMember[member] = [];
  }

  for (const item of workItems) {
    const state = extractField<string>(item, 'System.State');

    // Only analyze incomplete items
    if (!state || ['Done', '5 - Done', 'Closed', 'Removed'].includes(state)) {
      continue;
    }

    const createdDate = extractField<string>(item, 'System.CreatedDate');
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    if (!teamMemberNames.includes(assignedName)) {
      continue;
    }

    const created = parseDate(createdDate);
    if (!created) {
      continue;
    }

    const ageDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));

    agesByMember[assignedName].push(ageDays);
    itemsByMember[assignedName].push({
      id: item.id,
      age: ageDays,
      state: state
    });
  }

  // Calculate results
  const byMember: Record<string, any> = {};
  for (const [member, ages] of Object.entries(agesByMember)) {
    if (ages.length > 0) {
      const stats = calculateStats(ages);
      const itemsOverThreshold = ages.filter(age => age > ageThresholdDays).length;

      byMember[member] = {
        count: stats.count,
        avgAgeDays: stats.avg,
        maxAgeDays: stats.max,
        itemsOverThreshold
      };
    }
  }

  return { byMember };
}

/**
 * Format work item age results as TOON
 */
export function workItemAgeToToon(result: WorkItemAgeResult): string {
  let output = '[N]{member,incomplete_count,avg_age_days,max_age_days,items_over_threshold}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.count},${data.avgAgeDays.toFixed(1)},${data.maxAgeDays},${data.itemsOverThreshold}\n`;
  }

  return output;
}
