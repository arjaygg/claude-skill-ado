/**
 * Sprint/Iteration Analysis
 * Calculate velocity, unplanned work ratio, sprint completion rates
 */

import { WorkItem, TeamMember } from '../types.js';
import { extractField, getAssignedToName, parseDate } from '../utils/data-loader.js';

export interface SprintAnalysisResult {
  bySprint: Record<string, SprintMetrics>;
  byMember: Record<string, MemberSprintMetrics>;
  overall: OverallSprintMetrics;
}

export interface SprintMetrics {
  sprintName: string;
  startDate: string | null;
  endDate: string | null;
  totalItems: number;
  completedItems: number;
  completionRate: number;
  unplannedItems: number;
  unplannedRatio: number;
  carryoverItems: number;
  velocity: number; // completed story points or count
}

export interface MemberSprintMetrics {
  totalSprints: number;
  avgItemsPerSprint: number;
  avgCompletionRate: number;
  avgUnplannedRatio: number;
  bestSprint: string;
  worstSprint: string;
}

export interface OverallSprintMetrics {
  totalSprints: number;
  avgVelocity: number;
  avgCompletionRate: number;
  avgUnplannedRatio: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface WorkItemUpdate {
  workItemId: number;
  rev: number;
  revisedDate: string;
  fields?: {
    'System.IterationPath'?: {
      oldValue?: string;
      newValue?: string;
    };
    [key: string]: any;
  };
}

/**
 * Extract sprint name from iteration path
 */
function extractSprintName(iterationPath: string | undefined): string {
  if (!iterationPath) return 'No Sprint';

  // Extract last part after final backslash
  const parts = iterationPath.split('\\');
  return parts[parts.length - 1] || 'Unknown';
}

/**
 * Analyze sprint metrics and velocity
 */
export function analyzeSprintMetrics(
  workItems: WorkItem[],
  workItemUpdates: WorkItemUpdate[],
  teamMembers: TeamMember[]
): SprintAnalysisResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  // Group items by sprint
  const sprintData: Record<string, {
    items: WorkItem[];
    plannedItems: Set<number>; // Items present at sprint start
    addedItems: Set<number>; // Items added mid-sprint
    completedItems: Set<number>;
  }> = {};

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

  // Analyze each work item
  for (const item of workItems) {
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    if (!teamMemberNames.includes(assignedName)) {
      continue;
    }

    const iterationPath = extractField<string>(item, 'System.IterationPath');
    const sprintName = extractSprintName(iterationPath);
    const createdDate = parseDate(extractField<string>(item, 'System.CreatedDate'));
    const state = extractField<string>(item, 'System.State');

    // Initialize sprint data
    if (!sprintData[sprintName]) {
      sprintData[sprintName] = {
        items: [],
        plannedItems: new Set(),
        addedItems: new Set(),
        completedItems: new Set()
      };
    }

    sprintData[sprintName].items.push(item);

    // Check if item was added mid-sprint
    const updates = updatesByItem[item.id] || [];
    let firstSprintAssignment: string | null = null;
    let firstSprintDate: Date | null = null;

    for (const update of updates) {
      if (update.fields?.['System.IterationPath']) {
        const iterChange = update.fields['System.IterationPath'];
        const newIter = iterChange.newValue;
        if (newIter) {
          const sprint = extractSprintName(newIter);
          if (sprint === sprintName) {
            firstSprintAssignment = sprint;
            firstSprintDate = parseDate(update.revisedDate);
            break;
          }
        }
      }
    }

    // Determine if planned or added mid-sprint
    // For now, assume items created more than 3 days after sprint visible are "unplanned"
    // (This is a heuristic; ideally we'd have sprint start dates)
    if (firstSprintDate && createdDate) {
      const daysDiff = Math.floor((firstSprintDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysDiff > 3) {
        sprintData[sprintName].addedItems.add(item.id);
      } else {
        sprintData[sprintName].plannedItems.add(item.id);
      }
    } else {
      // Default: assume planned if created before it appears in sprint
      sprintData[sprintName].plannedItems.add(item.id);
    }

    // Check if completed
    if (state && ['Done', '5 - Done', 'Closed'].includes(state)) {
      sprintData[sprintName].completedItems.add(item.id);
    }
  }

  // Calculate sprint metrics
  const bySprint: Record<string, SprintMetrics> = {};

  for (const [sprintName, data] of Object.entries(sprintData)) {
    const totalItems = data.items.length;
    const completedItems = data.completedItems.size;
    const unplannedItems = data.addedItems.size;
    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
    const unplannedRatio = totalItems > 0 ? (unplannedItems / totalItems) * 100 : 0;

    bySprint[sprintName] = {
      sprintName,
      startDate: null, // Would need sprint metadata
      endDate: null,
      totalItems,
      completedItems,
      completionRate,
      unplannedItems,
      unplannedRatio,
      carryoverItems: totalItems - completedItems,
      velocity: completedItems // Using count as velocity
    };
  }

  // Calculate member sprint metrics
  const memberSprintData: Record<string, {
    sprintCounts: Record<string, number>;
    sprintCompleted: Record<string, number>;
    sprintUnplanned: Record<string, number>;
  }> = {};

  for (const member of teamMemberNames) {
    memberSprintData[member] = {
      sprintCounts: {},
      sprintCompleted: {},
      sprintUnplanned: {}
    };
  }

  for (const item of workItems) {
    const assignedTo = extractField(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);

    if (!teamMemberNames.includes(assignedName)) {
      continue;
    }

    const iterationPath = extractField<string>(item, 'System.IterationPath');
    const sprintName = extractSprintName(iterationPath);
    const state = extractField<string>(item, 'System.State');

    if (!memberSprintData[assignedName].sprintCounts[sprintName]) {
      memberSprintData[assignedName].sprintCounts[sprintName] = 0;
      memberSprintData[assignedName].sprintCompleted[sprintName] = 0;
      memberSprintData[assignedName].sprintUnplanned[sprintName] = 0;
    }

    memberSprintData[assignedName].sprintCounts[sprintName]++;

    if (state && ['Done', '5 - Done', 'Closed'].includes(state)) {
      memberSprintData[assignedName].sprintCompleted[sprintName]++;
    }

    const sprintInfo = sprintData[sprintName];
    if (sprintInfo && sprintInfo.addedItems.has(item.id)) {
      memberSprintData[assignedName].sprintUnplanned[sprintName]++;
    }
  }

  const byMember: Record<string, MemberSprintMetrics> = {};

  for (const [member, data] of Object.entries(memberSprintData)) {
    const sprints = Object.keys(data.sprintCounts);
    const totalSprints = sprints.length;

    if (totalSprints === 0) continue;

    const avgItemsPerSprint = Object.values(data.sprintCounts).reduce((sum, c) => sum + c, 0) / totalSprints;

    const completionRates = sprints.map(s => {
      const total = data.sprintCounts[s];
      const completed = data.sprintCompleted[s];
      return total > 0 ? (completed / total) * 100 : 0;
    });
    const avgCompletionRate = completionRates.reduce((sum, r) => sum + r, 0) / completionRates.length;

    const unplannedRatios = sprints.map(s => {
      const total = data.sprintCounts[s];
      const unplanned = data.sprintUnplanned[s];
      return total > 0 ? (unplanned / total) * 100 : 0;
    });
    const avgUnplannedRatio = unplannedRatios.reduce((sum, r) => sum + r, 0) / unplannedRatios.length;

    // Find best/worst sprints
    let bestSprint = '';
    let bestRate = 0;
    let worstSprint = '';
    let worstRate = 100;

    for (let i = 0; i < sprints.length; i++) {
      const rate = completionRates[i];
      if (rate > bestRate) {
        bestRate = rate;
        bestSprint = sprints[i];
      }
      if (rate < worstRate) {
        worstRate = rate;
        worstSprint = sprints[i];
      }
    }

    byMember[member] = {
      totalSprints,
      avgItemsPerSprint,
      avgCompletionRate,
      avgUnplannedRatio,
      bestSprint,
      worstSprint
    };
  }

  // Calculate overall metrics
  const sprintNames = Object.keys(bySprint);
  const totalSprints = sprintNames.length;

  const velocities = sprintNames.map(s => bySprint[s].velocity);
  const avgVelocity = velocities.length > 0
    ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
    : 0;

  const completionRates = sprintNames.map(s => bySprint[s].completionRate);
  const avgCompletionRate = completionRates.length > 0
    ? completionRates.reduce((sum, r) => sum + r, 0) / completionRates.length
    : 0;

  const unplannedRatios = sprintNames.map(s => bySprint[s].unplannedRatio);
  const avgUnplannedRatio = unplannedRatios.length > 0
    ? unplannedRatios.reduce((sum, r) => sum + r, 0) / unplannedRatios.length
    : 0;

  // Determine velocity trend (simple: compare first half vs second half)
  let velocityTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
  if (velocities.length >= 4) {
    const midpoint = Math.floor(velocities.length / 2);
    const firstHalfAvg = velocities.slice(0, midpoint).reduce((sum, v) => sum + v, 0) / midpoint;
    const secondHalfAvg = velocities.slice(midpoint).reduce((sum, v) => sum + v, 0) / (velocities.length - midpoint);

    if (secondHalfAvg > firstHalfAvg * 1.1) {
      velocityTrend = 'increasing';
    } else if (secondHalfAvg < firstHalfAvg * 0.9) {
      velocityTrend = 'decreasing';
    }
  }

  return {
    bySprint,
    byMember,
    overall: {
      totalSprints,
      avgVelocity,
      avgCompletionRate,
      avgUnplannedRatio,
      velocityTrend
    }
  };
}

/**
 * Format sprint analysis results as TOON
 */
export function sprintAnalysisToToon(result: SprintAnalysisResult): string {
  let output = '[N]{sprint,total_items,completed,completion_rate,unplanned_ratio}:\n';

  for (const [sprint, data] of Object.entries(result.bySprint).sort()) {
    output += `  ${sprint},${data.totalItems},${data.completedItems},${data.completionRate.toFixed(1)},${data.unplannedRatio.toFixed(1)}\n`;
  }

  return output;
}
