/**
 * Data loading utilities
 * Load JSON work item data from Azure DevOps
 */

import fs from 'fs';
import { WorkItem, AssignedTo } from '../types.js';

/**
 * Load work items from JSON file
 */
export function loadWorkItems(filePath: string): WorkItem[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Extract field value from work item
 */
export function extractField<T = any>(item: WorkItem, fieldName: string, defaultValue: T | null = null): T | null {
  return item.fields[fieldName] ?? defaultValue;
}

/**
 * Get display name from AssignedTo field
 */
export function getAssignedToName(assignedTo: AssignedTo | string | undefined): string {
  if (!assignedTo) return 'Unassigned';

  if (typeof assignedTo === 'string') {
    return assignedTo;
  }

  return assignedTo.displayName || 'Unknown';
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;

  try {
    return new Date(dateStr.replace('Z', '+00:00'));
  } catch {
    return null;
  }
}

/**
 * Extract YYYY-MM from date string
 */
export function getMonth(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null;
  return dateStr.substring(0, 7);
}

/**
 * Filter work items by date range
 */
export function filterByDateRange(
  items: WorkItem[],
  startDate: string,
  endDate: string,
  dateField: string = 'System.CreatedDate'
): WorkItem[] {
  return items.filter(item => {
    const date = extractField<string>(item, dateField);
    if (!date) return false;
    return date >= startDate && date <= endDate;
  });
}

/**
 * Filter work items by team members
 */
export function filterByTeamMembers(
  items: WorkItem[],
  teamMemberNames: string[]
): WorkItem[] {
  return items.filter(item => {
    const assignedTo = extractField<AssignedTo | string>(item, 'System.AssignedTo');
    const assignedName = getAssignedToName(assignedTo);
    return teamMemberNames.includes(assignedName);
  });
}

/**
 * Group work items by field value
 */
export function groupBy<T extends string | number>(
  items: WorkItem[],
  fieldName: string,
  extractor?: (value: any) => T
): Record<T, WorkItem[]> {
  const groups: Record<T, WorkItem[]> = {} as Record<T, WorkItem[]>;

  for (const item of items) {
    const value = extractField(item, fieldName);
    const key = extractor ? extractor(value) : (value as T);

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }

  return groups;
}

/**
 * Calculate statistics (mean, median, etc.)
 */
export function calculateStats(values: number[]): {
  avg: number;
  median: number;
  min: number;
  max: number;
  count: number;
} {
  if (values.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((acc, val) => acc + val, 0);

  return {
    avg: sum / values.length,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: values.length
  };
}
