// TaskWarrior core: runs the `task` CLI and parses its output.
//
// Deliberately NOT a 'use server' module. Every export of a 'use server' file
// becomes a public, unauthenticated server action, so code that must only be
// reachable through an authenticated path (e.g. the MCP endpoint) lives here
// and is imported by server code instead.
import { execa } from 'execa';

import { type Task, TaskListSchema } from './schemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Callers can pass arbitrary input, and TaskWarrior treats this argument as a
// filter, so "1-5" or "status:pending" would target many tasks
export function assertUuid(uuid: string): void {
  if (!UUID_RE.test(uuid)) throw new Error(`Invalid task UUID: ${uuid}`);
}

// Never let TaskWarrior wait on an interactive prompt (e.g. bulk confirmation):
// with stdin closed it answers "no" immediately; the timeout is a safety net
export function task(args: string[]) {
  return execa('task', args, { stdin: 'ignore', timeout: 30_000 });
}

export const formatDateForTaskWarrior = (date: Date): string => {
  // Format as YYYY-MM-DDTHH:MM:SSZ for TaskWarrior
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const minute = date.getUTCMinutes().toString().padStart(2, '0');
  const second = date.getUTCSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
};

// Export and validate the tasks matching a TaskWarrior filter
export async function exportTasks(filter: string[]): Promise<Task[]> {
  const { stdout } = await task([...filter, 'export']);
  if (!stdout.trim()) return [];
  return TaskListSchema.parse(JSON.parse(stdout));
}

// TaskWarrior's own JSON for each matching task, with every attribute
// (annotations, wait, scheduled, UDAs, ...) rather than the UI's subset
export async function exportRawTasks(filter: string[]): Promise<Record<string, unknown>[]> {
  const { stdout } = await task([...filter, 'export']);
  if (!stdout.trim()) return [];
  return JSON.parse(stdout);
}

export async function fetchTags(): Promise<string[]> {
  const { stdout } = await task(['_unique', 'tags']);
  const tags = new Set<string>();
  for (const line of stdout.split('\n')) {
    // Each line is a comma-separated tag list
    for (const tag of line.split(',')) {
      const clean = tag.trim();
      if (clean) tags.add(clean);
    }
  }
  return Array.from(tags).sort();
}

export async function fetchProjects(): Promise<string[]> {
  const { stdout } = await task(['_projects']);
  return stdout
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .sort();
}
