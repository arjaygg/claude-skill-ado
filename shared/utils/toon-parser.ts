/**
 * TOON format parser - Shared utility for all skills
 * Reads TOON configuration files for team members and analysis config
 */

import fs from 'fs';
import path from 'path';

export interface TeamMember {
  displayName: string;
  adoIdentity?: string;
  email?: string;
  status?: string;
  role?: string;
}

export interface AnalysisConfig {
  dataFile?: string;
  outputDir?: string;
  dateRangeStart?: string;
  dateRangeEnd?: string;
  teamMembersFile?: string;
  focusMonths?: string[];
  rateLimitProgressInterval?: number;
  rateLimitDelayInterval?: number;
  rateLimitDelayMs?: number;
  outputSampleSize?: number;
  metrics?: string[];
  ageThresholdDays?: number;
  highVarianceThresholdPct?: number;
  [key: string]: any;
}

/**
 * Parse team members from TOON file
 * Format: [N]{display_name,ado_identity,email,status,role}:
 *
 * Example:
 * [N]{display_name,ado_identity,email,status,role}:
 *   Jude Marco Bayot,Jude Marco Bayot <JudeMarco.Bayot@ph.axos.com>,JudeMarco.Bayot@ph.axos.com,active,developer
 *   Christopher Reyes,Christopher Reyes <Christopher.Reyes@ph.axos.com>,Christopher.Reyes@ph.axos.com,active,developer
 */
export function parseTeamMembers(toonFilePath: string): TeamMember[] {
  if (!fs.existsSync(toonFilePath)) {
    throw new Error(`TOON file not found: ${toonFilePath}`);
  }

  const content = fs.readFileSync(toonFilePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('['));

  const members: TeamMember[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Parse CSV line: DisplayName,ADO Identity,email,status,role
    const parts = parseCsvLine(trimmed);
    if (parts.length >= 1) {
      members.push({
        displayName: parts[0],
        adoIdentity: parts[1] || undefined,
        email: parts[2] || undefined,
        status: parts[3] || undefined,
        role: parts[4] || undefined
      });
    }
  }

  return members;
}

/**
 * Parse analysis configuration from TOON file
 * Format: [1]{key,value}:
 *
 * Example:
 * [1]{key,value}:
 *   data_file,data/july_november_2025/all_work_items_july_november_2025.json
 *   output_dir,data/july_november_2025/history_detailed
 *   date_range_start,2025-07-01
 *   date_range_end,2025-11-21
 */
export function parseAnalysisConfig(toonFilePath: string): AnalysisConfig {
  if (!fs.existsSync(toonFilePath)) {
    console.warn(`⚠️  Config file not found: ${toonFilePath}`);
    return {};
  }

  const content = fs.readFileSync(toonFilePath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('['));

  const configMap: Record<string, string> = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = parseCsvLine(trimmed);
    if (parts.length >= 2) {
      configMap[parts[0]] = parts[1];
    }
  }

  // Build config object with type conversions
  const config: AnalysisConfig = {
    dataFile: configMap.data_file,
    outputDir: configMap.output_dir,
    dateRangeStart: configMap.date_range_start,
    dateRangeEnd: configMap.date_range_end,
    teamMembersFile: configMap.team_members_file,
    focusMonths: configMap.focus_months ? configMap.focus_months.split(',').map(m => m.trim()) : undefined,
    rateLimitProgressInterval: configMap.rate_limit_progress_interval ? parseInt(configMap.rate_limit_progress_interval) : undefined,
    rateLimitDelayInterval: configMap.rate_limit_delay_interval ? parseInt(configMap.rate_limit_delay_interval) : undefined,
    rateLimitDelayMs: configMap.rate_limit_delay_ms ? parseInt(configMap.rate_limit_delay_ms) : undefined,
    outputSampleSize: configMap.output_sample_size ? parseInt(configMap.output_sample_size) : undefined,
    metrics: configMap.metrics ? configMap.metrics.split(',').map(m => m.trim()) : undefined,
    ageThresholdDays: configMap.age_threshold_days ? parseInt(configMap.age_threshold_days) : undefined,
    highVarianceThresholdPct: configMap.high_variance_threshold_pct ? parseInt(configMap.high_variance_threshold_pct) : undefined
  };

  // Remove undefined values
  return Object.fromEntries(Object.entries(config).filter(([_, v]) => v !== undefined));
}

/**
 * Parse a CSV line, handling quoted values
 */
function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current) {
    parts.push(current.trim());
  }

  return parts;
}

/**
 * Get team member display names for filtering
 */
export function getTeamMemberNames(members: TeamMember[]): string[] {
  return members
    .filter(m => m.displayName)
    .map(m => m.displayName);
}

/**
 * Convert team members to TOON format for output
 */
export function teamMembersToToon(members: TeamMember[]): string {
  let output = '[N]{display_name,ado_identity,email,status,role}:\n';

  for (const member of members) {
    const adoIdentity = member.adoIdentity || '';
    const email = member.email || '';
    const status = member.status || '';
    const role = member.role || '';
    output += `  ${member.displayName},${adoIdentity},${email},${status},${role}\n`;
  }

  return output;
}

/**
 * Convert analysis config to TOON format for output
 */
export function analysisConfigToToon(config: AnalysisConfig): string {
  let output = '[1]{key,value}:\n';

  if (config.dataFile) output += `  data_file,${config.dataFile}\n`;
  if (config.outputDir) output += `  output_dir,${config.outputDir}\n`;
  if (config.dateRangeStart) output += `  date_range_start,${config.dateRangeStart}\n`;
  if (config.dateRangeEnd) output += `  date_range_end,${config.dateRangeEnd}\n`;
  if (config.teamMembersFile) output += `  team_members_file,${config.teamMembersFile}\n`;
  if (config.focusMonths) output += `  focus_months,${config.focusMonths.join(',')}\n`;
  if (config.rateLimitProgressInterval) output += `  rate_limit_progress_interval,${config.rateLimitProgressInterval}\n`;
  if (config.rateLimitDelayInterval) output += `  rate_limit_delay_interval,${config.rateLimitDelayInterval}\n`;
  if (config.rateLimitDelayMs) output += `  rate_limit_delay_ms,${config.rateLimitDelayMs}\n`;
  if (config.outputSampleSize) output += `  output_sample_size,${config.outputSampleSize}\n`;
  if (config.metrics) output += `  metrics,${config.metrics.join(',')}\n`;
  if (config.ageThresholdDays) output += `  age_threshold_days,${config.ageThresholdDays}\n`;
  if (config.highVarianceThresholdPct) output += `  high_variance_threshold_pct,${config.highVarianceThresholdPct}\n`;

  return output;
}

/**
 * Resolve file path - support relative paths from project root
 */
export function resolvePath(filePath: string, baseDir: string = process.cwd()): string {
  if (path.isAbsolute(filePath)) {
    return filePath;
  }
  return path.resolve(baseDir, filePath);
}
