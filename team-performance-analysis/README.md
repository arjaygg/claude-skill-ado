# Team Performance Analysis Skill

Analyze Azure DevOps work item data to generate comprehensive team performance metrics.

## Features

- **Configuration-Driven**: Uses TOON format for team members and analysis parameters
- **No Hardcoding**: All values read from configuration files
- **Multiple Metrics**: Cycle time, estimation accuracy, work item age, patterns, and more
- **Flexible Output**: JSON for structured data, TOON for LLM-friendly summaries
- **Reusable**: Works across different teams and projects

## Quick Start

### 1. Install Dependencies

```bash
cd scripts
npm install
```

### 2. Create Team Members File (TOON format)

**team_members.toon** (static reference, reused across analyses):
```toon
[N]{display_name,ado_identity,email,status,role}:
  Jude Marco Bayot,Jude Marco Bayot <JudeMarco.Bayot@ph.axos.com>,JudeMarco.Bayot@ph.axos.com,active,developer
  Christopher Reyes,Christopher Reyes <Christopher.Reyes@ph.axos.com>,Christopher.Reyes@ph.axos.com,active,developer
```

### 3. Collect Work Item Data

Use the `azure-devops-batch` skill to fetch work items and save as JSON:

```bash
# This creates: data/july_november_2025/all_work_items_july_november_2025.json
```

### 4. Run Interactive Analysis (Recommended)

```bash
cd scripts
npm run analyze
```

The script will **prompt you interactively** for:
- ✅ Data file location
- ✅ Date range (start/end)
- ✅ Which metrics to run
- ✅ Threshold values
- ✅ Output directory

**No config file needed!** Just answer the questions.

### 5. Alternative: File-Based Config (Optional)

If you prefer config files, create `analysis_config.toon`:

```toon
[1]{key,value}:
  data_dir,/path/to/data
  output_dir,/path/to/output
  date_range_start,2025-07-01
  date_range_end,2025-11-21
  metrics,cycle_time,estimation_accuracy
  age_threshold_days,60
  high_variance_threshold_pct,50
```

Then run:
```bash
npm run analyze:file team_members.toon analysis_config.toon data/work_items.json
```

## Available Metrics

- **cycle_time**: Time from creation to completion
- **estimation_accuracy**: Compare estimates vs actuals
- **work_item_age**: Age of incomplete items
- **work_patterns**: Creation vs completion patterns
- **state_distribution**: Track state changes over time
- **reopened_items**: Identify rework and quality issues

## Output Files

Analysis results are saved to the configured output directory:

- `analysis_results.json` - Complete structured metrics
- `cycle_time_summary.toon` - Cycle time summary (TOON format)
- `estimation_accuracy_summary.toon` - Estimation summary (TOON format)

## Integration with Azure DevOps Batch Skill

This skill works seamlessly with `azure-devops-batch`:

1. **Data Collection** (azure-devops-batch): Fetch work items from ADO
2. **Analysis** (team-performance-analysis): Calculate metrics
3. **Reporting**: Use results for retrospectives, planning, improvement

## Configuration Format

### Team Members (TOON)

```toon
[N]{display_name,ado_identity,email,status,role}:
  Name1,Identity1,email1,active,role1
  Name2,Identity2,email2,active,role2
```

### Analysis Config (TOON)

```toon
[1]{key,value}:
  data_dir,path/to/data
  output_dir,path/to/output
  date_range_start,YYYY-MM-DD
  date_range_end,YYYY-MM-DD
  metrics,comma,separated,list
  age_threshold_days,60
  high_variance_threshold_pct,50
```

## Development

### Adding New Metrics

1. Create new file in `scripts/metrics/your-metric.ts`
2. Export analysis function matching pattern
3. Add TOON formatter function
4. Import and call in `analyze-team-performance.ts`

### Running Tests

```bash
npm run build
npm test
```

## License

MIT
