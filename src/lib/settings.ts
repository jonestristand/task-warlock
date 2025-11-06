import fs from 'fs/promises';
import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

import type { Theme } from '@/components/providers/ThemeProvider';

/**
 * Detect if we're running in a Docker container
 */
function isDocker(): boolean {
  try {
    // Check for /.dockerenv file (standard Docker indicator)
    return existsSync('/.dockerenv');
  } catch {
    return false;
  }
}

/**
 * Get default settings file path based on environment
 */
function getDefaultSettingsPath(): string {
  if (isDocker()) {
    // Docker: use ~/.taskwarlock/settings.json
    return path.join(homedir(), '.taskwarlock', 'settings.json');
  } else {
    // Native:use XDG_CONFIG_HOME or fallback to ~/.config/taskwarlock/settings.json
    const xdgConfigHome = process.env.XDG_CONFIG_HOME || path.join(homedir(), '.config');
    return path.join(xdgConfigHome, 'taskwarlock', 'settings.json');
  }
}

// Settings file path: env var takes priority, then auto-detect environment
const SETTINGS_FILE = process.env.SETTINGS_FILE || getDefaultSettingsPath();

export interface UrgencyCoefficients {
  next: number; // Special "next" tag
  due: number; // Due date
  priorityH: number; // High priority
  priorityM: number; // Medium priority
  priorityL: number; // Low priority
  age: number; // Task age
  tags: number; // Tags present
  project: number; // Project assigned
}

export interface AppSettings {
  autoSync: boolean;
  theme: Theme; // Default theme for new sessions (current theme stored in localStorage)
  urgencyAgeMax: number;
  urgencyCoefficients: UrgencyCoefficients;
  defaultPageSize: number; // Default items per page in task table
}

const DEFAULT_SETTINGS: AppSettings = {
  autoSync: false,
  theme: 'catppuccin-mocha',
  urgencyAgeMax: 365,
  defaultPageSize: 20,
  urgencyCoefficients: {
    next: 15.0,
    due: 12.0,
    priorityH: 6.0,
    priorityM: 3.9,
    priorityL: 1.8,
    age: 2.0,
    tags: 1.0,
    project: 1.0,
  },
};

// In-memory cache for settings
let settingsCache: AppSettings | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5000; // 5 seconds

/**
 * Parse settings file content (JSON only)
 */
function parseSettings(content: string): Partial<AppSettings> {
  return JSON.parse(content);
}

/**
 * Stringify settings to JSON format
 */
function stringifySettings(settings: AppSettings): string {
  return JSON.stringify(settings, null, 2);
}

/**
 * Initialize settings file if it doesn't exist
 */
async function initSettings(): Promise<void> {
  try {
    await fs.access(SETTINGS_FILE);
    // File exists, do nothing
  } catch {
    // File doesn't exist, create it with defaults
    console.log(`Creating default settings file at ${SETTINGS_FILE}`);
    await fs.mkdir(path.dirname(SETTINGS_FILE), { recursive: true });
    const content = stringifySettings(DEFAULT_SETTINGS);
    await fs.writeFile(SETTINGS_FILE, content, 'utf-8');
  }
}

/**
 * Get application settings (cached)
 */
export async function getSettings(): Promise<AppSettings> {
  const now = Date.now();

  // Return cached settings if still valid
  if (settingsCache && now - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  // Initialize file if needed
  await initSettings();

  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const parsed = parseSettings(content);

    // Deep merge: ensure urgencyCoefficients are merged properly
    settingsCache = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      urgencyCoefficients: {
        ...DEFAULT_SETTINGS.urgencyCoefficients,
        ...(parsed.urgencyCoefficients || {}),
      },
    };

    cacheTimestamp = now;
    return settingsCache;
  } catch (error) {
    console.error('Error reading settings file, using defaults:', error);
    settingsCache = DEFAULT_SETTINGS;
    cacheTimestamp = now;
    return settingsCache;
  }
}

/**
 * Update application settings
 */
export async function updateSettings(updates: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const updated = { ...current, ...updates };

  try {
    const content = stringifySettings(updated);
    await fs.writeFile(SETTINGS_FILE, content, 'utf-8');

    // Update cache
    settingsCache = updated;
    cacheTimestamp = Date.now();
  } catch (error) {
    console.error('Error writing settings file:', error);
    throw error;
  }
}

/**
 * Get settings file path (useful for debugging)
 */
export async function getSettingsFilePath(): Promise<string> {
  return SETTINGS_FILE;
}

/**
 * Clear settings cache (useful for testing)
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}
