/**
 * Validation Utility
 *
 * Centralized validation functions for configuration and data.
 * Returns validation results with detailed error messages.
 */

import fs from 'fs';
import { AnalysisConfig, TeamMember } from '../types.js';

/**
 * Validation result structure
 */
export interface ValidationResult<T = any> {
  valid: boolean;
  errors: string[];
  data?: T;
}

/**
 * Check if date string is valid YYYY-MM-DD format
 */
export function isValidDateFormat(dateString: string): boolean {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }

  // Check format: YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) {
    return false;
  }

  // Check if it's a valid date
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Validate analysis configuration
 */
export function validateAnalysisConfig(
  config: any
): ValidationResult<AnalysisConfig> {
  const errors: string[] = [];

  // Check required fields
  if (!config) {
    return { valid: false, errors: ['Configuration is null or undefined'] };
  }

  if (typeof config !== 'object') {
    return { valid: false, errors: ['Configuration must be an object'] };
  }

  // Validate dataFile
  if (!config.dataFile) {
    errors.push('Missing required field: dataFile');
  } else if (typeof config.dataFile !== 'string') {
    errors.push('dataFile must be a string path');
  } else if (!fs.existsSync(config.dataFile)) {
    errors.push(`Data file not found: ${config.dataFile}`);
  }

  // Validate outputDir
  if (!config.outputDir) {
    errors.push('Missing required field: outputDir');
  } else if (typeof config.outputDir !== 'string') {
    errors.push('outputDir must be a string path');
  }

  // Validate date range if provided
  if (config.dateRangeStart) {
    if (!isValidDateFormat(config.dateRangeStart)) {
      errors.push(
        `Invalid dateRangeStart format. Expected YYYY-MM-DD, got: ${config.dateRangeStart}`
      );
    }
  }

  if (config.dateRangeEnd) {
    if (!isValidDateFormat(config.dateRangeEnd)) {
      errors.push(
        `Invalid dateRangeEnd format. Expected YYYY-MM-DD, got: ${config.dateRangeEnd}`
      );
    }
  }

  // Validate date range order if both provided
  if (
    config.dateRangeStart &&
    config.dateRangeEnd &&
    isValidDateFormat(config.dateRangeStart) &&
    isValidDateFormat(config.dateRangeEnd)
  ) {
    const start = new Date(config.dateRangeStart);
    const end = new Date(config.dateRangeEnd);
    if (start > end) {
      errors.push(
        `dateRangeStart must be before dateRangeEnd (${config.dateRangeStart} > ${config.dateRangeEnd})`
      );
    }
  }

  // Validate thresholds if provided
  if (
    config.ageThresholdDays !== undefined &&
    (typeof config.ageThresholdDays !== 'number' ||
      config.ageThresholdDays <= 0)
  ) {
    errors.push('ageThresholdDays must be a positive number');
  }

  if (
    config.highVarianceThresholdPct !== undefined &&
    (typeof config.highVarianceThresholdPct !== 'number' ||
      config.highVarianceThresholdPct < 0 ||
      config.highVarianceThresholdPct > 100)
  ) {
    errors.push('highVarianceThresholdPct must be a number between 0 and 100');
  }

  // Validate rate limit settings if provided
  if (config.rateLimit) {
    if (
      config.rateLimit.progressInterval !== undefined &&
      (typeof config.rateLimit.progressInterval !== 'number' ||
        config.rateLimit.progressInterval <= 0)
    ) {
      errors.push('rateLimit.progressInterval must be a positive number');
    }

    if (
      config.rateLimit.delayInterval !== undefined &&
      (typeof config.rateLimit.delayInterval !== 'number' ||
        config.rateLimit.delayInterval <= 0)
    ) {
      errors.push('rateLimit.delayInterval must be a positive number');
    }

    if (
      config.rateLimit.delayMs !== undefined &&
      (typeof config.rateLimit.delayMs !== 'number' ||
        config.rateLimit.delayMs < 0 ||
        config.rateLimit.delayMs > 60000)
    ) {
      errors.push(
        'rateLimit.delayMs must be a number between 0 and 60000 (ms)'
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? config : undefined,
  };
}

/**
 * Validate work item IDs
 */
export function validateWorkItemIds(
  ids: any
): ValidationResult<number[]> {
  const errors: string[] = [];

  if (!Array.isArray(ids)) {
    return { valid: false, errors: ['workItemIds must be an array'] };
  }

  if (ids.length === 0) {
    return { valid: false, errors: ['workItemIds cannot be empty'] };
  }

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      errors.push(
        `workItemIds[${i}] must be a positive integer, got: ${JSON.stringify(id)}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? ids : undefined,
  };
}

/**
 * Validate team members
 */
export function validateTeamMembers(
  members: any
): ValidationResult<TeamMember[]> {
  const errors: string[] = [];

  if (!Array.isArray(members)) {
    return { valid: false, errors: ['teamMembers must be an array'] };
  }

  if (members.length === 0) {
    errors.push('Warning: teamMembers array is empty (no team members defined)');
  }

  for (let i = 0; i < members.length; i++) {
    const member = members[i];

    if (typeof member !== 'object' || member === null) {
      errors.push(`teamMembers[${i}] must be an object`);
      continue;
    }

    if (!member.displayName) {
      errors.push(`teamMembers[${i}].displayName is required`);
    } else if (typeof member.displayName !== 'string') {
      errors.push(`teamMembers[${i}].displayName must be a string`);
    }

    if (!member.adoIdentity) {
      errors.push(`teamMembers[${i}].adoIdentity is required`);
    } else if (typeof member.adoIdentity !== 'string') {
      errors.push(`teamMembers[${i}].adoIdentity must be a string`);
    }

    if (!member.email) {
      errors.push(`teamMembers[${i}].email is required`);
    } else if (typeof member.email !== 'string') {
      errors.push(`teamMembers[${i}].email must be a string`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? members : undefined,
  };
}

/**
 * Validate numeric value is within range
 */
export function validateNumberRange(
  value: any,
  fieldName: string,
  min?: number,
  max?: number
): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return `${fieldName} must be a valid number`;
  }

  if (min !== undefined && value < min) {
    return `${fieldName} must be >= ${min}, got ${value}`;
  }

  if (max !== undefined && value > max) {
    return `${fieldName} must be <= ${max}, got ${value}`;
  }

  return null;
}

/**
 * Validate string is not empty
 */
export function validateNonEmptyString(
  value: any,
  fieldName: string
): string | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} must be a non-empty string`;
  }
  return null;
}

/**
 * Validate array is not empty
 */
export function validateNonEmptyArray(
  value: any,
  fieldName: string
): string | null {
  if (!Array.isArray(value) || value.length === 0) {
    return `${fieldName} must be a non-empty array`;
  }
  return null;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(
  errors: string[],
  title?: string
): string {
  if (errors.length === 0) {
    return '';
  }

  let output = title ? `${title}\n` : '';
  errors.forEach((error) => {
    output += `  • ${error}\n`;
  });

  return output;
}
