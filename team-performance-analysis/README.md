# Team Performance Analyzer - Unified Skill

Automatically collect Azure DevOps work item history and generate comprehensive team performance metrics in one unified workflow.

## Features

- **Automatic Data Collection**: Fetches work item history from Azure DevOps on demand
- **Smart Detection**: Checks if history exists, fetches if needed
- **Configuration-Driven**: Uses TOON format for all parameters
- **No Hardcoding**: All values from config files or environment variables
- **Comprehensive Metrics**: Cycle time, estimation accuracy, work item age, patterns, state distribution, rework rates
- **Deep Analytics**: Time-in-state, daily WIP, flow efficiency, sprint analysis
- **Team Insights**: Member comparison, bottleneck detection, workload distribution
- **Multiple Outputs**: JSON (structured), TOON (LLM-friendly), console (real-time)

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Create Configuration Files

**team_members.toon** - Define your team:
```toon
[N]{display_name,ado_identity,email,status,role}:
  Jude Marco Bayot,Jude Marco Bayot <JudeMarco.Bayot@ph.axos.com>,JudeMarco.Bayot@ph.axos.com,active,developer
  Christopher Reyes,Christopher Reyes <Christopher.Reyes@ph.axos.com>,Christopher.Reyes@ph.axos.com,active,developer
```

**analysis_config.toon** - Configure analysis:
```toon
[1]{key,value}:
  data_file,data/work_items.json
  output_dir,data/analysis
  team_members_file,team_members.toon
  date_range_start,2025-07-01
  date_range_end,2025-11-21
  metrics,all
```

Copy examples:
```bash
cp analysis_config.toon.example analysis_config.toon
# Edit analysis_config.toon with your settings
```

### 3. Set Azure DevOps Credentials

```bash
export AZURE_DEVOPS_ORG="your-organization"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

### 4. Prepare Work Item Data

You need a JSON file with work items. This can be:
- Generated from Azure DevOps API directly
- Exported from other tools
- Created from your own data source

The file should contain an array of work items with ADO schema.

### 5. Run Unified Analysis

```bash
cd scripts
npm run analyze
```

This automatically:
1. ✅ Detects if work item history needs fetching
2. ✅ Fetches all work item updates from Azure DevOps (if needed)
3. ✅ Analyzes collected data
4. ✅ Calculates all metrics
5. ✅ Generates reports

## Configuration Details

### analysis_config.toon Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `data_file` | Yes | Path to work items JSON file |
| `output_dir` | Yes | Directory for analysis results |
| `team_members_file` | No | Path to team_members.toon |
| `date_range_start` | No | Analysis start date (YYYY-MM-DD) |
| `date_range_end` | No | Analysis end date (YYYY-MM-DD) |
| `focus_months` | No | Specific months to focus on (comma-separated) |
| `metrics` | No | Which metrics to run (comma-separated or "all") |
| `age_threshold_days` | No | Days threshold for "aged" items (default: 60) |
| `high_variance_threshold_pct` | No | % threshold for high variance (default: 50) |
| `rate_limit_progress_interval` | No | Progress update frequency (default: 20) |
| `rate_limit_delay_interval` | No | Delay interval (default: 50) |
| `rate_limit_delay_ms` | No | Delay in milliseconds (default: 500) |

## Available Metrics

### Base Metrics (always available)
- **cycleTime** - Time from creation to completion
- **estimationAccuracy** - Estimated vs actual comparison
- **workItemAge** - Age of incomplete items
- **workPatterns** - Creation vs completion trends
- **stateDistribution** - Work item states over time
- **reopenedItems** - Rework and quality analysis

### Deep Metrics (require history data, automatic)
- **timeInState** - Time spent in each state
- **dailyWip** - Daily work-in-progress tracking
- **flowEfficiency** - Active vs total time ratio
- **sprintAnalysis** - Sprint-level metrics

## Output

### JSON Results
Saved to `output_dir/analysis/results.json` with:
- Metadata (date range, team size, item count)
- All calculated metrics
- By-member breakdown
- Trends and patterns

### TOON Summary
Saved to `output_dir/analysis/results.toon` for LLM consumption

### Console Output
Real-time progress and key findings:
```
📏 METRIC 1: Cycle Time Analysis
   John Doe (30 items) | Avg: 12.5 days | Median: 10.0 days
   Jane Smith (25 items) | Avg: 14.2 days | Median: 12.0 days
```

## How It Works

### Phase 1: Automatic Collection (if needed)
```
Check if history exists
  ↓
No? → Fetch from Azure DevOps
  ↓
Analyze patterns:
  - Assignment changes
  - State transitions
  - Estimation changes
  - Sprint movements
  ↓
Save change_analysis.json
```

### Phase 2: Analysis
```
Load work items + history
  ↓
Calculate metrics:
  - Cycle times
  - Estimations
  - Age analysis
  - Patterns
  - State distributions
  - Rework rates
  ↓
Generate insights
```

### Phase 3: Results
```
Output JSON + TOON
Display console summary
```

## Advanced Usage

### Legacy Interactive Mode
```bash
npm run analyze:legacy-interactive
```

### Legacy File-Based Mode
```bash
npm run analyze:legacy-file
```

### Individual Metrics
```bash
# Run specific metric only
npm run analyze:cycle-time
npm run analyze:estimation
npm run analyze:age
npm run analyze:patterns
npm run analyze:states
npm run analyze:rework
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `AZURE_DEVOPS_ORG` | Yes | ADO organization name |
| `AZURE_DEVOPS_PROJECT` | Yes | ADO project name |
| `AZURE_DEVOPS_PAT` | Yes | Personal Access Token |
| `TEAM_MEMBERS_TOON` | No | Override team_members.toon path |
| `ANALYSIS_CONFIG_TOON` | No | Override analysis_config.toon path |
| `TEAM_NAME` | No | Team name for display (default: "Team") |

## Troubleshooting

### "History not found"
This is expected on first run. The skill will automatically fetch it.

### "Unauthorized" Error
- Verify `AZURE_DEVOPS_PAT` is set correctly
- Check PAT has "Work Items" Read permissions
- Generate new PAT at: `https://dev.azure.com/<org>/_usersSettings/tokens`

### "Rate limit exceeded"
- Increase `rate_limit_delay_ms` in analysis_config.toon
- Decrease `rate_limit_delay_interval`

### "Data file not found"
- Verify `data_file` path in analysis_config.toon
- Ensure file exists at specified location

### "Team members file not found"
- Verify `team_members_file` path in analysis_config.toon
- Create file if it doesn't exist

## Example Workflows

### Quarterly Performance Review
```bash
# Edit analysis_config.toon
date_range_start,2025-10-01
date_range_end,2025-12-31

# Run analysis
npm run analyze

# Review results.json
```

### Compare Team Members
```bash
# All team members will be in metrics
# Review cycleTime.byMember for comparison
# Check estimationAccuracy.byMember for accuracy

jq '.cycleTime.byMember' data/analysis/results.json
```

### Identify Bottlenecks
```bash
# Review timeInState or stateDistribution
# Find states where work gets stuck

jq '.timeInState.byMember' data/analysis/results.json
```

## Data Privacy

This skill:
- ✅ Only fetches data you're authorized to access
- ✅ Stores data locally on your machine
- ✅ Does NOT upload data anywhere
- ✅ Respects Azure DevOps permissions

## Requirements

- Node.js 18+
- npm
- Azure DevOps organization access
- Personal Access Token with "Work Items" permissions

## Architecture

See [ARCHITECTURE.md](../../ARCHITECTURE.md) for technical details.

See [WORKFLOW.md](../../WORKFLOW.md) for complete usage guide.

## License

MIT
