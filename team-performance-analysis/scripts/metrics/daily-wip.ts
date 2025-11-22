/**
 * Daily WIP (Work in Progress) Analysis
 * Reconstruct day-by-day concurrent active items per person
 * High WIP indicates context switching and reduced productivity
 */

import { WorkItem, TeamMember } from '../types.js';
import { extractField, getAssignedToName, parseDate } from '../utils/data-loader.js';

export interface DailyWipResult {
  byMember: Record<string, MemberWipStats>;
  byDate: Record<string, DateWipSnapshot>;
  overallStats: OverallWipStats;
}

export interface MemberWipStats {
  avgWip: number;
  maxWip: number;
  maxWipDate: string;
  daysOver3: number; // Days with >3 concurrent items
  daysOver5: number; // Days with >5 concurrent items
  totalDaysTracked: number;
  wipDistribution: Record<number, number>; // WIP level -> count of days
}

export interface DateWipSnapshot {
  date: string;
  memberWip: Record<string, number>;
  totalWip: number;
}

export interface OverallWipStats {
  avgWipAcrossTeam: number;
  peakWipDate: string;
  peakWipCount: number;
  highConcurrencyDays: number; // Days where team avg >3
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
    'System.AssignedTo'?: {
      oldValue?: string;
      newValue?: string;
    };
    [key: string]: any;
  };
}

/**
 * Analyze daily work in progress (context switching load)
 */
export function analyzeDailyWip(
  workItems: WorkItem[],
  workItemUpdates: WorkItemUpdate[],
  teamMembers: TeamMember[],
  startDate: string,
  endDate: string
): DailyWipResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  // Group updates by work item
  const updatesByItem: Record<number, WorkItemUpdate[]> = {};
  for (const update of workItemUpdates) {
    if (!updatesByItem[update.workItemId]) {
      updatesByItem[update.workItemId] = [];
    }
    updatesByItem[update.workItemId].push(update);
  }

  // Sort updates by revision
  for (const itemId in updatesByItem) {
    updatesByItem[itemId].sort((a, b) => a.rev - b.rev);
  }

  // Build active periods for each work item
  interface ActivePeriod {
    workItemId: number;
    assignedTo: string;
    startDate: Date;
    endDate: Date | null; // null = still active
  }

  const activePeriods: ActivePeriod[] = [];

  for (const item of workItems) {
    const updates = updatesByItem[item.id] || [];
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    if (!teamMemberNames.includes(assignedName)) {
      continue;
    }

    // Track when item enters/exits "Active" or "In Progress" states
    let currentState = extractField<string>(item, 'System.State') || '';
    let currentAssignee = assignedName;
    let activeStartDate: Date | null = null;

    // Check if initially active
    const activeStates = ['Active', 'In Progress', '2 - Active', '3 - Resolved'];
    if (activeStates.includes(currentState)) {
      const createdDate = parseDate(extractField<string>(item, 'System.CreatedDate'));
      if (createdDate) {
        activeStartDate = createdDate;
      }
    }

    for (const update of updates) {
      const updateDate = parseDate(update.revisedDate);
      if (!updateDate) continue;

      // Check for state change
      if (update.fields?.['System.State']) {
        const stateChange = update.fields['System.State'];
        const newState = stateChange.newValue || '';
        const oldState = stateChange.oldValue || '';

        const wasActive = activeStates.includes(oldState);
        const isActive = activeStates.includes(newState);

        if (!wasActive && isActive) {
          // Became active
          activeStartDate = updateDate;
        } else if (wasActive && !isActive) {
          // Became inactive
          if (activeStartDate) {
            activePeriods.push({
              workItemId: item.id,
              assignedTo: currentAssignee,
              startDate: activeStartDate,
              endDate: updateDate
            });
            activeStartDate = null;
          }
        }

        currentState = newState;
      }

      // Check for assignment change
      if (update.fields?.['System.AssignedTo']) {
        const assignChange = update.fields['System.AssignedTo'];
        const newAssignee = typeof assignChange.newValue === 'string'
          ? assignChange.newValue
          : (assignChange.newValue as any)?.displayName || '';

        if (newAssignee && newAssignee !== currentAssignee) {
          // Close period for old assignee
          if (activeStartDate && activeStates.includes(currentState)) {
            activePeriods.push({
              workItemId: item.id,
              assignedTo: currentAssignee,
              startDate: activeStartDate,
              endDate: updateDate
            });
          }

          currentAssignee = newAssignee;

          // Start new period for new assignee if still active
          if (activeStates.includes(currentState)) {
            activeStartDate = updateDate;
          }
        }
      }
    }

    // Handle currently active items
    if (activeStartDate && activeStates.includes(currentState)) {
      activePeriods.push({
        workItemId: item.id,
        assignedTo: currentAssignee,
        startDate: activeStartDate,
        endDate: null // Still active
      });
    }
  }

  // Generate daily snapshots
  const start = parseDate(startDate) || new Date(startDate);
  const end = parseDate(endDate) || new Date(endDate);

  const dailySnapshots: Record<string, Record<string, Set<number>>> = {};

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    dailySnapshots[dateStr] = {};

    for (const member of teamMemberNames) {
      dailySnapshots[dateStr][member] = new Set<number>();
    }

    // Find all active periods on this date
    for (const period of activePeriods) {
      if (!teamMemberNames.includes(period.assignedTo)) continue;

      const periodStart = period.startDate;
      const periodEnd = period.endDate || new Date(); // If null, use now

      if (d >= periodStart && d <= periodEnd) {
        dailySnapshots[dateStr][period.assignedTo].add(period.workItemId);
      }
    }
  }

  // Calculate member statistics
  const memberStats: Record<string, {
    wipCounts: number[];
    maxWip: number;
    maxWipDate: string;
    wipDistribution: Record<number, number>;
  }> = {};

  for (const member of teamMemberNames) {
    memberStats[member] = {
      wipCounts: [],
      maxWip: 0,
      maxWipDate: '',
      wipDistribution: {}
    };
  }

  const byDate: Record<string, DateWipSnapshot> = {};

  for (const [date, members] of Object.entries(dailySnapshots)) {
    let totalWip = 0;

    for (const [member, items] of Object.entries(members)) {
      const wip = items.size;
      totalWip += wip;

      memberStats[member].wipCounts.push(wip);

      if (wip > memberStats[member].maxWip) {
        memberStats[member].maxWip = wip;
        memberStats[member].maxWipDate = date;
      }

      // Track distribution
      if (!memberStats[member].wipDistribution[wip]) {
        memberStats[member].wipDistribution[wip] = 0;
      }
      memberStats[member].wipDistribution[wip]++;
    }

    byDate[date] = {
      date,
      memberWip: Object.fromEntries(
        Object.entries(members).map(([m, items]) => [m, items.size])
      ),
      totalWip
    };
  }

  // Calculate final member stats
  const byMember: Record<string, MemberWipStats> = {};

  for (const [member, stats] of Object.entries(memberStats)) {
    const avgWip = stats.wipCounts.length > 0
      ? stats.wipCounts.reduce((sum, w) => sum + w, 0) / stats.wipCounts.length
      : 0;

    const daysOver3 = stats.wipCounts.filter(w => w > 3).length;
    const daysOver5 = stats.wipCounts.filter(w => w > 5).length;

    byMember[member] = {
      avgWip,
      maxWip: stats.maxWip,
      maxWipDate: stats.maxWipDate,
      daysOver3,
      daysOver5,
      totalDaysTracked: stats.wipCounts.length,
      wipDistribution: stats.wipDistribution
    };
  }

  // Calculate overall stats
  const allWipCounts = Object.values(byDate).map(d => d.totalWip);
  const avgWipAcrossTeam = allWipCounts.length > 0
    ? allWipCounts.reduce((sum, w) => sum + w, 0) / allWipCounts.length
    : 0;

  let peakWipDate = '';
  let peakWipCount = 0;
  for (const [date, snapshot] of Object.entries(byDate)) {
    if (snapshot.totalWip > peakWipCount) {
      peakWipCount = snapshot.totalWip;
      peakWipDate = date;
    }
  }

  const teamAvgs = Object.values(byDate).map(d =>
    Object.values(d.memberWip).reduce((sum, w) => sum + w, 0) / teamMemberNames.length
  );
  const highConcurrencyDays = teamAvgs.filter(avg => avg > 3).length;

  return {
    byMember,
    byDate,
    overallStats: {
      avgWipAcrossTeam,
      peakWipDate,
      peakWipCount,
      highConcurrencyDays
    }
  };
}

/**
 * Format daily WIP results as TOON
 */
export function dailyWipToToon(result: DailyWipResult): string {
  let output = '[N]{member,avg_wip,max_wip,days_over_3,days_over_5}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.avgWip.toFixed(1)},${data.maxWip},${data.daysOver3},${data.daysOver5}\n`;
  }

  return output;
}
