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
import readline from 'readline';
import { parseTeamMembers, parseAnalysisConfig } from '../../shared/utils/toon-parser.js';
import { loadWorkItems } from './utils/data-loader.js';
import { loadWorkItemHistory, hasHistoryData, getDefaultHistoryPath } from './utils/history-loader.js';
import { collectWorkItemHistory, hasHistoryData as hasHistoryCollectorData, getHistoryDataPath } from './utils/history-collector.js';
import { analyzeTeamPerformance } from './analyze-team-performance.js';
import { AnalysisOptions } from './types.js';
import {
  validateAnalysisConfig,
  validateWorkItemIds,
  validateTeamMembers,
  formatValidationErrors,
} from './utils/validation.js';

/**
 * Parse CLI arguments
 */
function parseCliArgs(): { forceCollection: boolean; showHelp: boolean } {
  const args = process.argv.slice(2);
  return {
    forceCollection: args.includes('--force-collection'),
    showHelp: args.includes('--help') || args.includes('-h')
  };
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
╭──────────────────────────────────────────────────────────────────╮
│  Team Performance Analyzer - Usage Guide                          │
╰──────────────────────────────────────────────────────────────────╯

USAGE:
  npm run analyze [OPTIONS]

OPTIONS:
  --force-collection   Force re-collection of work item history from Azure DevOps
                       (skips the interactive prompt if history exists)

  --help, -h          Show this help message

EXAMPLES:
  # Standard analysis (interactive if history exists)
  npm run analyze

  # Force refresh data from Azure DevOps
  npm run analyze -- --force-collection

CONFIGURATION:
  The analyzer uses two configuration files:
  - team_members.toon      Team roster definition
  - analysis_config.toon   Analysis parameters

  Set environment variables to override file paths:
  - TEAM_MEMBERS_TOON
  - ANALYSIS_CONFIG_TOON
  - AZURE_DEVOPS_ORG (required)
  - AZURE_DEVOPS_PROJECT (required)
  - AZURE_DEVOPS_PAT (required)

WORKFLOW:
  1. Configuration loading (from files or environment)
  2. Work items data loading
  3. History collection (automatic if missing, interactive if exists + no --force-collection)
  4. Team performance analysis
  5. Results generation
`);
}

/**
 * Interactive prompt for collection decision
 */
async function promptCollectionDecision(): Promise<'use-existing' | 'recollect' | 'skip'> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    console.log('📊 Work item history already exists');
    console.log();
    console.log('What would you like to do?');
    console.log('  1. Use existing data (faster - for quick analysis)');
    console.log('  2. Re-collect from Azure DevOps (slower - for fresh/updated data)');
    console.log('  3. Skip analysis');
    console.log();

    rl.question('Enter your choice (1-3): ', (answer) => {
      rl.close();

      const choice = answer.trim().toLowerCase();
      switch (choice) {
        case '1':
        case 'use-existing':
          resolve('use-existing');
          break;
        case '2':
        case 'recollect':
          resolve('recollect');
          break;
        case '3':
        case 'skip':
          resolve('skip');
          break;
        default:
          console.log('Invalid choice. Using existing data.');
          resolve('use-existing');
      }
    });
  });
}

/**
 * Unified Team Performance Analysis Workflow
 */
async function runUnifiedAnalysis() {
  // Parse CLI arguments
  const { forceCollection, showHelp } = parseCliArgs();

  // Show help if requested
  if (showHelp) {
    showHelp();
    return;
  }

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

    // Load and validate configuration
    if (!fs.existsSync(configFile)) {
      console.error(`❌ Configuration file not found: ${configFile}`);
      console.error(`   Expected at: ${path.resolve(configFile)}`);
      process.exit(1);
    }

    const config = parseAnalysisConfig(configFile);

    // Validate configuration
    const configValidation = validateAnalysisConfig(config);
    if (!configValidation.valid) {
      console.error('❌ Configuration validation failed:');
      console.error(formatValidationErrors(configValidation.errors, ''));
      process.exit(1);
    }

    // Load and validate team members
    if (!fs.existsSync(teamMembersFile)) {
      console.error(`❌ Team members file not found: ${teamMembersFile}`);
      console.error(`   Expected at: ${path.resolve(teamMembersFile)}`);
      process.exit(1);
    }

    const teamMembers = parseTeamMembers(teamMembersFile);
    const teamMembersValidation = validateTeamMembers(teamMembers);
    if (!teamMembersValidation.valid) {
      console.error('❌ Team members validation failed:');
      console.error(formatValidationErrors(teamMembersValidation.errors, ''));
      process.exit(1);
    }

    console.log(`   ✓ Configuration loaded from: ${configFile}`);
    console.log(`   ✓ Team members loaded: ${teamMembers.length} members`);
    console.log(`   ✓ Data file: ${config.dataFile}`);
    console.log(`   ✓ Analysis period: ${config.dateRangeStart} to ${config.dateRangeEnd}`);
    console.log();

    // Load work items
    const workItems = loadWorkItems(config.dataFile);

    if (!workItems || workItems.length === 0) {
      console.error(`❌ No work items loaded from: ${config.dataFile}`);
      console.error('   Ensure the file contains a valid JSON array of work items');
      process.exit(1);
    }

    const workItemIds = workItems.map((wi: any) => wi.id);

    // Validate work item IDs
    const workItemValidation = validateWorkItemIds(workItemIds);
    if (!workItemValidation.valid) {
      console.error('❌ Work item IDs validation failed:');
      console.error(formatValidationErrors(workItemValidation.errors, ''));
      process.exit(1);
    }

    console.log(`   📂 Loaded ${workItemIds.length} work items from data file`);
    console.log();

    // Determine history file path
    const outputDir = config.outputDir || path.dirname(config.dataFile);
    const historyDir = path.join(outputDir, 'history_detailed');
    const historyFile = getHistoryDataPath(historyDir);

    // Check if history data needs to be collected
    let historyExists = hasHistoryData(historyFile);
    let shouldSkipAnalysis = false;

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
        historyExists = true;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('⚠️  History collection failed - proceeding with analysis only');
        console.warn(`   Error: ${errorMessage}`);
        if (error instanceof Error && error.stack) {
          console.debug(`   Stack: ${error.stack}`);
        }
        console.log();
      }
    } else {
      // History exists - decide whether to use, recollect, or skip
      console.log('✓ Work item history found');
      console.log();

      if (forceCollection) {
        // CLI flag provided - force recollection without prompt
        console.log('🔄 FORCE RECOLLECTION MODE (--force-collection)');
        console.log('   Re-fetching work item history from Azure DevOps...');
        console.log();

        try {
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

          console.log('✓ History recollection complete\n');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn('⚠️  History recollection failed - using existing data');
          console.warn(`   Error: ${errorMessage}`);
          if (error instanceof Error && error.stack) {
            console.debug(`   Stack: ${error.stack}`);
          }
          console.log();
        }
      } else {
        // Interactive mode - ask user
        console.log();
        const userChoice = await promptCollectionDecision();
        console.log();

        if (userChoice === 'recollect') {
          console.log('🔄 INTERACTIVE RECOLLECTION MODE');
          console.log('   Re-fetching work item history from Azure DevOps...');
          console.log();

          try {
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

            console.log('✓ History recollection complete\n');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.warn('⚠️  History recollection failed - using existing data');
            console.warn(`   Error: ${errorMessage}`);
            if (error instanceof Error && error.stack) {
              console.debug(`   Stack: ${error.stack}`);
            }
            console.log();
          }
        } else if (userChoice === 'skip') {
          console.log('⏭️  Skipping analysis');
          console.log();
          shouldSkipAnalysis = true;
        } else {
          // use-existing
          console.log('✓ Using existing work item history data');
          console.log();
        }
      }
    }

    // Skip analysis if user requested
    if (shouldSkipAnalysis) {
      console.log('Exiting...\n');
      return;
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

    if (error instanceof Error) {
      console.error(`   Message: ${error.message}`);

      // Provide contextual help based on error type
      if (error.message.includes('ENOENT') || error.message.includes('not found')) {
        console.error('   Hint: Check that all required files exist (config, team members, data file)');
      } else if (
        error.message.includes('EACCES') ||
        error.message.includes('permission')
      ) {
        console.error(
          '   Hint: Check file permissions (read for input files, write for output directory)'
        );
      } else if (error.message.includes('JSON')) {
        console.error('   Hint: Check that data files contain valid JSON');
      } else if (
        error.message.includes('AZURE_DEVOPS') ||
        error.message.includes('ADO')
      ) {
        console.error(
          '   Hint: Check Azure DevOps credentials (AZURE_DEVOPS_ORG, AZURE_DEVOPS_PAT)'
        );
      }

      if (error.stack) {
        console.debug(`\n   Full stack trace:\n${error.stack}`);
      }
    } else {
      console.error(`   ${String(error)}`);
    }

    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runUnifiedAnalysis();
}
