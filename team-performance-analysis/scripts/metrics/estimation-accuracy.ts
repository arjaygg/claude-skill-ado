/**
 * Estimation Accuracy Analysis
 * Compare original estimates vs actual completed work
 */

import { WorkItem, EstimationAccuracyResult, TeamMember } from '../types.js';
import {
  extractField,
  getAssignedToName,
  getMonth
} from '../utils/data-loader.js';

export function analyzeEstimationAccuracy(
  workItems: WorkItem[],
  teamMembers: TeamMember[],
  highVarianceThreshold: number = 50
): EstimationAccuracyResult {
  const teamMemberNames = teamMembers.map(m => m.displayName);

  const estimationByMember: Record<string, {
    estimates: number[];
    actuals: number[];
    variances: number[];
  }> = {};

  const estimationByMonth: Record<string, {
    estimates: number[];
    actuals: number[];
  }> = {};

  for (const item of workItems) {
    const originalEstimate = extractField<number>(item, 'Microsoft.VSTS.Scheduling.OriginalEstimate');
    const completedWork = extractField<number>(item, 'Microsoft.VSTS.Scheduling.CompletedWork');
    const assignedTo = extractField(item, 'System.AssignedTo');
    const createdDate = extractField<string>(item, 'System.CreatedDate');

    const assignedName = getAssignedToName(assignedTo);

    if (!originalEstimate || !completedWork || originalEstimate <= 0) {
      continue;
    }

    const variancePct = ((completedWork - originalEstimate) / originalEstimate) * 100;

    // By member
    if (teamMemberNames.includes(assignedName)) {
      if (!estimationByMember[assignedName]) {
        estimationByMember[assignedName] = {
          estimates: [],
          actuals: [],
          variances: []
        };
      }
      estimationByMember[assignedName].estimates.push(originalEstimate);
      estimationByMember[assignedName].actuals.push(completedWork);
      estimationByMember[assignedName].variances.push(variancePct);
    }

    // By month
    const month = getMonth(createdDate);
    if (month) {
      if (!estimationByMonth[month]) {
        estimationByMonth[month] = {
          estimates: [],
          actuals: []
        };
      }
      estimationByMonth[month].estimates.push(originalEstimate);
      estimationByMonth[month].actuals.push(completedWork);
    }
  }

  // Calculate results
  const byMember: Record<string, any> = {};
  for (const [member, data] of Object.entries(estimationByMember)) {
    const totalEstimate = data.estimates.reduce((sum, val) => sum + val, 0);
    const totalActual = data.actuals.reduce((sum, val) => sum + val, 0);
    const variancePct = totalEstimate > 0
      ? ((totalActual - totalEstimate) / totalEstimate) * 100
      : 0;

    const avgVariance = data.variances.length > 0
      ? data.variances.reduce((sum, val) => sum + val, 0) / data.variances.length
      : 0;

    const sortedVariances = [...data.variances].sort((a, b) => a - b);
    const medianVariance = sortedVariances[Math.floor(sortedVariances.length / 2)] || 0;

    const highVarianceItems = data.variances.filter(v => Math.abs(v) > highVarianceThreshold).length;

    byMember[member] = {
      totalEstimate,
      totalActual,
      variancePct,
      itemCount: data.estimates.length,
      avgVariance,
      medianVariance,
      highVarianceItems
    };
  }

  const byMonth: Record<string, any> = {};
  for (const [month, data] of Object.entries(estimationByMonth)) {
    const totalEstimate = data.estimates.reduce((sum, val) => sum + val, 0);
    const totalActual = data.actuals.reduce((sum, val) => sum + val, 0);
    const variancePct = totalEstimate > 0
      ? ((totalActual - totalEstimate) / totalEstimate) * 100
      : 0;

    byMonth[month] = {
      totalEstimate,
      totalActual,
      variancePct,
      itemCount: data.estimates.length
    };
  }

  return {
    byMember,
    byMonth
  };
}

/**
 * Format estimation results as TOON
 */
export function estimationToToon(result: EstimationAccuracyResult): string {
  let output = '[N]{member,total_estimate_hrs,total_actual_hrs,variance_pct,item_count}:\n';

  for (const [member, data] of Object.entries(result.byMember)) {
    output += `  ${member},${data.totalEstimate.toFixed(1)},${data.totalActual.toFixed(1)},${data.variancePct > 0 ? '+' : ''}${data.variancePct.toFixed(1)},${data.itemCount}\n`;
  }

  return output;
}
