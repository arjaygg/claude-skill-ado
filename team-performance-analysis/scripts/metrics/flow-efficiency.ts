/**
 * Flow Efficiency Analysis
 * Calculate: Active Working Time / Total Cycle Time
 * Low efficiency (<15%) means items spend most time waiting vs being worked on
 */

import { WorkItem, TeamMember } from '../types.js';
import { extractField, getAssignedToName, parseDate } from '../utils/data-loader.js';

export interface FlowEfficiencyResult {
  byMember: Record<string, MemberFlowEfficiency>;
  byWorkItem: WorkItemFlowEfficiency[];
  overall: OverallFlowEfficiency;
}

export interface MemberFlowEfficiency {
  avgEfficiencyPct: number;
  avgActiveTime: number;
  avgWaitTime: number;
  avgTotalTime: number;
  itemsAnalyzed: number;
  efficiencyRating: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

export interface WorkItemFlowEfficiency {
  id: number;
  title: string;
  assignedTo: string;
  activeTime: number;
  waitTime: number;
  totalTime: number;
  efficiencyPct: number;
}

export interface OverallFlowEfficiency {
  avgEfficiencyPct: number;
  excellentCount: number; // >40%
  goodCount: number; // 25-40%
  fairCount: number; // 15-25%
  poorCount: number; // <15%
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
 * Analyze flow efficiency (working time vs wait time)
 */
export function analyzeFlowEfficiency(
  workItems: WorkItem[],
  workItemUpdates: WorkItemUpdate[],
  teamMembers: TeamMember[]
): FlowEfficiencyResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  // Group updates by work item
  const updatesByItem: Record<number, WorkItemUpdate[]> = {};
  for (const update of workItemUpdates) {
    if (!updatesByItem[update.workItemId]) {
      updatesByItem[update.workItemId] = [];
    }
    updatesByItem[update.workItemId].push(update);
  }

  // Sort updates
  for (const itemId in updatesByItem) {
    updatesByItem[itemId].sort((a, b) => a.rev - b.rev);
  }

  // Define active vs wait states
  const activeStates = ['Active', 'In Progress', '2 - Active', 'Resolved', '3 - Resolved', '3.2 - QA in Progress'];
  const waitStates = ['New', 'To Do', 'Blocked', 'On Hold', 'Ready for Test'];

  const memberEfficiency: Record<string, {
    activeTime: number[];
    waitTime: number[];
    totalTime: number[];
    efficiency: number[];
  }> = {};

  const workItemEfficiencies: WorkItemFlowEfficiency[] = [];
  const allEfficiencies: number[] = [];

  // Initialize member maps
  for (const member of teamMemberNames) {
    memberEfficiency[member] = {
      activeTime: [],
      waitTime: [],
      totalTime: [],
      efficiency: []
    };
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
      continue;
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
      continue;
    }

    // Calculate active vs wait time
    let activeTime = 0;
    let waitTime = 0;

    for (let i = 0; i < stateTimeline.length - 1; i++) {
      const state = stateTimeline[i].state;
      const startDate = stateTimeline[i].startDate;
      const endDate = stateTimeline[i + 1].startDate;

      const daysInState = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Validate reasonable time range (0-365 days)
      if (daysInState < 0 || daysInState > 365) {
        continue; // Skip invalid transitions
      }

      if (activeStates.includes(state)) {
        activeTime += daysInState;
      } else if (waitStates.includes(state)) {
        waitTime += daysInState;
      } else {
        // Unknown states count as wait time
        waitTime += daysInState;
      }
    }

    // Handle current state
    if (stateTimeline.length > 0) {
      const lastState = stateTimeline[stateTimeline.length - 1].state;
      const lastDate = stateTimeline[stateTimeline.length - 1].startDate;
      const now = new Date();
      const daysInLastState = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      // Only include if reasonable (0-365 days)
      if (daysInLastState >= 0 && daysInLastState <= 365) {
        if (activeStates.includes(lastState)) {
          activeTime += daysInLastState;
        } else if (waitStates.includes(lastState)) {
          waitTime += daysInLastState;
        } else {
          waitTime += daysInLastState;
        }
      }
    }

    // Skip items with no valid time data
    if (activeTime === 0 && waitTime === 0) {
      continue;
    }

    const totalTime = activeTime + waitTime;
    const efficiencyPct = totalTime > 0 ? (activeTime / totalTime) * 100 : 0;

    if (totalTime > 0) {
      memberEfficiency[assignedName].activeTime.push(activeTime);
      memberEfficiency[assignedName].waitTime.push(waitTime);
      memberEfficiency[assignedName].totalTime.push(totalTime);
      memberEfficiency[assignedName].efficiency.push(efficiencyPct);

      allEfficiencies.push(efficiencyPct);

      workItemEfficiencies.push({
        id: item.id,
        title: extractField<string>(item, 'System.Title') || '',
        assignedTo: assignedName,
        activeTime,
        waitTime,
        totalTime,
        efficiencyPct
      });
    }
  }

  // Calculate member stats
  function getEfficiencyRating(pct: number): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    if (pct >= 40) return 'Excellent';
    if (pct >= 25) return 'Good';
    if (pct >= 15) return 'Fair';
    return 'Poor';
  }

  const byMember: Record<string, MemberFlowEfficiency> = {};

  for (const [member, data] of Object.entries(memberEfficiency)) {
    if (data.efficiency.length === 0) continue;

    const avgEfficiencyPct = data.efficiency.reduce((sum, e) => sum + e, 0) / data.efficiency.length;
    const avgActiveTime = data.activeTime.reduce((sum, t) => sum + t, 0) / data.activeTime.length;
    const avgWaitTime = data.waitTime.reduce((sum, t) => sum + t, 0) / data.waitTime.length;
    const avgTotalTime = data.totalTime.reduce((sum, t) => sum + t, 0) / data.totalTime.length;

    byMember[member] = {
      avgEfficiencyPct,
      avgActiveTime,
      avgWaitTime,
      avgTotalTime,
      itemsAnalyzed: data.efficiency.length,
      efficiencyRating: getEfficiencyRating(avgEfficiencyPct)
    };
  }

  // Calculate overall stats
  const avgEfficiencyPct = allEfficiencies.length > 0
    ? allEfficiencies.reduce((sum, e) => sum + e, 0) / allEfficiencies.length
    : 0;

  const excellentCount = allEfficiencies.filter(e => e >= 40).length;
  const goodCount = allEfficiencies.filter(e => e >= 25 && e < 40).length;
  const fairCount = allEfficiencies.filter(e => e >= 15 && e < 25).length;
  const poorCount = allEfficiencies.filter(e => e < 15).length;

  return {
    byMember,
    byWorkItem: workItemEfficiencies,
    overall: {
      avgEfficiencyPct,
      excellentCount,
      goodCount,
      fairCount,
      poorCount
    }
  };
}

/**
 * Format flow efficiency results as TOON
 */
export function flowEfficiencyToToon(result: FlowEfficiencyResult): string {
  let output = '[N]{member,efficiency_pct,avg_active_days,avg_wait_days,rating}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.avgEfficiencyPct.toFixed(1)},${data.avgActiveTime.toFixed(1)},${data.avgWaitTime.toFixed(1)},${data.efficiencyRating}\n`;
  }

  return output;
}
