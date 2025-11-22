---
name: team-performance-analysis
description: Team performance metrics and analysis specialist. Analyzes Azure DevOps work item data to calculate cycle times, estimation accuracy, work patterns, and team productivity metrics.
---

# Team Performance Analysis Skill

You are a team performance analysis expert. This skill enables you to analyze Azure DevOps work item data and generate comprehensive metrics about team performance, productivity, and work patterns.

## Core Capabilities

### 1. Metrics Analysis
- **Cycle Time Analysis**: Calculate time from creation to completion
- **Estimation Accuracy**: Compare original estimates vs actual work
- **Work Item Age**: Analyze age of incomplete items
- **Work Patterns**: Analyze creation vs completion patterns
- **State Distribution**: Track work item states over time
- **Reopened Items**: Identify quality issues and rework
- **Team Productivity**: Compare metrics across team members

### 2. Interactive & Configuration-Driven
- **Interactive mode (default)**: Prompts for date ranges, metrics, and parameters
- Reads team members from **TOON file** (static reference)
- Optional config file support for automation
- NO hardcoded values - fully parameterized
- Reusable across different teams and projects

### 3. Data Format Support
- **Input**: JSON (native ADO API format)
- **Configuration**: TOON (team members, analysis params)
- **Output**: JSON (structured metrics) + TOON (summaries for LLM)

## Key Analysis Functions

### Cycle Time Analysis
Calculate average, median, and distribution of completion times:
- By team member
- By month
- By work item type
- Identify bottlenecks and trends

### Estimation Accuracy
Compare estimates vs actuals:
- Total variance by member
- Individual item variance
- High-variance items (>50% off)
- Trends over time
- Improvement or degradation patterns

### Work Item Age
Analyze incomplete work items:
- Average age by member
- Items older than threshold (e.g., 60 days)
- Oldest items needing attention
- State distribution of aged items

### Work Patterns
Understand work flow:
- Creation vs completion by month
- Backlog growth/shrinkage
- Work item size distribution
- Complexity analysis

### State Distribution
Track work item states:
- State changes over time
- Current state breakdown
- Completion rates
- Items stuck in specific states

## Configuration Files

### team_members.toon
Define team roster:
```toon
[N]{display_name,ado_identity,email,status,role}:
  Jude Marco Bayot,Jude Marco Bayot <JudeMarco.Bayot@ph.axos.com>,JudeMarco.Bayot@ph.axos.com,active,developer
  Christopher Reyes,Christopher Reyes <Christopher.Reyes@ph.axos.com>,Christopher.Reyes@ph.axos.com,active,developer
  James Aaron Constantino,James Aaron Constantino <James.Constantino@ph.axos.com>,James.Constantino@ph.axos.com,active,developer
  Erwin Biglang-awa,Erwin Biglang-awa <Erwin.BiglangAwa@ph.axos.com>,Erwin.BiglangAwa@ph.axos.com,active,developer
```

### analysis_config.toon
Define analysis parameters:
```toon
[1]{key,value}:
  data_dir,data/july_november_2025
  output_dir,data/july_november_2025/analysis
  date_range_start,2025-07-01
  date_range_end,2025-11-21
  metrics,cycle_time,estimation_accuracy,work_item_age,work_patterns,state_distribution,reopened_items
  age_threshold_days,60
  high_variance_threshold_pct,50
```

## Usage Examples

### Example 1: Interactive Analysis (Recommended)
```bash
cd ~/.claude/skills/team-performance-analysis/scripts
npm run analyze
```

The script will prompt you for:
- Data file location
- Date range (start/end)
- Which metrics to run
- Threshold values
- Output directory

**No config file needed!**

### Example 2: Automated with Config File
```bash
npx tsx analyze-team-performance.ts \
  team_members.toon \
  analysis_config.toon \
  data/work_items.json
```

### Example 3: Programmatic Usage
```typescript
import { analyzeTeamPerformance } from './analyze-team-performance.js';

const results = await analyzeTeamPerformance({
  teamMembersFile: 'docs/context/team_members.toon',
  configFile: 'analysis_config.toon',
  workItemsFile: 'data/july_november_2025/all_work_items_july_november_2025.json',
  metrics: 'all'
});
```

## Output Formats

### JSON Output (Structured Metrics)
```json
{
  "cycleTime": {
    "byMember": {
      "Jude Marco Bayot": {
        "avg": 12.5,
        "median": 10.0,
        "count": 45
      }
    }
  },
  "estimationAccuracy": {
    "byMember": {
      "Jude Marco Bayot": {
        "totalEstimate": 320.0,
        "totalActual": 340.0,
        "variancePct": 6.25
      }
    }
  }
}
```

### TOON Output (LLM Summary)
```toon
[N]{member,avg_cycle_time,completion_rate,estimation_variance}:
  Jude Marco Bayot,12.5,89.5,+6.25
  Christopher Reyes,14.2,92.1,-2.10
  James Aaron Constantino,11.8,87.3,+8.50
  Erwin Biglang-awa,13.1,90.2,+4.75
```

## Best Practices

### 1. Configuration Management
- Always use TOON files for configuration
- NEVER hardcode team members or parameters
- Version control configuration files
- Keep sensitive data (PAT tokens) in environment variables

### 2. Data Quality
- Validate input data before analysis
- Handle missing or null fields gracefully
- Report data quality issues clearly
- Cross-validate metrics when possible

### 3. Analysis Interpretation
- Provide context with metrics (sample size, date range)
- Identify outliers and explain them
- Compare against baselines or previous periods
- Avoid drawing conclusions from insufficient data

### 4. Performance
- Process large datasets in chunks
- Cache intermediate results
- Use TypeScript for better performance than Python
- Parallelize independent metric calculations

## Common Use Cases

### Use Case 1: Sprint Retrospective Analysis
Analyze team performance for sprint review:
1. Load work items from sprint
2. Calculate cycle time and completion rate
3. Identify blockers and bottlenecks
4. Generate summary for retrospective discussion

### Use Case 2: Estimation Improvement
Track estimation accuracy over time:
1. Calculate variance for past sprints
2. Identify consistently over/under-estimated item types
3. Track improvement trends
4. Provide feedback for refinement meetings

### Use Case 3: Team Capacity Planning
Understand team throughput:
1. Analyze historical completion rates
2. Calculate average velocity
3. Identify seasonal patterns
4. Project future capacity

### Use Case 4: Performance Comparison
Compare different periods or teams:
1. Define comparison periods
2. Calculate same metrics for each
3. Identify trends and changes
4. Generate comparison report

## Environment Variables Required

```bash
# No ADO PAT needed - this skill only analyzes existing data
# All configuration via TOON files
```

## Script Structure

```
team-performance-analysis/
├── skill.md                          # This file
├── scripts/
│   ├── package.json                  # Dependencies
│   ├── tsconfig.json                 # TypeScript config
│   ├── analyze-team-performance.ts   # Main orchestrator
│   ├── config-loader.ts              # TOON config reader
│   ├── types.ts                      # TypeScript interfaces
│   ├── metrics/
│   │   ├── cycle-time.ts             # Cycle time analysis
│   │   ├── estimation-accuracy.ts    # Estimation analysis
│   │   ├── work-item-age.ts          # Age analysis
│   │   ├── work-patterns.ts          # Pattern analysis
│   │   ├── state-distribution.ts     # State analysis
│   │   └── reopened-items.ts         # Rework analysis
│   └── utils/
│       ├── data-loader.ts            # JSON data loading
│       ├── toon-parser.ts            # TOON parsing utilities
│       └── output-formatter.ts       # JSON/TOON output
└── examples/
    ├── analysis_config.toon          # Example config
    └── run-full-analysis.ts          # Example usage
```

## Installation

```bash
cd ~/.claude/skills/team-performance-analysis/scripts
npm install
```

### Dependencies
```json
{
  "dependencies": {
    "@toon-format/toon": "^0.1.0",
    "dotenv": "^17.2.3"
  }
}
```

## Getting Started

1. **Create configuration files**:
   - `team_members.toon` with team roster
   - `analysis_config.toon` with parameters

2. **Collect work item data** (use azure-devops-batch skill):
   ```bash
   # Use azure-devops-batch to fetch data first
   ```

3. **Run analysis**:
   ```bash
   npx tsx scripts/analyze-team-performance.ts
   ```

4. **Review results**:
   - JSON files with detailed metrics
   - TOON summaries for LLM consumption
   - Console output with key findings

## Integration with Other Skills

### Works with azure-devops-batch
1. Use `azure-devops-batch` to collect work item data
2. Save data as JSON (native ADO format)
3. Use `team-performance-analysis` to analyze data
4. Generate reports and insights

### Workflow Example
```typescript
// 1. Collect data (azure-devops-batch skill)
const workItems = await fetchWorkItems({ /* config */ });
fs.writeFileSync('data/work_items.json', JSON.stringify(workItems));

// 2. Analyze data (team-performance-analysis skill)
const analysis = await analyzeTeamPerformance({
  workItemsFile: 'data/work_items.json',
  teamMembersFile: 'team_members.toon',
  configFile: 'analysis_config.toon'
});

// 3. Generate report
generateReport(analysis);
```

## Important Notes

### Data Privacy
- Work item data may contain sensitive information
- Store data files in git-ignored directories
- Never commit PAT tokens or sensitive team data
- Follow organizational data handling policies

### Metric Interpretation
- Always consider context (team size, project phase, etc.)
- Metrics are indicators, not absolute measures
- Combine quantitative metrics with qualitative feedback
- Use for continuous improvement, not punitive measures

### Customization
- Add custom metrics by creating new files in `metrics/`
- Extend TOON config format as needed
- Create project-specific analysis scripts
- Share reusable utilities back to this skill

---

**Remember**: This skill analyzes data for insights. Use metrics to understand patterns, identify improvements, and support team growth - not for individual performance reviews or punitive measures.
