# Claude Skill ADO - Architecture & Workflow

A monorepo containing complementary Claude Code skills for comprehensive Azure DevOps data analysis and forensic investigation.

## Project Overview

**claude-skill-ado** is a monolithic repository containing multiple specialized skills that work together to:
1. **Collect** work item data from Azure DevOps
2. **Analyze** team performance metrics
3. **Generate** insights about team dynamics and work patterns

## Skills Included

### 1. **azure-devops-batch** - Data Collection & Forensics
**Purpose**: Fetch and analyze work item change history from Azure DevOps

**Key Components**:
- `fetch-work-item-history.ts` - Forensic analysis of work item updates/revisions
- `ado-batch.ts` - Batch operations utilities
- `ado-client.ts` - Azure DevOps REST API client
- `ado-large-data.ts` - Large dataset handling

**Outputs**:
- JSON files with work item change history
- Assignment change tracking
- State transition analysis
- Estimation variance reports

**Example Usage**:
```bash
cd azure-devops-batch/scripts
npx tsx fetch-work-item-history.ts
```

### 2. **team-performance-analysis** - Metrics & Insights
**Purpose**: Analyze collected work item data to generate team performance metrics

**Key Components**:
- `analyze-team-performance.ts` - Main orchestrator
- `analyze-team-performance-interactive.ts` - Interactive mode
- Metrics modules:
  - `cycle-time.ts` - Completion time analysis
  - `estimation-accuracy.ts` - Estimate vs actual comparison
  - `work-item-age.ts` - Incomplete item aging
  - `work-patterns.ts` - Creation/completion trends
  - `state-distribution.ts` - State tracking
  - `reopened-items.ts` - Rework analysis
  - `time-in-state.ts` - Time in each state
  - `daily-wip.ts` - Work-in-progress tracking
  - `flow-efficiency.ts` - Flow metrics
  - `sprint-analysis.ts` - Sprint-level insights

**Outputs**:
- Detailed metrics JSON files
- TOON format summaries for LLM consumption
- Console reports with key findings

**Example Usage**:
```bash
cd team-performance-analysis/scripts
npm run analyze
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│        Azure DevOps REST APIs (Organization)            │
└─────────────────────────────────────────────────────────┘
                          ↓
                          │
┌─────────────────────────────────────────────────────────┐
│       azure-devops-batch Skill                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ fetch-work-item-history.ts                       │   │
│  │ - Fetches all work item updates                 │   │
│  │ - Analyzes assignments, states, estimations     │   │
│  │ - Identifies team member reassignments          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
         (JSON data files + metadata)
                          ↓
┌─────────────────────────────────────────────────────────┐
│       team-performance-analysis Skill                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ analyze-team-performance.ts                      │   │
│  │ - Reads collected work item data                 │   │
│  │ - Calculates team metrics                        │   │
│  │ - Generates insights & reports                   │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          ↓
            (Metrics, reports, insights)
```

## Data Flow

### Phase 1: Data Collection (azure-devops-batch)
```
1. Invoke: npx tsx fetch-work-item-history.ts
2. Load team members from team_members.toon
3. Load work items from data file
4. Fetch all updates/revisions from Azure DevOps
5. Analyze patterns:
   - Assignment changes (who → who, when)
   - State transitions
   - Estimation changes
   - Sprint changes
6. Output: change_analysis.json + detailed records
```

### Phase 2: Analysis (team-performance-analysis)
```
1. Invoke: npm run analyze
2. Load work items from data file
3. Load team members from team_members.toon
4. Calculate metrics:
   - Cycle time (creation → completion)
   - Estimation accuracy
   - Work item aging
   - Work patterns
   - State distribution
   - Rework rates
5. Output: Detailed JSON + TOON summaries
```

## Configuration

### Shared Configuration Files

All skills use TOON format configuration files:

#### `team_members.toon` - Team Roster (Shared)
Used by both skills to identify team members and filter data

```toon
[N]{display_name,ado_identity,email,status,role}:
  Jude Marco Bayot,Jude Marco Bayot <JudeMarco.Bayot@ph.axos.com>,JudeMarco.Bayot@ph.axos.com,active,developer
  Christopher Reyes,Christopher Reyes <Christopher.Reyes@ph.axos.com>,Christopher.Reyes@ph.axos.com,active,developer
```

**Usage**:
```bash
# Both skills look for team_members.toon in their working directories
cp team_members.toon.example team_members.toon
# Edit team_members.toon with your team
```

#### `analysis_config.toon` - Analysis Parameters
Configures data locations and analysis parameters

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

### Environment Variables

```bash
# Azure DevOps Authentication
export AZURE_DEVOPS_ORG="your-organization"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-personal-access-token"

# Optional: Override config file paths
export TEAM_MEMBERS_TOON="path/to/team_members.toon"
export ANALYSIS_CONFIG_TOON="path/to/analysis_config.toon"
export TEAM_NAME="Your Team Name"
```

## Shared Utilities

### `/shared/utils/toon-parser.ts`
Centralized TOON format parsing used by both skills:
- `parseTeamMembers()` - Parse team roster
- `parseAnalysisConfig()` - Parse analysis parameters
- `getTeamMemberNames()` - Extract member names for filtering
- `teamMembersToToon()` - Export to TOON format
- `analysisConfigToToon()` - Export config to TOON format

**Why Shared?**
- Both skills need TOON parsing
- Consistent configuration format across skills
- Single source of truth for parsing logic
- Easier maintenance and updates

## Installation & Setup

### Quick Start

```bash
# 1. Clone the project
git clone <repository>
cd claude-skill-ado

# 2. Install azure-devops-batch skill
cd azure-devops-batch/scripts
npm install

# 3. Install team-performance-analysis skill
cd ../../team-performance-analysis/scripts
npm install

# 4. Set up configuration
cd ../..
cp azure-devops-batch/scripts/team_members.toon.example team_members.toon
cp azure-devops-batch/scripts/analysis_config.toon.example analysis_config.toon

# 5. Edit configuration files
vim team_members.toon
vim analysis_config.toon

# 6. Set environment variables
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_PAT="your-pat"
```

### Running the Skills

**Data Collection**:
```bash
cd azure-devops-batch/scripts
npx tsx fetch-work-item-history.ts ../../team_members.toon ../../analysis_config.toon
```

**Analysis**:
```bash
cd team-performance-analysis/scripts
npx tsx analyze-team-performance.ts ../../team_members.toon ../../analysis_config.toon
```

## Directory Structure

```
claude-skill-ado/
├── README.md                          # Project overview
├── ARCHITECTURE.md                    # This file
├── WORKFLOW.md                        # Step-by-step workflows
├── .git/
├── .gitignore
├── .mcp.json
│
├── shared/
│   └── utils/
│       └── toon-parser.ts            # Shared TOON parsing
│
├── azure-devops-batch/               # Skill 1: Data Collection
│   ├── README.md
│   ├── SKILL.md
│   ├── team_members.toon.example
│   ├── analysis_config.toon.example
│   ├── scripts/
│   │   ├── ado-client.ts
│   │   ├── ado-batch.ts
│   │   ├── ado-utils.ts
│   │   ├── fetch-work-item-history.ts
│   │   ├── utils/
│   │   ├── examples/
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── references/
│       └── ado-batch-api-reference.md
│
├── team-performance-analysis/        # Skill 2: Analysis
│   ├── README.md
│   ├── skill.md
│   ├── team_members.toon.example
│   ├── analysis_config.toon.example
│   ├── scripts/
│   │   ├── analyze-team-performance.ts
│   │   ├── analyze-team-performance-interactive.ts
│   │   ├── types.ts
│   │   ├── utils/
│   │   │   ├── data-loader.ts
│   │   │   ├── history-loader.ts
│   │   │   └── interactive-prompts.ts
│   │   ├── metrics/
│   │   │   ├── cycle-time.ts
│   │   │   ├── estimation-accuracy.ts
│   │   │   ├── work-item-age.ts
│   │   │   ├── work-patterns.ts
│   │   │   ├── state-distribution.ts
│   │   │   ├── reopened-items.ts
│   │   │   ├── time-in-state.ts
│   │   │   ├── daily-wip.ts
│   │   │   ├── flow-efficiency.ts
│   │   │   └── sprint-analysis.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── examples/
│   │   └── analysis_config.toon
│   └── references/
│
└── docs/
    ├── INSTALLATION.md
    ├── WORKFLOW.md
    ├── FAQ.md
    └── TROUBLESHOOTING.md
```

## Benefits of Monorepo Architecture

✅ **Single Source of Truth**: One repository for complete Azure DevOps workflow
✅ **Shared Configuration**: Team members and settings used consistently across skills
✅ **Shared Utilities**: Common TOON parsing logic maintained in one place
✅ **Clear Relationships**: Data flow from collection → analysis is explicit
✅ **Coordinated Releases**: Version all skills together
✅ **Easy Discovery**: New users see the full workflow in one place
✅ **Simplified Installation**: Install once, get both skills
✅ **Better Maintenance**: Consistent standards and documentation

## Workflow Integration

See [WORKFLOW.md](./WORKFLOW.md) for detailed step-by-step instructions on:
- Setting up the environment
- Collecting work item data
- Running analysis
- Interpreting results
- Common use cases

## Contributing

When adding new features or fixes:

1. **Plan**: Determine which skill(s) are affected
2. **Implement**: Follow existing code style and patterns
3. **Test**: Run scripts locally and verify output
4. **Document**: Update relevant README/SKILL files
5. **Commit**: Use clear, descriptive commit messages
6. **Tag**: Consider tagging releases with skill versions

## Support & Documentation

- **azure-devops-batch** specifics: See `azure-devops-batch/README.md`
- **team-performance-analysis** specifics: See `team-performance-analysis/README.md`
- **Workflow guidance**: See [WORKFLOW.md](./WORKFLOW.md)
- **API reference**: See `azure-devops-batch/references/ado-batch-api-reference.md`
- **Common issues**: See docs/TROUBLESHOOTING.md

## License

MIT
