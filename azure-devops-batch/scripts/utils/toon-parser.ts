/**
 * TOON format parser for Azure DevOps batch operations
 * Reads TOON configuration files for team members
 */

import fs from 'fs';

export interface TeamMember {
  displayName: string;
  adoIdentity?: string;
  email?: string;
  status?: string;
  role?: string;
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
 * Get team member display names for filtering
 */
export function getTeamMemberNames(members: TeamMember[]): string[] {
  return members
    .filter(m => m.displayName)
    .map(m => m.displayName);
}
