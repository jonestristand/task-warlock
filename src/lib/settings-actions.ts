'use server';

import { revalidatePath } from 'next/cache';

import { AppSettings, getSettings, getSettingsFilePath, updateSettings } from './settings';

/**
 * Server action to get current settings
 */
export async function getSettingsAction(): Promise<AppSettings> {
  return await getSettings();
}

/**
 * Server action to update settings
 */
export async function updateSettingsAction(updates: Partial<AppSettings>): Promise<void> {
  await updateSettings(updates);
  // Revalidate all pages to pick up new settings
  revalidatePath('/', 'layout');
}

/**
 * Server action to get settings file path
 */
export async function getSettingsFilePathAction(): Promise<string> {
  return await getSettingsFilePath();
}
