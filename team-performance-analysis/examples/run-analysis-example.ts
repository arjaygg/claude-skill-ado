#!/usr/bin/env node
/**
 * Example: Run full team performance analysis
 *
 * Usage:
 *   npx tsx examples/run-analysis-example.ts
 */

import { analyzeTeamPerformance } from '../analyze-team-performance.js';

// Run analysis with example configuration
analyzeTeamPerformance({
  teamMembersFile: 'docs/context/team_members.toon',
  configFile: 'examples/analysis_config.toon',
  workItemsFile: 'data/july_november_2025/all_work_items_july_november_2025.json',
  metrics: 'all',
  outputFormat: 'both'
})
  .then(result => {
    console.log('\n📊 Analysis Summary:');
    console.log(`   Work Items Analyzed: ${result.metadata.workItemsCount}`);
    console.log(`   Team Members: ${result.metadata.teamMembersCount}`);
    console.log(`   Date Range: ${result.metadata.dateRange.start} to ${result.metadata.dateRange.end}`);

    if (result.cycleTime) {
      const memberCount = Object.keys(result.cycleTime.byMember).length;
      console.log(`   ✓ Cycle time calculated for ${memberCount} members`);
    }

    if (result.estimationAccuracy) {
      const memberCount = Object.keys(result.estimationAccuracy.byMember).length;
      console.log(`   ✓ Estimation accuracy calculated for ${memberCount} members`);
    }
  })
  .catch(error => {
    console.error('❌ Error:', error.message);
    process.exit(1);
  });
