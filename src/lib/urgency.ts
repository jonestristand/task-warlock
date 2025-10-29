// Estimate urgency for optimistic updates
// Based on TaskWarrior's urgency calculation algorithm
// See: https://taskwarrior.org/docs/urgency/
import { Task, TaskUpdate } from './schemas';
import type { UrgencyCoefficients } from './settings';

// Default coefficients from TaskWarrior
// These are used when settings are not provided
const DEFAULT_URGENCY_COEFFICIENTS = {
  next: 15.0, // Special "next" tag
  due: 12.0, // Due date
  priorityH: 6.0, // High priority
  priorityM: 3.9, // Medium priority
  priorityL: 1.8, // Low priority
  age: 2.0, // Task age
  tags: 1.0, // Tags present
  project: 1.0, // Project assigned
} as const;

// Default maximum age for urgency calculation (365 days = 1 year)
// This matches TaskWarrior's typical default
const DEFAULT_URGENCY_AGE_MAX = 365;

/**
 * Calculate urgency factor for due date using TaskWarrior's algorithm
 * Maps a 21-day window: overdue 7+ days = 1.0, within window uses linear interpolation, 14+ days future = 0.2
 */
function calculateDueFactor(due: Date): number {
  const now = new Date();
  const msInDay = 86400000;
  const daysOverdue = (now.getTime() - due.getTime()) / msInDay;

  if (daysOverdue >= 7.0) {
    // Overdue by 7+ days
    return 1.0;
  } else if (daysOverdue >= -14.0) {
    // Within 21-day window: linear interpolation
    return ((daysOverdue + 14.0) * 0.8) / 21.0 + 0.2;
  } else {
    // Due more than 14 days in future
    return 0.2;
  }
}

/**
 * Calculate urgency factor for task age using TaskWarrior's algorithm
 * Returns ratio of age to max age, capping at 1.0
 */
function calculateAgeFactor(entry: Date, ageMax: number): number {
  const now = new Date();
  const msInDay = 86400000;
  const ageDays = Math.floor((now.getTime() - entry.getTime()) / msInDay);

  if (ageDays >= ageMax) {
    return 1.0;
  }

  return ageDays / ageMax;
}

/**
 * Calculate urgency factor for tags using TaskWarrior's graduated scale
 * 1 tag = 0.8, 2 tags = 0.9, 3+ tags = 1.0
 */
function calculateTagsFactor(tags: string[]): number {
  const count = tags.length;
  if (count === 0) return 0.0;
  if (count === 1) return 0.8;
  if (count === 2) return 0.9;
  return 1.0;
}

/**
 * Estimate task urgency based on TaskWarrior's urgency calculation algorithm
 * Implements the polynomial expression with weighted coefficients for multiple factors
 *
 * @param task - Task or TaskUpdate object with priority, due date, tags, etc.
 * @param coefficients - Optional custom urgency coefficients (uses defaults if not provided)
 * @param ageMax - Optional maximum age for urgency calculation (uses default 365 if not provided)
 * @returns Estimated urgency score
 */
export function estimateUrgency(
  task: Partial<Task> | TaskUpdate,
  coefficients?: UrgencyCoefficients,
  ageMax?: number
): number {
  // Use provided coefficients or fall back to defaults
  const coeff = coefficients || DEFAULT_URGENCY_COEFFICIENTS;
  const maxAge = ageMax || DEFAULT_URGENCY_AGE_MAX;

  let urgency = 0;

  // Priority coefficient
  if (task.priority === 'H') {
    urgency += coeff.priorityH;
  } else if (task.priority === 'M') {
    urgency += coeff.priorityM;
  } else if (task.priority === 'L') {
    urgency += coeff.priorityL;
  }

  // Due date coefficient
  if (task.due instanceof Date) {
    const dueFactor = calculateDueFactor(task.due);
    urgency += coeff.due * dueFactor;
  }

  // Age coefficient
  // Note: entry date is only available on full Task objects, not TaskUpdate
  if ('entry' in task && task.entry instanceof Date) {
    const ageFactor = calculateAgeFactor(task.entry, maxAge);
    urgency += coeff.age * ageFactor;
  }

  // Tags coefficient (graduated factor)
  if (Array.isArray(task.tags) && task.tags.length > 0) {
    const tagsFactor = calculateTagsFactor(task.tags);
    urgency += coeff.tags * tagsFactor;

    // Special "next" tag gets additional boost
    if (task.tags.includes('next')) {
      urgency += coeff.next;
    }
  }

  // Project coefficient
  if (task.project) {
    urgency += coeff.project;
  }

  return urgency;
}