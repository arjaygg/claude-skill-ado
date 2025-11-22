/**
 * Interactive prompts for analysis configuration
 * Collects user input instead of requiring TOON config file
 */

import readline from 'readline';

export interface InteractiveConfig {
  dataFile: string;
  teamMembersFile: string;
  dateRangeStart: string;
  dateRangeEnd: string;
  metrics: string[];
  ageThresholdDays: number;
  highVarianceThresholdPct: number;
  outputDir: string;
}

/**
 * Create readline interface for user input
 */
function createReadline(): readline.Interface {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

/**
 * Prompt user for input
 */
function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Gather analysis configuration interactively
 */
export async function promptForConfig(defaults?: Partial<InteractiveConfig>): Promise<InteractiveConfig> {
  const rl = createReadline();

  console.log('\n📋 Analysis Configuration');
  console.log('='.repeat(70));
  console.log('Press Enter to use default values shown in [brackets]\n');

  try {
    // Data file location
    const dataFile = await prompt(
      rl,
      `Work items data file [${defaults?.dataFile || 'data/july_november_2025/all_work_items_july_november_2025.json'}]: `
    ) || defaults?.dataFile || 'data/july_november_2025/all_work_items_july_november_2025.json';

    // Team members file
    const teamMembersFile = await prompt(
      rl,
      `Team members file [${defaults?.teamMembersFile || 'docs/context/team_members.toon'}]: `
    ) || defaults?.teamMembersFile || 'docs/context/team_members.toon';

    // Date range
    const dateRangeStart = await prompt(
      rl,
      `Start date (YYYY-MM-DD) [${defaults?.dateRangeStart || '2025-07-01'}]: `
    ) || defaults?.dateRangeStart || '2025-07-01';

    const dateRangeEnd = await prompt(
      rl,
      `End date (YYYY-MM-DD) [${defaults?.dateRangeEnd || new Date().toISOString().split('T')[0]}]: `
    ) || defaults?.dateRangeEnd || new Date().toISOString().split('T')[0];

    // Metrics selection
    console.log('\nAvailable metrics:');
    console.log('  1. cycleTime         - Time from creation to completion');
    console.log('  2. estimationAccuracy - Estimate vs actual comparison');
    console.log('  3. workItemAge       - Age of incomplete items');
    console.log('  4. workPatterns      - Creation vs completion patterns');
    console.log('  5. stateDistribution - State tracking over time');
    console.log('  6. reopenedItems     - Rework/quality analysis');
    console.log('  all                  - Run all metrics\n');

    const metricsInput = await prompt(
      rl,
      'Metrics to run (comma-separated or "all") [all]: '
    ) || 'all';

    const metrics = metricsInput === 'all'
      ? ['cycleTime', 'estimationAccuracy', 'workItemAge', 'workPatterns', 'stateDistribution', 'reopenedItems']
      : metricsInput.split(',').map(m => m.trim());

    // Thresholds
    const ageThresholdStr = await prompt(
      rl,
      `Age threshold in days [${defaults?.ageThresholdDays || 60}]: `
    ) || String(defaults?.ageThresholdDays || 60);
    const ageThresholdDays = parseInt(ageThresholdStr);

    const varianceThresholdStr = await prompt(
      rl,
      `High variance threshold % [${defaults?.highVarianceThresholdPct || 50}]: `
    ) || String(defaults?.highVarianceThresholdPct || 50);
    const highVarianceThresholdPct = parseInt(varianceThresholdStr);

    // Output directory
    const outputDir = await prompt(
      rl,
      `Output directory [${defaults?.outputDir || 'data/analysis'}]: `
    ) || defaults?.outputDir || 'data/analysis';

    console.log('\n✓ Configuration complete!\n');

    return {
      dataFile,
      teamMembersFile,
      dateRangeStart,
      dateRangeEnd,
      metrics,
      ageThresholdDays,
      highVarianceThresholdPct,
      outputDir
    };
  } finally {
    rl.close();
  }
}

/**
 * Display configuration summary for confirmation
 */
export function displayConfigSummary(config: InteractiveConfig): void {
  console.log('Configuration Summary:');
  console.log('='.repeat(70));
  console.log(`  Data file: ${config.dataFile}`);
  console.log(`  Team members: ${config.teamMembersFile}`);
  console.log(`  Date range: ${config.dateRangeStart} to ${config.dateRangeEnd}`);
  console.log(`  Metrics: ${config.metrics.join(', ')}`);
  console.log(`  Age threshold: ${config.ageThresholdDays} days`);
  console.log(`  Variance threshold: ${config.highVarianceThresholdPct}%`);
  console.log(`  Output: ${config.outputDir}`);
  console.log('='.repeat(70));
  console.log();
}

/**
 * Confirm with user before proceeding
 */
export async function confirmProceed(): Promise<boolean> {
  const rl = createReadline();
  try {
    const answer = await prompt(rl, 'Proceed with analysis? [Y/n]: ');
    return !answer || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  } finally {
    rl.close();
  }
}
