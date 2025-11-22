/**
 * State Distribution Analysis
 * Track work item states by month and by member
 */

import { WorkItem, StateDistributionResult, TeamMember } from '../types.js';
import { extractField, getAssignedToName, getMonth } from '../utils/data-loader.js';

export function analyzeStateDistribution(
  workItems: WorkItem[],
  teamMembers: TeamMember[]
): StateDistributionResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  const statesByMonth: Record<string, Record<string, number>> = {};
  const statesByMember: Record<string, Record<string, number>> = {};

  // Initialize member maps
  for (const member of teamMemberNames) {
    statesByMember[member] = {};
  }

  for (const item of workItems) {
    const state = extractField<string>(item, 'System.State', 'Unknown');
    const changedDate = extractField<string>(item, 'System.ChangedDate');
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    // By month
    const month = getMonth(changedDate);
    if (month) {
      if (!statesByMonth[month]) {
        statesByMonth[month] = {};
      }
      statesByMonth[month][state] = (statesByMonth[month][state] || 0) + 1;
    }

    // By member
    if (teamMemberNames.includes(assignedName)) {
      statesByMember[assignedName][state] = (statesByMember[assignedName][state] || 0) + 1;
    }
  }

  return {
    byMonth: statesByMonth,
    byMember: statesByMember
  };
}

/**
 * Format state distribution as TOON
 */
export function stateDistributionToToon(result: StateDistributionResult): string {
  let output = '[N]{member,done,in_progress,to_do,other}:\n';

  for (const [member, states] of Object.entries(result.byMember)) {
    const done = (states['Done'] || 0) + (states['5 - Done'] || 0) + (states['Closed'] || 0);
    const inProgress = states['In Progress'] || 0;
    const toDo = (states['To Do'] || 0) + (states['New'] || 0);
    const total = Object.values(states).reduce((sum, count) => sum + count, 0);
    const other = total - done - inProgress - toDo;

    output += `  ${member},${done},${inProgress},${toDo},${other}\n`;
  }

  return output;
}
