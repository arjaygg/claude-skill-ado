# Claude Skill ADO - Team Performance Analyzer

> **A unified Claude Code skill for comprehensive Azure DevOps team performance analysis.**

Complete solution for collecting work item data and generating team performance metrics from Azure DevOps in a single, integrated workflow.

## 🎯 What It Does

**One unified skill that combines:**

1. **Data Collection** - Automatically fetches work item change history from Azure DevOps
2. **Team Performance Analysis** - Generates comprehensive metrics and insights

## 🚀 Quick Start

```bash
# 1. Setup (one time)
git clone <repository>
cd claude-skill-ado

# 2. Install dependencies
cd team-performance-analysis/scripts
npm install

# 3. Configure
cp team_members.toon.example team_members.toon
cp analysis_config.toon.example analysis_config.toon
# Edit both files with your team and data paths

# 4. Set Azure DevOps credentials
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-pat"

# 5. Run unified analysis
# This automatically collects history and generates metrics
npm run analyze
```

## 📊 Unified Skill Features

### Data Collection (Automatic)
Fetches and analyzes work item updates to identify:
- **Assignment changes** and team reassignments
- **State transitions** in the workflow
- **Estimation changes** and variance tracking
- **Sprint/iteration** changes and movements

### Team Performance Metrics
Calculates comprehensive team metrics:
- **Cycle Time** - Creation to completion time
- **Estimation Accuracy** - Estimated vs actual effort comparison
- **Work Item Aging** - Incomplete items tracking
- **Work Patterns** - Creation vs completion trends
- **State Distribution** - Workflow state analysis
- **Rework Rates** - Quality and rework metrics
- **Deep Metrics** - Time in state, WIP, flow efficiency, sprint analysis

**Usage**: `npm run analyze`

[→ Full Documentation](./team-performance-analysis/README.md)

## 📁 Project Structure

```
claude-skill-ado/
├── README.md                      # This file
├── ARCHITECTURE.md                # Technical architecture
├── WORKFLOW.md                    # Step-by-step usage guide
│
├── shared/
│   └── utils/
│       └── toon-parser.ts        # Shared TOON format parsing
│
└── team-performance-analysis/     # Unified Skill
    ├── README.md
    ├── skill.md
    ├── scripts/
    │   ├── team-performance-analyzer.ts    # Main unified entry point
    │   ├── analyze-team-performance.ts     # Analysis engine
    │   ├── analyze-team-performance-interactive.ts  # Legacy interactive
    │   ├── types.ts
    │   ├── ado/                            # Azure DevOps utilities
    │   │   ├── ado-client.ts
    │   │   ├── ado-batch.ts
    │   │   ├── ado-large-data.ts
    │   │   └── ado-utils.ts
    │   ├── utils/
    │   │   ├── data-loader.ts
    │   │   ├── history-loader.ts
    │   │   ├── history-collector.ts    # NEW: Unified collection module
    │   │   └── interactive-prompts.ts
    │   ├── metrics/
    │   │   ├── cycle-time.ts
    │   │   ├── estimation-accuracy.ts
    │   │   ├── work-item-age.ts
    │   │   ├── work-patterns.ts
    │   │   ├── state-distribution.ts
    │   │   ├── reopened-items.ts
    │   │   ├── time-in-state.ts
    │   │   ├── daily-wip.ts
    │   │   ├── flow-efficiency.ts
    │   │   └── sprint-analysis.ts
    │   ├── package.json
    │   ├── tsconfig.json
    │   ├── team_members.toon.example
    │   └── analysis_config.toon.example
    ├── examples/
    └── references/
```

## 🔧 Configuration

### Team Members (team_members.toon)
Define your team roster in TOON format:

```toon
[N]{display_name,ado_identity,email,status,role}:
  John Doe,John Doe <john@company.com>,john@company.com,active,developer
  Jane Smith,Jane Smith <jane@company.com>,jane@company.com,active,developer
```

### Analysis Config (analysis_config.toon)
Configure data paths and analysis parameters:

```toon
[1]{key,value}:
  data_file,data/july_november_2025/all_work_items_july_november_2025.json
  output_dir,data/july_november_2025/analysis
  date_range_start,2025-07-01
  date_range_end,2025-11-21
```

## 🌐 Environment Variables

```bash
# Required - Azure DevOps authentication
AZURE_DEVOPS_ORG              # Organization name
AZURE_DEVOPS_PROJECT          # Project name
AZURE_DEVOPS_PAT              # Personal Access Token

# Optional - Override config file paths
TEAM_MEMBERS_TOON             # Path to team_members.toon (default: team_members.toon)
ANALYSIS_CONFIG_TOON          # Path to analysis_config.toon (default: analysis_config.toon)
TEAM_NAME                     # Display name for team (default: Team)
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Unified architecture and design
- **[WORKFLOW.md](./WORKFLOW.md)** - Complete step-by-step usage guide
- **[team-performance-analysis/README.md](./team-performance-analysis/README.md)** - Skill documentation and advanced usage
- **[team-performance-analysis/references/ado-batch-api-reference.md](./team-performance-analysis/references/ado-batch-api-reference.md)** - Azure DevOps API details

## 🛠️ Installation

### Prerequisites
- Node.js 18+ and npm
- Azure DevOps organization access
- Personal Access Token with Work Items permissions

### Setup

```bash
# Clone repository
git clone <repository>
cd claude-skill-ado

# Install all dependencies
cd azure-devops-batch/scripts && npm install
cd ../../team-performance-analysis/scripts && npm install
cd ../..

# Create configuration
cp azure-devops-batch/scripts/team_members.toon.example team_members.toon
cp azure-devops-batch/scripts/analysis_config.toon.example analysis_config.toon

# Set environment variables
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-pat"
```

## 💡 Usage Examples

### Example 1: Basic Analysis Workflow

```bash
# Collect data
cd azure-devops-batch/scripts
npx tsx fetch-work-item-history.ts ../../team_members.toon

# Wait for completion, then analyze
cd ../../team-performance-analysis/scripts
npm run analyze
```

### Example 2: Analyze Specific Time Period

Edit `analysis_config.toon`:
```toon
date_range_start,2025-10-01
date_range_end,2025-10-31
focus_months,2025-10
```

Then run analysis:
```bash
npx tsx analyze-team-performance.ts ../../team_members.toon ../../analysis_config.toon
```

### Example 3: Interactive Analysis

```bash
cd team-performance-analysis/scripts
npm run analyze
# Answers prompts interactively
```

## 📈 Output Examples

### Data Collection Output
```
✓ Fetched updates for 342 work items
✓ Total update records: 2,847
   Assignment changes: 156
   State transitions: 1,203
   Estimation changes: 89

💾 Analysis saved to: data/july_november_2025/history_detailed/change_analysis.json
```

### Analysis Output
```
📏 METRIC 1: Cycle Time Analysis
   John Doe (30 items) | Avg: 12.5 days | Median: 10.0 days
   Jane Smith (25 items) | Avg: 14.2 days | Median: 12.0 days

📊 METRIC 2: Estimation Accuracy Analysis
   John Doe | Estimate: 320h | Actual: 340h | Variance: +6.25%
   Jane Smith | Estimate: 280h | Actual: 265h | Variance: -5.36%
```

## 🎯 Common Use Cases

✅ **Forensic Analysis** - Investigate work item change history
✅ **Team Performance** - Calculate cycle time and velocity metrics
✅ **Estimation Accuracy** - Compare estimated vs actual effort
✅ **Workload Tracking** - Identify team reassignments and bottlenecks
✅ **Quality Metrics** - Track rework and reopened items
✅ **Trend Analysis** - Monitor improvement over time
✅ **Executive Reporting** - Generate team performance summaries

## 🔄 Data Flow

```
Azure DevOps
    ↓
azure-devops-batch (collect & analyze)
    ↓ (JSON files)
Intermediate Storage
    ↓
team-performance-analysis (metrics & insights)
    ↓ (JSON + TOON reports)
Results & Insights
```

## 🤝 Contributing

Contributions welcome! When adding features:

1. **Plan** - Determine which skill(s) are affected
2. **Implement** - Follow existing patterns
3. **Test** - Verify locally with sample data
4. **Document** - Update README and inline comments
5. **Commit** - Use clear, descriptive messages

## 🆘 Support

### Troubleshooting
- **TOON file not found** - Check file path and run from project root
- **Unauthorized errors** - Verify PAT has correct permissions
- **Rate limit exceeded** - Increase `rate_limit_delay_ms` in config
- **Missing data** - Ensure data file matches config path

See [WORKFLOW.md](./WORKFLOW.md#troubleshooting) for more solutions.

### Getting Help
- Check the [WORKFLOW.md](./WORKFLOW.md) guide
- Review skill-specific README files
- Check Azure DevOps API docs
- See [Troubleshooting](./WORKFLOW.md#troubleshooting) section

## 📝 License

MIT

## 🚦 Status

**Current Version**: 1.0.0
**Skills**: 2 (azure-devops-batch, team-performance-analysis)
**Last Updated**: November 22, 2025

---

**Next Steps:**
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for technical details
- Follow [WORKFLOW.md](./WORKFLOW.md) for step-by-step instructions
- Check individual skill READMEs for specific features
