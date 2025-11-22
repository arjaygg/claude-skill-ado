# Claude Skill ADO

> **A comprehensive monorepo of Claude Code skills for Azure DevOps analysis, forensics, and team performance insights.**

Complete solution for collecting work item data and generating team performance metrics from Azure DevOps.

## 🎯 What It Does

**Two complementary skills that work together:**

1. **azure-devops-batch** - Collects detailed work item change history from Azure DevOps
2. **team-performance-analysis** - Analyzes collected data to generate insights and metrics

## 🚀 Quick Start

```bash
# 1. Setup (one time)
git clone <repository>
cd claude-skill-ado
npm install --workspaces

# 2. Configure
cp azure-devops-batch/scripts/team_members.toon.example team_members.toon
# Edit team_members.toon with your team

# 3. Set credentials
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-pat"

# 4. Collect data
cd azure-devops-batch/scripts
npx tsx fetch-work-item-history.ts ../../team_members.toon

# 5. Analyze
cd ../../team-performance-analysis/scripts
npm run analyze
```

## 📊 Skills Included

### azure-devops-batch
**Data collection & forensic analysis**

Fetches and analyzes work item updates to identify:
- Assignment changes and team reassignments
- State transitions in the workflow
- Estimation changes and variance
- Sprint/iteration changes

**Usage**: `npx tsx fetch-work-item-history.ts team_members.toon`

[→ Full Documentation](./azure-devops-batch/README.md)

### team-performance-analysis
**Metrics & insights generation**

Calculates comprehensive team metrics:
- Cycle time (creation to completion)
- Estimation accuracy
- Work item aging
- Work patterns & trends
- State distribution
- Rework/quality metrics

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
├── azure-devops-batch/            # Skill 1: Data collection
│   ├── README.md
│   ├── scripts/
│   ├── team_members.toon.example
│   └── analysis_config.toon.example
│
└── team-performance-analysis/     # Skill 2: Analysis
    ├── README.md
    ├── scripts/
    ├── team_members.toon.example
    └── analysis_config.toon.example
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
TEAM_MEMBERS_TOON             # Path to team_members.toon
ANALYSIS_CONFIG_TOON          # Path to analysis_config.toon
TEAM_NAME                     # Display name for team (default: ABC)
```

## 📚 Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical design and data flow
- **[WORKFLOW.md](./WORKFLOW.md)** - Complete step-by-step usage guide
- **[azure-devops-batch/README.md](./azure-devops-batch/README.md)** - Data collection skill
- **[team-performance-analysis/README.md](./team-performance-analysis/README.md)** - Analysis skill
- **[azure-devops-batch/references/ado-batch-api-reference.md](./azure-devops-batch/references/ado-batch-api-reference.md)** - Azure DevOps API details

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
