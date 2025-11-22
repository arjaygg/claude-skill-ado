---
name: team-performance-analyzer
description: Unified team performance analyzer. Automatically collects Azure DevOps work item history and generates comprehensive team performance metrics including cycle times, estimation accuracy, work patterns, and team productivity insights.
---

# Team Performance Analyzer Skill

You are a team performance analysis expert. This unified skill enables you to automatically collect and analyze Azure DevOps work item data to generate comprehensive metrics about team performance, productivity, and work patterns.

## Core Capabilities

### 1. Automatic Data Collection
- **Work Item History Fetching**: Automatically fetches all work item updates from Azure DevOps
- **Smart Detection**: Checks if history data exists, fetches if needed
- **Assignment Analysis**: Tracks team member reassignments and ownership changes
- **State Transition Analysis**: Analyzes workflow state changes and patterns
- **Estimation Tracking**: Captures and analyzes estimation changes
- **Sprint/Iteration Tracking**: Monitors work item movements between sprints

### 2. Comprehensive Metrics Analysis
- **Cycle Time Analysis**: Time from creation to completion
- **Estimation Accuracy**: Compare original estimates vs actual work
- **Work Item Age**: Analyze age of incomplete items
- **Work Patterns**: Creation vs completion trends
- **State Distribution**: Track work item states over time
- **Reopened Items**: Identify quality issues and rework
- **Deep Metrics**: Time-in-state, daily WIP, flow efficiency, sprint analysis

### 3. Team Performance Insights
- **Team Member Comparison**: Metrics across all team members
- **Productivity Trends**: Identify improvements or degradation
- **Bottleneck Detection**: Find where work gets stuck
- **Quality Metrics**: Rework rates and completion quality
- **Workload Distribution**: Identify overloaded or underutilized members

### 4. Single Unified Workflow
- **One Command**: `npm run analyze` orchestrates entire process
- **Automatic Detection**: Fetches history if not available
- **Configuration-Driven**: Uses TOON files for full parameterization
- **No Hardcoding**: All values configurable or from environment

## Data Sources & Formats

### Input
- **Work Items**: JSON from Azure DevOps (provided externally)
- **Configuration**: TOON files (team members, analysis parameters)
- **Azure DevOps API**: Automatic history and updates fetching

### Output
- **JSON**: Structured metrics for programmatic use
- **TOON**: Human-readable summaries for review
- **Console**: Real-time progress and key findings

## Configuration

### team_members.toon
Defines your team roster:
```
[N]{display_name,ado_identity,email,status,role}:
  John Doe,John Doe <john@company.com>,john@company.com,active,developer
  Jane Smith,Jane Smith <jane@company.com>,jane@company.com,active,developer
```

### analysis_config.toon
Configures analysis parameters:
```
[1]{key,value}:
  data_file,data/work_items.json
  output_dir,data/analysis
  team_members_file,team_members.toon
  date_range_start,2025-07-01
  date_range_end,2025-11-21
  focus_months,2025-10,2025-11
  rate_limit_progress_interval,20
  rate_limit_delay_interval,50
  rate_limit_delay_ms,500
  metrics,all
```

## Usage

### Basic Usage
```bash
# Install dependencies
cd team-performance-analysis/scripts
npm install

# Configure
cp team_members.toon.example team_members.toon
cp analysis_config.toon.example analysis_config.toon
# Edit both files with your settings

# Set Azure DevOps credentials
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-pat"

# Run unified analysis (automatic collection + analysis)
npm run analyze
```

### What Happens
1. **Phase 1: Automatic Collection** (if needed)
   - Detects if history data exists
   - If not, fetches all work item updates from Azure DevOps
   - Analyzes patterns (assignments, states, estimations, sprints)
   - Saves analysis to `change_analysis.json`

2. **Phase 2: Analysis**
   - Loads work item data and history
   - Calculates all configured metrics
   - Generates insights and trends
   - Outputs results in JSON and TOON formats

3. **Phase 3: Results**
   - Display key findings in console
   - Save detailed metrics to JSON
   - Generate TOON summary for review

## Key Metrics Explained

### Cycle Time
- **What**: Average days from creation to completion
- **Good**: < 10 days median
- **Warning**: > 30 days median

### Estimation Accuracy
- **What**: Variance between estimated and actual effort
- **Good**: -10% to +10% variance
- **Warning**: > 50% variance on individual items

### Work Item Age
- **What**: How long items remain incomplete
- **Good**: < 20 days average
- **Warning**: Items > 90 days incomplete

### Rework Rate
- **What**: Percentage of items reopened/reworked
- **Good**: < 10% rework rate
- **Warning**: > 20% rework rate

## Advanced Features

### Deep Metrics (with history data)
- **Time in State**: How long items spend in each workflow state
- **Daily WIP**: Work-in-progress tracking over time
- **Flow Efficiency**: Ratio of active to total cycle time
- **Sprint Analysis**: Sprint-level velocity and completion metrics

### Team Reassignment Analysis
- Tracks movement FROM team members
- Tracks movement TO team members
- Identifies handoff patterns
- Analyzes workload distribution

### Rate Limiting
Configure Azure DevOps API rate limiting:
- `rate_limit_progress_interval`: Progress update frequency
- `rate_limit_delay_interval`: When to pause requests
- `rate_limit_delay_ms`: Pause duration

## Environment Variables

```bash
# Required
AZURE_DEVOPS_ORG              # Organization name
AZURE_DEVOPS_PROJECT          # Project name
AZURE_DEVOPS_PAT              # Personal Access Token

# Optional
TEAM_MEMBERS_TOON             # Path to team_members.toon
ANALYSIS_CONFIG_TOON          # Path to analysis_config.toon
TEAM_NAME                     # Display name for team
```

## Backwards Compatibility

Legacy scripts still available for advanced use:
- `npm run analyze:legacy-interactive` - Old interactive mode
- `npm run analyze:legacy-file` - Old file-based analysis

All functionality preserved - just reorganized for unified experience.

## Common Use Cases

1. **Quarterly Performance Review**
   - Set date_range_start/end to quarter dates
   - Run analysis
   - Review all metrics

2. **Team Member Comparison**
   - Analyze same period for all members
   - Compare cycle times, accuracy, workload

3. **Identify Bottlenecks**
   - Review time-in-state metrics
   - Find states where work gets stuck

4. **Quality Assessment**
   - Check rework rates
   - Identify problematic item types

5. **Capacity Planning**
   - Review workload distribution
   - Identify overloaded members

## Troubleshooting

**"History not found"**: First run will automatically fetch it from Azure DevOps

**"Unauthorized error"**: Verify AZURE_DEVOPS_PAT has work items permissions

**"Rate limit exceeded"**: Increase `rate_limit_delay_ms` in config

**"File not found"**: Verify paths in analysis_config.toon are correct

See WORKFLOW.md for complete troubleshooting guide.
