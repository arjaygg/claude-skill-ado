# Claude Skill ADO - Workflow Guide

Complete step-by-step guide for using the azure-devops-batch and team-performance-analysis skills together.

## Table of Contents
1. [Initial Setup](#initial-setup)
2. [Data Collection](#data-collection)
3. [Analysis](#analysis)
4. [Interpreting Results](#interpreting-results)
5. [Common Scenarios](#common-scenarios)

## Initial Setup

### Step 1: Install Dependencies

```bash
# Install azure-devops-batch dependencies
cd azure-devops-batch/scripts
npm install

# Install team-performance-analysis dependencies
cd ../../team-performance-analysis/scripts
npm install

cd ../..
```

### Step 2: Create Configuration Files

Copy example templates to your project:

```bash
# Create team members file
cp azure-devops-batch/scripts/team_members.toon.example team_members.toon

# Create analysis config file
cp azure-devops-batch/scripts/analysis_config.toon.example analysis_config.toon
```

### Step 3: Edit Configuration Files

**team_members.toon** - Add your team members:

```toon
[N]{display_name,ado_identity,email,status,role}:
  John Doe,John Doe <john@company.com>,john@company.com,active,developer
  Jane Smith,Jane Smith <jane@company.com>,jane@company.com,active,developer
  Bob Johnson,Bob Johnson <bob@company.com>,bob@company.com,active,developer
```

**analysis_config.toon** - Set your analysis parameters:

```toon
[1]{key,value}:
  data_file,data/july_november_2025/all_work_items_july_november_2025.json
  output_dir,data/july_november_2025/history_detailed
  date_range_start,2025-07-01
  date_range_end,2025-11-21
  focus_months,2025-10,2025-11
  rate_limit_progress_interval,20
  rate_limit_delay_interval,50
  rate_limit_delay_ms,500
  output_sample_size,10
```

### Step 4: Set Environment Variables

```bash
export AZURE_DEVOPS_ORG="your-organization"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-personal-access-token"
export TEAM_MEMBERS_TOON="team_members.toon"
export ANALYSIS_CONFIG_TOON="analysis_config.toon"
```

Or create a `.env` file:

```bash
AZURE_DEVOPS_ORG=your-organization
AZURE_DEVOPS_PROJECT=your-project
AZURE_DEVOPS_PAT=your-personal-access-token
```

## Data Collection

### Step 1: Prepare Input Data

Before running forensic analysis, you need work item data. If you don't have it yet:

```bash
# Fetch work items first (using azure-devops-batch)
cd azure-devops-batch/scripts

# Option A: Use built-in script (if available)
npx tsx scripts/get-all-sprints.ts > ../../data/all_work_items.json

# Option B: Create your own data file
# The file should be JSON array of work items from Azure DevOps API
```

### Step 2: Run Forensic Analysis

Fetch and analyze work item change history:

```bash
cd azure-devops-batch/scripts

# Run with team members file
npx tsx fetch-work-item-history.ts ../../team_members.toon

# Or with full config
npx tsx fetch-work-item-history.ts ../../team_members.toon ../../analysis_config.toon
```

**What Happens**:
- ✅ Loads team members from TOON file
- ✅ Loads work items from data file
- ✅ Fetches all updates/revisions from Azure DevOps
- ✅ Analyzes assignment changes
- ✅ Identifies team reassignments
- ✅ Generates `change_analysis.json`

**Expected Output**:
```
✓ Fetched updates for 342 work items
✓ Total update records: 2,847
   Assignment changes: 156
   State transitions: 1,203
   Estimation changes: 89
   Sprint changes: 64

🚨 Reassignments FROM Team to others: 12
📥 Reassignments TO Team from others: 8

💾 Analysis saved to: data/july_november_2025/history_detailed/change_analysis.json
```

### Step 3: Review Forensic Results

Check the generated analysis file:

```bash
# View assignment changes
jq '.details.reassignments_from_team' data/july_november_2025/history_detailed/change_analysis.json

# View top reassignments
jq '.details.reassignments_from_team[:5]' data/july_november_2025/history_detailed/change_analysis.json

# View summary statistics
jq '.summary' data/july_november_2025/history_detailed/change_analysis.json
```

## Analysis

### Step 1: Run Team Performance Analysis

Generate metrics and insights:

```bash
cd team-performance-analysis/scripts

# Option A: Interactive mode (recommended for exploration)
npm run analyze

# Option B: Programmatic mode with config
npx tsx analyze-team-performance.ts ../../team_members.toon ../../analysis_config.toon

# Option C: Direct invocation
npx tsx analyze-team-performance.ts
```

**Interactive Mode Flow**:
```
TEAM PERFORMANCE ANALYSIS - Interactive Mode
================================================

📋 Analysis Configuration
================================================
Work items data file [data/july_november_2025/...]: (press Enter or type path)
Team members file [docs/context/team_members.toon]: (press Enter or type path)
Start date (YYYY-MM-DD) [2025-07-01]: (press Enter or type date)
End date (YYYY-MM-DD) [2025-11-21]: (press Enter or type date)

Available metrics:
  1. cycleTime         - Time from creation to completion
  2. estimationAccuracy - Estimate vs actual comparison
  3. workItemAge       - Age of incomplete items
  4. workPatterns      - Creation vs completion patterns
  5. stateDistribution - State tracking over time
  6. reopenedItems     - Rework/quality analysis
  all                  - Run all metrics

Metrics to run (comma-separated or "all") [all]:
...
Proceed with analysis? [Y/n]: y
```

### Step 2: Review Analysis Results

After analysis completes, results are in JSON and TOON formats:

```bash
# View cycle time metrics
jq '.cycleTime.byMember' data/analysis/results.json

# View estimation accuracy
jq '.estimationAccuracy.byMember' data/analysis/results.json

# View work item age
jq '.workItemAge.byMember' data/analysis/results.json

# View TOON summary for LLM consumption
cat data/analysis/results.toon
```

### Step 3: Generate Reports

Create human-readable summaries:

```bash
# Generate summary report
jq -r '.summary | to_entries[] | "\(.key): \(.value)"' data/analysis/results.json

# Find problematic areas
jq '.workItemAge.byMember[] | select(.itemsOverThreshold > 0)'

# Track estimation trends
jq '.estimationAccuracy.byMember | sort_by(.variancePct) | reverse'
```

## Interpreting Results

### Cycle Time
**What it measures**: Average days from work item creation to completion

**Good indicators**:
- Median < 10 days (fast turnaround)
- Consistent across team members
- Downward trend over time

**Warning signs**:
- Median > 30 days (slow completion)
- High variance (inconsistent velocity)
- Increasing trend (degrading performance)

### Estimation Accuracy
**What it measures**: Variance between estimated and actual effort

**Good indicators**:
- Variance between -10% and +10%
- Few "high variance" items (>50% off)
- Consistent per team member

**Warning signs**:
- Consistent over-estimation (>20% below actual)
- Consistent under-estimation (>20% above actual)
- High variance items frequently needed rework

### Work Item Age
**What it measures**: How long items sit incomplete

**Good indicators**:
- Average age < 20 days
- Few items > 60 days old
- Declining trend

**Warning signs**:
- Items > 90 days incomplete
- Growing number of aged items
- No progress on old items

### State Distribution
**What it measures**: Where work items get stuck in the workflow

**Good indicators**:
- Most items flowing through all states
- Minimal items in "Blocked" state
- High completion rate

**Warning signs**:
- Many items stuck in one state
- High "Blocked" or "On Hold" count
- Low completion percentage

### Rework/Reopened Items
**What it measures**: Quality issues requiring rework

**Good indicators**:
- < 10% of items reopened
- Reopened items quickly resolved
- Declining trend

**Warning signs**:
- > 20% reopened
- Items reopened multiple times
- Increasing trend

## Common Scenarios

### Scenario 1: Analyze Last Quarter's Performance

```bash
# Step 1: Update analysis_config.toon
# Change dates:
# date_range_start,2025-07-01
# date_range_end,2025-09-30

# Step 2: Run collection
cd azure-devops-batch/scripts
npx tsx fetch-work-item-history.ts ../../team_members.toon

# Step 3: Run analysis
cd ../../team-performance-analysis/scripts
npx tsx analyze-team-performance.ts ../../team_members.toon

# Step 4: Review results
jq '.summary' ../data/july_november_2025/analysis/results.json
```

### Scenario 2: Compare Team Member Performance

```bash
# Run analysis with all metrics
npm run analyze

# View individual metrics
jq '.cycleTime.byMember' data/analysis/results.json | \
  jq 'to_entries | sort_by(.value.avg) | reverse'

# Identify top performer and struggling member
echo "Fastest:"
jq '.cycleTime.byMember | to_entries | min_by(.value.avg)' data/analysis/results.json

echo "Slowest:"
jq '.cycleTime.byMember | to_entries | max_by(.value.avg)' data/analysis/results.json
```

### Scenario 3: Track Improvement Over Time

```bash
# Collect data for different periods
# Q3: july_november_2025 → july_september_2025
# Q4: july_november_2025 → october_december_2025

# Run analysis for each period and compare
# Change dates in analysis_config.toon and re-run

# Compare results
echo "=== Q3 Results ==="
jq '.cycleTime.byMember' data/q3_analysis/results.json

echo "=== Q4 Results ==="
jq '.cycleTime.byMember' data/q4_analysis/results.json

# Calculate improvement
# (Q4 - Q3) / Q3 * 100 = % improvement
```

### Scenario 4: Identify Work Item Bottlenecks

```bash
# Find items that took longest
cd azure-devops-batch/scripts
jq '.details.assignment_changes |
    group_by(.workItemId) |
    map({
      workItemId: .[0].workItemId,
      changes: length,
      timespan: (max_by(.date).date - min_by(.date).date)
    }) |
    sort_by(.changes) |
    reverse |
    .[0:10]' data/july_november_2025/history_detailed/change_analysis.json

# Investigate these items manually in Azure DevOps
```

### Scenario 5: Generate Executive Summary

```bash
# Collect all metrics
cd team-performance-analysis/scripts
npm run analyze

# Extract key findings
echo "=== Team Performance Summary ==="
echo "Analysis Period: 2025-07-01 to 2025-11-21"
echo ""
echo "Cycle Time (days):"
jq '.cycleTime.overall.median // "N/A"' data/analysis/results.json

echo "Completion Rate:"
jq '.workPatterns.completionRate // "N/A"' data/analysis/results.json

echo "Estimation Accuracy:"
jq '.estimationAccuracy.overall.variancePct // "N/A"' data/analysis/results.json

echo "Aged Items (>60 days):"
jq '.workItemAge.totalOverThreshold // "N/A"' data/analysis/results.json

echo "Rework Rate:"
jq '.reopenedItems.overall.reopenRate // "N/A"' data/analysis/results.json
```

## Troubleshooting

### "TOON file not found"
```bash
# Make sure you're in the right directory
pwd
# Should be: /path/to/claude-skill-ado

# Make sure team_members.toon exists
ls -la team_members.toon

# If not, copy from example
cp azure-devops-batch/scripts/team_members.toon.example team_members.toon
```

### "Data file not found"
```bash
# Check the data file path in analysis_config.toon
cat analysis_config.toon | grep data_file

# Make sure the file exists
ls -la <path-from-config>

# If not, create the directory and file
mkdir -p data/july_november_2025
touch data/july_november_2025/all_work_items_july_november_2025.json
```

### "Unauthorized" Error
```bash
# Check Azure DevOps credentials
echo $AZURE_DEVOPS_PAT  # Should show your PAT
echo $AZURE_DEVOPS_ORG

# Verify PAT has correct permissions:
# - Work Items: Read, Write, Manage
# - Test Management: Read

# Generate new PAT if needed:
# https://dev.azure.com/<org>/_usersSettings/tokens
```

### "Rate limit exceeded"
```bash
# Increase delays in analysis_config.toon:
# rate_limit_delay_ms,1000  # Increase from 500
# rate_limit_delay_interval,100  # Decrease from 50

# Or reduce batch sizes in scripts
```

## Next Steps

- Check [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Review skill-specific docs: [azure-devops-batch](./azure-devops-batch/README.md), [team-performance-analysis](./team-performance-analysis/README.md)
- For API details: [ADO Batch API Reference](./azure-devops-batch/references/ado-batch-api-reference.md)
