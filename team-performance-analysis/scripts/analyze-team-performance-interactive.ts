#!/usr/bin/env node
/**
 * Interactive Team Performance Analysis Script
 * Prompts for configuration instead of requiring TOON config file
 */

import fs from 'fs';
import path from 'path';
import { parseTeamMembers, parseAnalysisConfig } from '../../../shared/utils/toon-parser.js';
import { loadWorkItems } from './utils/data-loader.js';
import { analyzeCycleTime, cycleTimeToToon } from './metrics/cycle-time.js';
import { analyzeEstimationAccuracy, estimationToToon } from './metrics/estimation-accuracy.js';
import { analyzeWorkItemAge, workItemAgeToToon } from './metrics/work-item-age.js';
import { analyzeWorkPatterns, workPatternsToToon } from './metrics/work-patterns.js';
import { analyzeStateDistribution, stateDistributionToToon } from './metrics/state-distribution.js';
import { analyzeReopenedItems, reopenedItemsToToon } from './metrics/reopened-items.js';
import { AnalysisResult } from './types.js';
import {
  promptForConfig,
  displayConfigSummary,
  confirmProceed,
  InteractiveConfig
} from './utils/interactive-prompts.js';

/**
 * Run analysis with interactive configuration
 */
async function runInteractiveAnalysis() {
  console.log('='.repeat(70));
  console.log('  TEAM PERFORMANCE ANALYSIS - Interactive Mode');
  console.log('='.repeat(70));
  console.log();

  // Check if config file exists for defaults
  let defaults: Partial<InteractiveConfig> | undefined;
  const configFile = 'analysis_config.toon';

  if (fs.existsSync(configFile)) {
    console.log(`ℹ️  Found ${configFile} - using as defaults\n`);
    try {
      const toonConfig = parseAnalysisConfig(configFile);
      defaults = {
        dataFile: toonConfig.dataDir ? `${toonConfig.dataDir}/all_work_items_july_november_2025.json` : undefined,
        dateRangeStart: toonConfig.dateRangeStart,
        dateRangeEnd: toonConfig.dateRangeEnd,
        ageThresholdDays: toonConfig.ageThresholdDays,
        highVarianceThresholdPct: toonConfig.highVarianceThresholdPct,
        outputDir: toonConfig.outputDir
      };
    } catch (error) {
      console.log(`⚠️  Could not parse ${configFile}, using built-in defaults\n`);
    }
  }

  // Prompt for configuration
  const config = await promptForConfig(defaults);

  // Display summary
  displayConfigSummary(config);

  // Confirm before proceeding
  const proceed = await confirmProceed();
  if (!proceed) {
    console.log('Analysis cancelled.');
    process.exit(0);
  }

  console.log('\n' + '='.repeat(70));
  console.log('  STARTING ANALYSIS');
  console.log('='.repeat(70));
  console.log();

  // Load configuration
  console.log('📋 Loading team members...');
  const teamMembers = parseTeamMembers(config.teamMembersFile);
  console.log(`   ✓ Loaded ${teamMembers.length} team members`);
  console.log();

  // Load work items
  console.log('📂 Loading work item data...');
  const workItems = loadWorkItems(config.dataFile);
  console.log(`   ✓ Loaded ${workItems.length} work items`);
  console.log();

  console.log(`🔍 Running metrics: ${config.metrics.join(', ')}`);
  console.log();

  // Initialize result
  const result: AnalysisResult = {
    metadata: {
      analyzedAt: new Date().toISOString(),
      dataSource: config.dataFile,
      teamMembersCount: teamMembers.length,
      workItemsCount: workItems.length,
      dateRange: {
        start: config.dateRangeStart,
        end: config.dateRangeEnd
      }
    }
  };

  // Run metrics based on configuration
  if (config.metrics.includes('cycleTime')) {
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

  if (config.metrics.includes('estimationAccuracy')) {
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

  if (config.metrics.includes('workItemAge')) {
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

  if (config.metrics.includes('workPatterns')) {
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

  if (config.metrics.includes('stateDistribution')) {
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

  if (config.metrics.includes('reopenedItems')) {
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

  // Save results
  console.log('💾 Saving results...');
  const outputDir = config.outputDir;

  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Save JSON
  const jsonPath = path.join(outputDir, 'analysis_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));
  console.log(`   ✓ JSON saved to: ${jsonPath}`);

  // Save TOON summaries
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

  console.log();
  console.log('='.repeat(70));
  console.log('✅ ANALYSIS COMPLETE');
  console.log('='.repeat(70));
  console.log();
}

// Run interactive analysis
runInteractiveAnalysis()
  .then(() => {
    console.log('Analysis completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
  });
