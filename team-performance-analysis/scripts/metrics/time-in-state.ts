/**
 * Time-in-State Analysis (Cycle Time Breakdown)
 * Calculate time spent in each state (New, Active, Resolved, etc.)
 * Identifies bottlenecks in the workflow
 */

import { WorkItem, TeamMember } from '../types.js';
import { extractField, getAssignedToName, parseDate } from '../utils/data-loader.js';

export interface TimeInStateResult {
  byMember: Record<string, MemberTimeInState>;
  byWorkItem: WorkItemStateBreakdown[];
  overall: OverallStateTime;
}

export interface MemberTimeInState {
  avgTimeInStates: Record<string, number>;
  totalItems: number;
  bottleneckState: string;
  bottleneckAvgDays: number;
}

export interface WorkItemStateBreakdown {
  id: number;
  title: string;
  assignedTo: string;
  totalCycleTime: number;
  stateBreakdown: Record<string, number>;
  longestState: string;
  longestStateDays: number;
}

export interface OverallStateTime {
  avgTimeByState: Record<string, number>;
  itemsAnalyzed: number;
  commonBottleneck: string;
}

export interface WorkItemUpdate {
  workItemId: number;
  rev: number;
  revisedDate: string;
  fields?: {
    'System.State'?: {
      oldValue?: string;
      newValue?: string;
    };
    [key: string]: any;
  };
}

/**
 * Analyze time spent in each state using work item history
 */
export function analyzeTimeInState(
  workItems: WorkItem[],
  workItemUpdates: WorkItemUpdate[],
  teamMembers: TeamMember[]
): TimeInStateResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  // Group updates by work item
  const updatesByItem: Record<number, WorkItemUpdate[]> = {};
  for (const update of workItemUpdates) {
    if (!updatesByItem[update.workItemId]) {
      updatesByItem[update.workItemId] = [];
    }
    updatesByItem[update.workItemId].push(update);
  }

  // Sort updates by revision number
  for (const itemId in updatesByItem) {
    updatesByItem[itemId].sort((a, b) => a.rev - b.rev);
  }

  const memberTimeInStates: Record<string, { states: Record<string, number[]>; count: number }> = {};
  const workItemBreakdowns: WorkItemStateBreakdown[] = [];
  const allStatesTimes: Record<string, number[]> = {};

  // Initialize member maps
  for (const member of teamMemberNames) {
    memberTimeInStates[member] = { states: {}, count: 0 };
  }

  // Analyze each work item
  for (const item of workItems) {
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    if (!teamMemberNames.includes(assignedName)) {
      continue;
    }

    const updates = updatesByItem[item.id] || [];
    if (updates.length === 0) {
      continue; // No history available
    }

    // Build state timeline from actual state changes
    const stateTimeline: Array<{ state: string; startDate: Date }> = [];

    // Find creation date and initial state
    const createdDate = parseDate(extractField<string>(item, 'System.CreatedDate'));
    let initialState: string | null = null;

    // Get initial state from rev 1 (creation)
    for (const update of updates) {
      if (update.rev === 1 && update.fields?.['System.State']?.newValue) {
        initialState = update.fields['System.State'].newValue;
        if (createdDate) {
          stateTimeline.push({
            state: initialState,
            startDate: createdDate
          });
        }
        break;
      }
    }

    // Process actual state transitions (where oldValue exists)
    for (const update of updates) {
      if (update.fields?.['System.State']) {
        const stateChange = update.fields['System.State'];

        // Only process actual transitions (not creation)
        if (stateChange.oldValue && stateChange.newValue) {
          const newState = stateChange.newValue;
          const changeDate = parseDate(update.revisedDate);

          if (changeDate) {
            stateTimeline.push({
              state: newState,
              startDate: changeDate
            });
          }
        }
      }
    }

    // Skip if timeline is too short
    if (stateTimeline.length < 2) {
      continue; // Need at least 2 states to calculate time
    }

    // Calculate time in each state
    const stateBreakdown: Record<string, number> = {};
    let totalCycleTime = 0;

    for (let i = 0; i < stateTimeline.length - 1; i++) {
      const state = stateTimeline[i].state;
      const startDate = stateTimeline[i].startDate;
      const endDate = stateTimeline[i + 1].startDate;

      const daysInState = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Validate reasonable time range (0-365 days per state)
      if (daysInState < 0 || daysInState > 365) {
        continue; // Skip invalid date ranges
      }

      if (!stateBreakdown[state]) {
        stateBreakdown[state] = 0;
      }
      stateBreakdown[state] += daysInState;
      totalCycleTime += daysInState;

      // Track for overall stats
      if (!allStatesTimes[state]) {
        allStatesTimes[state] = [];
      }
      allStatesTimes[state].push(daysInState);

      // Track for member stats
      if (!memberTimeInStates[assignedName].states[state]) {
        memberTimeInStates[assignedName].states[state] = [];
      }
      memberTimeInStates[assignedName].states[state].push(daysInState);
    }

    // Handle current state (still open or recently closed)
    if (stateTimeline.length > 0) {
      const lastState = stateTimeline[stateTimeline.length - 1].state;
      const lastDate = stateTimeline[stateTimeline.length - 1].startDate;
      const now = new Date();

      const daysInLastState = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only include if reasonable (0-365 days)
      if (daysInLastState >= 0 && daysInLastState <= 365) {
        if (!stateBreakdown[lastState]) {
          stateBreakdown[lastState] = 0;
        }
        stateBreakdown[lastState] += daysInLastState;
        totalCycleTime += daysInLastState;
      }
    }

    // Skip items with no valid time data
    if (totalCycleTime === 0) {
      continue;
    }

    // Find longest state
    let longestState = '';
    let longestStateDays = 0;
    for (const [state, days] of Object.entries(stateBreakdown)) {
      if (days > longestStateDays) {
        longestStateDays = days;
        longestState = state;
      }
    }

    memberTimeInStates[assignedName].count++;

    workItemBreakdowns.push({
      id: item.id,
      title: extractField<string>(item, 'System.Title') || '',
      assignedTo: assignedName,
      totalCycleTime,
      stateBreakdown,
      longestState,
      longestStateDays
    });
  }

  // Calculate member averages
  const byMember: Record<string, MemberTimeInState> = {};
  for (const [member, data] of Object.entries(memberTimeInStates)) {
    if (data.count === 0) continue;

    const avgTimeInStates: Record<string, number> = {};
    let bottleneckState = '';
    let bottleneckAvgDays = 0;

    for (const [state, times] of Object.entries(data.states)) {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      avgTimeInStates[state] = avg;

      if (avg > bottleneckAvgDays) {
        bottleneckAvgDays = avg;
        bottleneckState = state;
      }
    }

    byMember[member] = {
      avgTimeInStates,
      totalItems: data.count,
      bottleneckState,
      bottleneckAvgDays
    };
  }

  // Calculate overall averages
  const avgTimeByState: Record<string, number> = {};
  let commonBottleneck = '';
  let highestAvg = 0;

  for (const [state, times] of Object.entries(allStatesTimes)) {
    const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
    avgTimeByState[state] = avg;

    if (avg > highestAvg) {
      highestAvg = avg;
      commonBottleneck = state;
    }
  }

  return {
    byMember,
    byWorkItem: workItemBreakdowns,
    overall: {
      avgTimeByState,
      itemsAnalyzed: workItemBreakdowns.length,
      commonBottleneck
    }
  };
}

/**
 * Format time-in-state results as TOON
 */
export function timeInStateToToon(result: TimeInStateResult): string {
  let output = '[N]{member,total_items,bottleneck_state,bottleneck_avg_days}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.totalItems},${data.bottleneckState},${data.bottleneckAvgDays.toFixed(1)}\n`;
  }

  return output;
}
