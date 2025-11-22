#!/usr/bin/env node
/**
 * Main Team Performance Analysis Script
 * Orchestrates all metric analyses with TOON configuration support
 */

import fs from 'fs';
import path from 'path';
import { parseTeamMembers, parseAnalysisConfig } from '../../../shared/utils/toon-parser.js';
import { loadWorkItems } from './utils/data-loader.js';
import { loadWorkItemHistory, hasHistoryData, getDefaultHistoryPath } from './utils/history-loader.js';
import { analyzeCycleTime, cycleTimeToToon } from './metrics/cycle-time.js';
import { analyzeEstimationAccuracy, estimationToToon } from './metrics/estimation-accuracy.js';
import { analyzeWorkItemAge, workItemAgeToToon } from './metrics/work-item-age.js';
import { analyzeWorkPatterns, workPatternsToToon } from './metrics/work-patterns.js';
import { analyzeStateDistribution, stateDistributionToToon } from './metrics/state-distribution.js';
import { analyzeReopenedItems, reopenedItemsToToon } from './metrics/reopened-items.js';
// Deep metrics (require history data)
import { analyzeTimeInState, timeInStateToToon } from './metrics/time-in-state.js';
import { analyzeDailyWip, dailyWipToToon } from './metrics/daily-wip.js';
import { analyzeFlowEfficiency, flowEfficiencyToToon } from './metrics/flow-efficiency.js';
import { analyzeSprintMetrics, sprintAnalysisToToon } from './metrics/sprint-analysis.js';
import { AnalysisOptions, AnalysisResult } from './types.js';

/**
 * Run complete team performance analysis
 */
export async function analyzeTeamPerformance(options: AnalysisOptions): Promise<AnalysisResult> {
  console.log('='.repeat(70));
  console.log('  TEAM PERFORMANCE ANALYSIS');
  console.log('='.repeat(70));
  console.log();

  // Load configuration
  console.log('📋 Loading configuration...');
  const teamMembers = parseTeamMembers(options.teamMembersFile);
  const config = parseAnalysisConfig(options.configFile);
  console.log(`   ✓ Loaded ${teamMembers.length} team members`);
  console.log(`   ✓ Configuration loaded from ${options.configFile}`);
  console.log();

  // Load work items
  console.log('📂 Loading work item data...');
  const workItems = loadWorkItems(options.workItemsFile);
  console.log(`   ✓ Loaded ${workItems.length} work items`);
  console.log();

  // Load work item history (for deep metrics)
  const historyFile = options.historyFile || getDefaultHistoryPath(options.workItemsFile);
  const historyAvailable = hasHistoryData(historyFile);
  let workItemHistory: any[] = [];

  if (historyAvailable) {
    console.log('📜 Loading work item history...');
    workItemHistory = loadWorkItemHistory(historyFile);
    console.log(`   ✓ Loaded ${workItemHistory.length} update records`);
    console.log('   ✓ Deep metrics enabled (time-in-state, daily-wip, flow-efficiency)');
    console.log();
  } else {
    console.log('ℹ️  No work item history found - deep metrics will be skipped');
    console.log(`   Expected: ${historyFile}`);
    console.log('   To enable: Run fetch-work-item-history.ts from azure-devops-batch skill');
    console.log();
  }

  // Determine which metrics to run
  const baseMetrics = ['cycleTime', 'estimationAccuracy', 'workItemAge', 'workPatterns', 'stateDistribution', 'reopenedItems'];
  const deepMetrics = historyAvailable
    ? ['timeInState', 'dailyWip', 'flowEfficiency', 'sprintAnalysis']
    : [];

  const metricsToRun = options.metrics === 'all' || !options.metrics
    ? [...baseMetrics, ...deepMetrics]
    : options.metrics;

  console.log(`🔍 Running metrics: ${metricsToRun.join(', ')}`);
  console.log();

  // Initialize result
  const result: AnalysisResult = {
    metadata: {
      analyzedAt: new Date().toISOString(),
      dataSource: options.workItemsFile,
      teamMembersCount: teamMembers.length,
      workItemsCount: workItems.length,
      dateRange: {
        start: config.dateRangeStart,
        end: config.dateRangeEnd
      },
      historyDataAvailable: historyAvailable
    }
  };

  // Run cycle time analysis
  if (metricsToRun.includes('cycleTime') || metricsToRun.includes('cycle_time')) {
    console.log('📏 METRIC 1: Cycle Time Analysis');
    console.log('-'.repeat(70));
    const cycleTimeResult = analyzeCycleTime(workItems, teamMembers);
    result.cycleTime = cycleTimeResult;

    console.log('\n   By Team Member:');
    for (const [member, data] of Object.entries(cycleTimeResult.byMember)) {
      console.log(`      ${member.padEnd(30)} | Avg: ${data.avg.toFixed(1)} days | Median: ${data.median.toFixed(1)} days | Count: ${data.count}`);
    }
    console.log();
  }

  // Run estimation accuracy analysis
  if (metricsToRun.includes('estimationAccuracy') || metricsToRun.includes('estimation_accuracy')) {
    console.log('📊 METRIC 2: Estimation Accuracy Analysis');
    console.log('-'.repeat(70));
    const estimationResult = analyzeEstimationAccuracy(
      workItems,
      teamMembers,
      config.highVarianceThresholdPct
    );
    result.estimationAccuracy = estimationResult;

    console.log('\n   By Team Member:');
    for (const [member, data] of Object.entries(estimationResult.byMember)) {
      console.log(`\n      ${member}:`);
      console.log(`         Total Estimate: ${data.totalEstimate.toFixed(1)}h | Total Actual: ${data.totalActual.toFixed(1)}h`);
      console.log(`         Variance: ${data.variancePct > 0 ? '+' : ''}${data.variancePct.toFixed(1)}%`);
      console.log(`         Items: ${data.itemCount} | High variance items: ${data.highVarianceItems}`);
    }
    console.log();
  }

  // Run work item age analysis
  if (metricsToRun.includes('workItemAge') || metricsToRun.includes('work_item_age')) {
    console.log('⏰ METRIC 3: Work Item Age Analysis');
    console.log('-'.repeat(70));
    const ageResult = analyzeWorkItemAge(workItems, teamMembers, config.ageThresholdDays);
    result.workItemAge = ageResult;

    console.log('\n   By Team Member:');
    for (const [member, data] of Object.entries(ageResult.byMember)) {
      console.log(`      ${member.padEnd(30)} | Incomplete: ${data.count} | Avg age: ${data.avgAgeDays.toFixed(1)} days | Max: ${data.maxAgeDays} days | Over threshold: ${data.itemsOverThreshold}`);
    }
    console.log();
  }

  // Run work patterns analysis
  if (metricsToRun.includes('workPatterns') || metricsToRun.includes('work_patterns')) {
    console.log('📈 METRIC 4: Work Patterns Analysis');
    console.log('-'.repeat(70));
    const patternsResult = analyzeWorkPatterns(workItems);
    result.workPatterns = patternsResult;

    console.log('\n   Creation vs Completion by Month:');
    for (const [month, data] of Object.entries(patternsResult.creationVsCompletion).sort()) {
      const deltaStr = data.delta > 0 ? `+${data.delta}` : `${data.delta}`;
      console.log(`      ${month} | Created: ${data.created} | Completed: ${data.completed} | Delta: ${deltaStr}`);
    }

    console.log('\n   Size Distribution:');
    for (const [size, count] of Object.entries(patternsResult.sizeDistribution)) {
      const pct = (count / workItems.length) * 100;
      console.log(`      ${size.padEnd(20)} | ${count} (${pct.toFixed(1)}%)`);
    }
    console.log();
  }

  // Run state distribution analysis
  if (metricsToRun.includes('stateDistribution') || metricsToRun.includes('state_distribution')) {
    console.log('🔄 METRIC 5: State Distribution Analysis');
    console.log('-'.repeat(70));
    const stateResult = analyzeStateDistribution(workItems, teamMembers);
    result.stateDistribution = stateResult;

    console.log('\n   By Team Member:');
    for (const [member, states] of Object.entries(stateResult.byMember)) {
      const total = Object.values(states).reduce((sum: number, count) => sum + count, 0);
      const done = ((states['Done'] || 0) + (states['5 - Done'] || 0) + (states['Closed'] || 0));
      const inProgress = states['In Progress'] || 0;
      console.log(`      ${member.padEnd(30)} | Total: ${total} | Done: ${done} | In Progress: ${inProgress}`);
    }
    console.log();
  }

  // Run reopened items analysis
  if (metricsToRun.includes('reopenedItems') || metricsToRun.includes('reopened_items')) {
    console.log('🔁 METRIC 6: Reopened Items Analysis');
    console.log('-'.repeat(70));
    const reopenedResult = analyzeReopenedItems(workItems);
    result.reopenedItems = reopenedResult;

    console.log(`\n   Rework Items: ${reopenedResult.reworkCount}`);
    console.log(`   Rework Rate: ${reopenedResult.reworkRatePct.toFixed(2)}%`);
    if (reopenedResult.items.length > 0) {
      console.log('\n   Sample Rework Items:');
      for (const item of reopenedResult.items.slice(0, 5)) {
        console.log(`      WI #${item.id} | ${item.assignedTo} | ${item.state} | ${item.reason}`);
      }
    }
    console.log();
  }

  // ==================== DEEP METRICS (Require History Data) ====================
  if (historyAvailable && workItemHistory.length > 0) {
    console.log('='.repeat(70));
    console.log('  DEEP METRICS (History-Based Analysis)');
    console.log('='.repeat(70));
    console.log();

    // Run time-in-state analysis
    if (metricsToRun.includes('timeInState') || metricsToRun.includes('time_in_state')) {
      console.log('⏱️  DEEP METRIC 1: Time-in-State Breakdown');
      console.log('-'.repeat(70));
      const timeInStateResult = analyzeTimeInState(workItems, workItemHistory, teamMembers);
      result.timeInState = timeInStateResult;

      console.log('\n   By Team Member (Bottleneck States):');
      for (const [member, data] of Object.entries(timeInStateResult.byMember)) {
        console.log(`      ${member.padEnd(30)} | Bottleneck: ${data.bottleneckState} (${data.bottleneckAvgDays.toFixed(1)} days avg) | Items: ${data.totalItems}`);
      }

      console.log(`\n   Overall Common Bottleneck: ${timeInStateResult.overall.commonBottleneck}`);
      console.log(`   Items Analyzed: ${timeInStateResult.overall.itemsAnalyzed}`);
      console.log();
    }

    // Run daily WIP analysis
    if (metricsToRun.includes('dailyWip') || metricsToRun.includes('daily_wip')) {
      console.log('📊 DEEP METRIC 2: Daily WIP (Context Switching Load)');
      console.log('-'.repeat(70));
      const dailyWipResult = analyzeDailyWip(
        workItems,
        workItemHistory,
        teamMembers,
        config.dateRangeStart,
        config.dateRangeEnd
      );
      result.dailyWip = dailyWipResult;

      console.log('\n   By Team Member:');
      for (const [member, data] of Object.entries(dailyWipResult.byMember)) {
        console.log(`      ${member.padEnd(30)} | Avg WIP: ${data.avgWip.toFixed(1)} | Max: ${data.maxWip} (${data.maxWipDate}) | Days >3: ${data.daysOver3} | Days >5: ${data.daysOver5}`);
      }

      console.log(`\n   Peak Team WIP: ${dailyWipResult.overallStats.peakWipCount} items on ${dailyWipResult.overallStats.peakWipDate}`);
      console.log(`   High Concurrency Days (avg >3): ${dailyWipResult.overallStats.highConcurrencyDays}`);
      console.log();
    }

    // Run flow efficiency analysis
    if (metricsToRun.includes('flowEfficiency') || metricsToRun.includes('flow_efficiency')) {
      console.log('⚡ DEEP METRIC 3: Flow Efficiency (Active vs Wait Time)');
      console.log('-'.repeat(70));
      const flowEffResult = analyzeFlowEfficiency(workItems, workItemHistory, teamMembers);
      result.flowEfficiency = flowEffResult;

      console.log('\n   By Team Member:');
      for (const [member, data] of Object.entries(flowEffResult.byMember)) {
        console.log(`      ${member.padEnd(30)} | Efficiency: ${data.avgEfficiencyPct.toFixed(1)}% (${data.efficiencyRating}) | Active: ${data.avgActiveTime.toFixed(1)}d | Wait: ${data.avgWaitTime.toFixed(1)}d`);
      }

      console.log(`\n   Overall Efficiency: ${flowEffResult.overall.avgEfficiencyPct.toFixed(1)}%`);
      console.log(`   Distribution: Excellent (${flowEffResult.overall.excellentCount}) | Good (${flowEffResult.overall.goodCount}) | Fair (${flowEffResult.overall.fairCount}) | Poor (${flowEffResult.overall.poorCount})`);
      console.log();
    }

    // Run sprint analysis
    if (metricsToRun.includes('sprintAnalysis') || metricsToRun.includes('sprint_analysis')) {
      console.log('🏃 DEEP METRIC 4: Sprint/Iteration Analysis');
      console.log('-'.repeat(70));
      const sprintResult = analyzeSprintMetrics(workItems, workItemHistory, teamMembers);
      result.sprintAnalysis = sprintResult;

      console.log('\n   By Sprint:');
      for (const [sprint, data] of Object.entries(sprintResult.bySprint).sort().slice(-5)) {
        console.log(`      ${sprint.padEnd(20)} | Items: ${data.totalItems} | Completed: ${data.completedItems} (${data.completionRate.toFixed(1)}%) | Unplanned: ${data.unplannedRatio.toFixed(1)}%`);
      }

      console.log(`\n   Overall: Avg Velocity: ${sprintResult.overall.avgVelocity.toFixed(1)} | Completion: ${sprintResult.overall.avgCompletionRate.toFixed(1)}% | Trend: ${sprintResult.overall.velocityTrend}`);
      console.log();
    }

    console.log('='.repeat(70));
    console.log();
  }

  // Save results
  console.log('💾 Saving results...');
  const outputFormat = options.outputFormat || 'both';
  const outputDir = config.outputDir;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON
  if (outputFormat === 'json' || outputFormat === 'both') {
    const jsonPath = path.join(outputDir, 'analysis_results.json');
    fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`   ✓ JSON saved to: ${jsonPath}`);
  }

  // Save TOON summaries
  if (outputFormat === 'toon' || outputFormat === 'both') {
    if (result.cycleTime) {
      const toonPath = path.join(outputDir, 'cycle_time_summary.toon');
      fs.writeFileSync(toonPath, cycleTimeToToon(result.cycleTime));
      console.log(`   ✓ Cycle time TOON saved to: ${toonPath}`);
    }

    if (result.estimationAccuracy) {
      const toonPath = path.join(outputDir, 'estimation_accuracy_summary.toon');
      fs.writeFileSync(toonPath, estimationToToon(result.estimationAccuracy));
      console.log(`   ✓ Estimation TOON saved to: ${toonPath}`);
    }

    if (result.workItemAge) {
      const toonPath = path.join(outputDir, 'work_item_age_summary.toon');
      fs.writeFileSync(toonPath, workItemAgeToToon(result.workItemAge));
      console.log(`   ✓ Work item age TOON saved to: ${toonPath}`);
    }

    if (result.workPatterns) {
      const toonPath = path.join(outputDir, 'work_patterns_summary.toon');
      fs.writeFileSync(toonPath, workPatternsToToon(result.workPatterns));
      console.log(`   ✓ Work patterns TOON saved to: ${toonPath}`);
    }

    if (result.stateDistribution) {
      const toonPath = path.join(outputDir, 'state_distribution_summary.toon');
      fs.writeFileSync(toonPath, stateDistributionToToon(result.stateDistribution));
      console.log(`   ✓ State distribution TOON saved to: ${toonPath}`);
    }

    if (result.reopenedItems) {
      const toonPath = path.join(outputDir, 'reopened_items_summary.toon');
      fs.writeFileSync(toonPath, reopenedItemsToToon(result.reopenedItems));
      console.log(`   ✓ Reopened items TOON saved to: ${toonPath}`);
    }

    // Deep metrics TOON outputs
    if (result.timeInState) {
      const toonPath = path.join(outputDir, 'time_in_state_summary.toon');
      fs.writeFileSync(toonPath, timeInStateToToon(result.timeInState));
      console.log(`   ✓ Time-in-state TOON saved to: ${toonPath}`);
    }

    if (result.dailyWip) {
      const toonPath = path.join(outputDir, 'daily_wip_summary.toon');
      fs.writeFileSync(toonPath, dailyWipToToon(result.dailyWip));
      console.log(`   ✓ Daily WIP TOON saved to: ${toonPath}`);
    }

    if (result.flowEfficiency) {
      const toonPath = path.join(outputDir, 'flow_efficiency_summary.toon');
      fs.writeFileSync(toonPath, flowEfficiencyToToon(result.flowEfficiency));
      console.log(`   ✓ Flow efficiency TOON saved to: ${toonPath}`);
    }

    if (result.sprintAnalysis) {
      const toonPath = path.join(outputDir, 'sprint_analysis_summary.toon');
      fs.writeFileSync(toonPath, sprintAnalysisToToon(result.sprintAnalysis));
      console.log(`   ✓ Sprint analysis TOON saved to: ${toonPath}`);
    }
  }

  console.log();
  console.log('='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log();

  return result;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  const options: AnalysisOptions = {
    teamMembersFile: args[0] || 'docs/context/team_members.toon',
    configFile: args[1] || 'analysis_config.toon',
    workItemsFile: args[2] || 'data/july_november_2025/all_work_items_july_november_2025.json',
    metrics: 'all',
    outputFormat: 'both'
  };

  analyzeTeamPerformance(options)
    .then(() => {
      console.log('Analysis completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Analysis failed:', error);
      process.exit(1);
    });
}
