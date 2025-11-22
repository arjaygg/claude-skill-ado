#!/usr/bin/env node
/**
 * UNIFIED Team Performance Analyzer Skill
 *
 * Orchestrates complete workflow:
 * 1. Collects work item history from Azure DevOps (if needed)
 * 2. Analyzes team performance metrics
 * 3. Generates reports and insights
 *
 * This is the single entry point for all team performance analysis
 */

import fs from 'fs';
import path from 'path';
import { parseTeamMembers, parseAnalysisConfig } from '../../shared/utils/toon-parser.js';
import { loadWorkItems } from './utils/data-loader.js';
import { loadWorkItemHistory, hasHistoryData, getDefaultHistoryPath } from './utils/history-loader.js';
import { collectWorkItemHistory, hasHistoryData as hasHistoryCollectorData, getHistoryDataPath } from './utils/history-collector.js';
import { analyzeTeamPerformance } from './analyze-team-performance.js';
import { AnalysisOptions } from './types.js';

/**
 * Unified Team Performance Analysis Workflow
 */
async function runUnifiedAnalysis() {
  console.log('='.repeat(70));
  console.log('  UNIFIED TEAM PERFORMANCE ANALYZER');
  console.log('  Combining data collection and analysis');
  console.log('='.repeat(70));
  console.log();

  try {
    // Determine configuration
    console.log('📋 Loading configuration...\n');

    const teamMembersFile = process.env.TEAM_MEMBERS_TOON ||
                            (fs.existsSync('team_members.toon') ? 'team_members.toon' :
                             process.argv[2] || 'team_members.toon');

    const configFile = process.env.ANALYSIS_CONFIG_TOON ||
                       (fs.existsSync('analysis_config.toon') ? 'analysis_config.toon' :
                        process.argv[3] || 'analysis_config.toon');

    // Load configuration
    if (!fs.existsSync(configFile)) {
      throw new Error(`Configuration file not found: ${configFile}`);
    }

    const config = parseAnalysisConfig(configFile);
    const teamMembers = parseTeamMembers(teamMembersFile);

    console.log(`   ✓ Configuration loaded from: ${configFile}`);
    console.log(`   ✓ Team members loaded: ${teamMembers.length} members`);
    console.log(`   ✓ Data file: ${config.dataFile}`);
    console.log(`   ✓ Analysis period: ${config.dateRangeStart} to ${config.dateRangeEnd}`);
    console.log();

    // Check if work items data exists
    if (!fs.existsSync(config.dataFile)) {
      throw new Error(`Work items data file not found: ${config.dataFile}`);
    }

    const workItems = loadWorkItems(config.dataFile);
    const workItemIds = workItems.map((wi: any) => wi.id);

    console.log(`   📂 Loaded ${workItemIds.length} work items from data file`);
    console.log();

    // Determine history file path
    const outputDir = config.outputDir || path.dirname(config.dataFile);
    const historyDir = path.join(outputDir, 'history_detailed');
    const historyFile = getHistoryDataPath(historyDir);

    // Check if history data needs to be collected
    const historyExists = hasHistoryData(historyFile);

    if (!historyExists) {
      console.log('⚠️  Work item history not found');
      console.log(`   Expected: ${historyFile}`);
      console.log();
      console.log('🔄 AUTOMATIC COLLECTION PHASE');
      console.log('   Fetching work item history from Azure DevOps...');
      console.log();

      try {
        // Collect history automatically
        await collectWorkItemHistory({
          workItemIds,
          outputDir: historyDir,
          teamMembersFile,
          focusMonths: config.focusMonths,
          rateLimit: {
            progressInterval: config.rateLimit?.progressInterval || 20,
            delayInterval: config.rateLimit?.delayInterval || 50,
            delayMs: config.rateLimit?.delayMs || 500
          },
          verbose: true
        });

        console.log('✓ History collection complete\n');
      } catch (error) {
        console.warn('⚠️  History collection failed - proceeding with analysis only');
        console.warn(`   Error: ${error}`);
        console.log();
      }
    } else {
      console.log('✓ Work item history found - using existing data');
      console.log();
    }

    // Run analysis
    console.log('📊 ANALYSIS PHASE');
    console.log('   Running team performance metrics...');
    console.log();

    const analysisOptions: AnalysisOptions = {
      workItemsFile: config.dataFile,
      teamMembersFile,
      configFile,
      historyFile: hasHistoryData(historyFile) ? historyFile : undefined,
      metrics: 'all'
    };

    const result = await analyzeTeamPerformance(analysisOptions);

    // Save results
    const resultsDir = path.join(outputDir, 'analysis');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const resultsFile = path.join(resultsDir, 'results.json');
    fs.writeFileSync(resultsFile, JSON.stringify(result, null, 2));

    console.log();
    console.log('='.repeat(70));
    console.log('✅ UNIFIED ANALYSIS COMPLETE!');
    console.log('='.repeat(70));
    console.log();
    console.log('📊 Results saved:');
    console.log(`   JSON: ${resultsFile}`);
    console.log();
    console.log('🎯 Key Insights:');
    if (result.cycleTime) {
      console.log(`   • Cycle Time (avg): ${result.cycleTime.overall?.avg?.toFixed(1) || 'N/A'} days`);
    }
    if (result.estimationAccuracy) {
      console.log(`   • Estimation Variance: ${result.estimationAccuracy.overall?.variancePct?.toFixed(1) || 'N/A'}%`);
    }
    if (result.workItemAge) {
      console.log(`   • Aged Items (>60d): ${result.workItemAge.totalOverThreshold || 0}`);
    }
    if (result.reopenedItems) {
      console.log(`   • Rework Rate: ${(result.reopenedItems.overall?.reopenRate || 0).toFixed(1)}%`);
    }
    console.log();

  } catch (error) {
    console.error('\n❌ Error in unified analysis:');
    console.error(`   ${error}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUnifiedAnalysis();
}
