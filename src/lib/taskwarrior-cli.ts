'use server';

import { execa } from 'execa';

import { type Task, TaskAdd, TaskSchema, TaskUpdate } from './schemas';
import { TaskListSchema } from './schemas';
import { getSettings } from './settings';
import {
  DEFAULT_URGENCY_AGE_MAX,
  DEFAULT_URGENCY_COEFFICIENTS,
  type UrgencyConfig,
} from './urgency';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server actions can be called with arbitrary input, and TaskWarrior treats this
// argument as a filter, so "1-5" or "status:pending" would target many tasks
function assertUuid(uuid: string): void {
  if (!UUID_RE.test(uuid)) throw new Error(`Invalid task UUID: ${uuid}`);
}

// Never let TaskWarrior wait on an interactive prompt (e.g. bulk confirmation):
// with stdin closed it answers "no" immediately; the timeout is a safety net
function task(args: string[]) {
  return execa('task', args, { stdin: 'ignore', timeout: 30_000 });
}

const formatDateForTaskWarrior = (date: Date): string => {
  // Format as YYYY-MM-DDTHH:MMZ for TaskWarrior
  const year = date.getUTCFullYear().toString();
  const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = date.getUTCDate().toString().padStart(2, '0');
  const hour = date.getUTCHours().toString().padStart(2, '0');
  const minute = date.getUTCMinutes().toString().padStart(2, '0');
  const second = date.getUTCSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
};

/**
 * Run TaskWarrior sync if auto-sync is enabled in settings
 */
async function autoSyncIfEnabled(): Promise<void> {
  try {
    const settings = await getSettings();
    if (settings.autoSync) {
      console.log('Auto-sync enabled, running task sync...');
      await task(['sync']);
      console.log('Task sync completed');
    }
  } catch (error) {
    console.error('Error during auto-sync:', error);
    // Don't throw - sync failure shouldn't break the operation
  }
}

// Get all tasks (pending and completed)
export async function getAllTasks(): Promise<Task[]> {
  try {
    // A bare `task export` also returns deleted tasks, which have an
    // `end` date and would show up in the UI as completed
    const { stdout } = await task([
      '(',
      'status:pending',
      'or',
      'status:completed',
      ')',
      'export',
    ]);
    if (!stdout.trim()) return [];

    const rawTasks = JSON.parse(stdout);
    const validatedTasks = TaskListSchema.parse(rawTasks);
    return validatedTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    // Rethrow so the UI shows an error instead of an
    // empty task list (e.g. data volume not writable)
    throw new Error('Failed to load tasks from TaskWarrior');
  }
}

export async function getTask(uuid: string): Promise<Task | null> {
  try {
    const { stdout } = await task([uuid, 'export']);
    if (!stdout.trim()) return null;

    const rawTask = JSON.parse(stdout);
    const validatedTask = TaskSchema.parse(rawTask[0]);

    if (validatedTask) return validatedTask;
    else return null;
  } catch (error) {
    console.error('Error fetching task:', error);
    return null;
  }
}

// Add task using TaskAdd interface
export async function addTask(taskData: TaskAdd) {
  try {
    const args = ['add'];

    if (taskData.project) args.push(`project:${taskData.project}`);
    if (taskData.priority) args.push(`priority:${taskData.priority}`);
    if (taskData.due) args.push(`due:${formatDateForTaskWarrior(taskData.due)}`);
    if (taskData.tags && taskData.tags.length > 0) {
      taskData.tags.forEach(tag => args.push(`+${tag}`));
    }

    // `--` makes TaskWarrior treat the description literally; otherwise
    // a one-word description like "+urgent" is parsed as a tag
    args.push('--', taskData.description);

    // TODO: after adding new task, retrieve it's UUID then pull the whole new task and return it
    const { stdout } = await task(args);
    // Check if succeeded. if it was should return 'Created task [number].' we'll use a regex to capture
    const match = stdout.match(/Created task (\d+)/);
    if (match) {
      await autoSyncIfEnabled();
      const newTaskId = match[1];
      const newTask = await getTask(newTaskId);
      if (newTask) {
        // Do something with the new task if needed
        return newTask;
      }
    }

    return true;
  } catch (error) {
    console.error('Error adding task:', error);
    throw new Error('Failed to add task');
  }
}

// Complete task
export async function completeTask(uuid: string): Promise<boolean> {
  assertUuid(uuid);
  try {
    await task([uuid, 'done']);
    await autoSyncIfEnabled();
    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    throw new Error('Failed to complete task');
  }
}

// Restore task
export async function restoreTask(uuid: string): Promise<boolean> {
  assertUuid(uuid);
  try {
    await task([uuid, 'modify', 'status:pending']);
    await autoSyncIfEnabled();
    return true;
  } catch (error) {
    console.error('Error restoring task:', error);
    throw new Error('Failed to restore task');
  }
}

// Edit task
export async function updateTask(taskUpdate: {
  updates: TaskUpdate;
  original?: Task;
}) {
  try {
    if (!taskUpdate.original) throw new Error('Original task not provided');
    assertUuid(taskUpdate.original.uuid);

    const args: string[] = [taskUpdate.original?.uuid, 'modify'];

    if (taskUpdate.updates.description !== undefined) {
      args.push(`description:${taskUpdate.updates.description}`);
    }
    if (taskUpdate.updates.project !== undefined) {
      args.push(`project:${taskUpdate.updates.project || ''}`);
    }
    if (taskUpdate.updates.priority !== undefined) {
      args.push(`priority:${taskUpdate.updates.priority || ''}`);
    }
    if (taskUpdate.updates.due !== undefined) {
      if (taskUpdate.updates.due === null) {
        // Clear due date
        args.push('due:');
      } else {
        args.push(
          `due:${taskUpdate.updates.due ? formatDateForTaskWarrior(taskUpdate.updates.due) : ''}`
        );
      }
    }
    if (taskUpdate.updates.tags !== undefined) {
      const originalTags = Array.isArray(taskUpdate.original.tags) ? taskUpdate.original.tags : [];
      const updatedTags = Array.isArray(taskUpdate.updates.tags) ? taskUpdate.updates.tags : [];

      // Tags to add: in updatedTags but not in originalTags
      const tagsToAdd = updatedTags.filter(tag => !originalTags.includes(tag));
      // Tags to remove: in originalTags but not in updatedTags
      const tagsToRemove = originalTags.filter(tag => !updatedTags.includes(tag));

      tagsToAdd.forEach(tag => args.push(`+${tag}`));
      tagsToRemove.forEach(tag => args.push(`-${tag}`));
    }

    if (args.length > 2) {
      await task(args);
      await autoSyncIfEnabled();
    }

    const result = await getTask(taskUpdate.original.uuid);
    return result;

  } catch (error) {
    console.error('Error editing task:', error);
    throw new Error('Failed to update task');
  }
}

// Get all tags
export async function getTags(): Promise<string[]> {
  try {
    const { stdout } = await task(['_unique', 'tags']);
    if (!stdout.trim()) return [];

    const tagsSet = new Set<string>();

    stdout.split('\n').forEach((line: string) => {
      const trimmed = line.trim();
      if (trimmed) {
        // Split by comma and add each tag to the set
        trimmed.split(',').forEach((tag: string) => {
          const cleanTag = tag.trim();
          if (cleanTag) {
            tagsSet.add(cleanTag);
          }
        });
      }
    });

    return Array.from(tagsSet).sort();
  } catch (error) {
    console.error('Error getting tags:', error);
    return [];
  }
}

// Get all tags
export async function getProjects(): Promise<string[]> {
  try {
    const { stdout } = await task(['_projects']);
    if (!stdout.trim()) return [];

    const lines = stdout.split('\n');
    const projects: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed) {
        projects.push(trimmed);
      }
    }

    return projects.sort();
  } catch (error) {
    console.error('Error getting projects:', error);
    return [];
  }
}

// Get contexts
export async function getContexts(): Promise<string[]> {
  try {
    const { stdout } = await task(['_context']);
    return stdout
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .sort();
  } catch (error) {
    console.error('Error getting contexts:', error);
    return [];
  }
}

// Get current context
export async function getCurrentContext(): Promise<string | null> {
  try {
    const { stdout } = await task(['_get', 'rc.context']);
    const context = stdout.trim();
    return context && context !== 'none' ? context : null;
  } catch (error) {
    console.error('Error getting current context:', error);
    return null;
  }
}

// Set context
export async function setContext(context: string | null): Promise<boolean> {
  try {
    if (context) {
      await task(['context', context]);
    } else {
      await task(['context', 'none']);
    }
    return true;
  } catch (error) {
    console.error('Error setting context:', error);
    return false;
  }
}

// Sync tasks with TaskChampion server
export async function syncTasks(): Promise<boolean> {
  try {
    console.log('Running task sync...');
    await task(['sync']);
    console.log('Task sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing tasks:', error);
    throw new Error('Task sync failed');
  }
}

// Urgency settings from TaskWarrior's config (.taskrc), the single source of truth
export async function getUrgencyConfig(): Promise<UrgencyConfig> {
  const { stdout } = await task(['_show']);
  const config = new Map<string, number>();
  for (const line of stdout.split('\n')) {
    const eq = line.indexOf('=');
    if (eq > 0 && line.startsWith('urgency.')) config.set(line.slice(0, eq), Number(line.slice(eq + 1)));
  }
  const get = (key: string, fallback: number) => {
    const value = config.get(key);
    return value !== undefined && Number.isFinite(value) ? value : fallback;
  };
  const d = DEFAULT_URGENCY_COEFFICIENTS;
  return {
    coefficients: {
      next: get('urgency.user.tag.next.coefficient', d.next),
      due: get('urgency.due.coefficient', d.due),
      priorityH: get('urgency.uda.priority.H.coefficient', d.priorityH),
      priorityM: get('urgency.uda.priority.M.coefficient', d.priorityM),
      priorityL: get('urgency.uda.priority.L.coefficient', d.priorityL),
      age: get('urgency.age.coefficient', d.age),
      tags: get('urgency.tags.coefficient', d.tags),
      project: get('urgency.project.coefficient', d.project),
    },
    ageMax: get('urgency.age.max', DEFAULT_URGENCY_AGE_MAX),
  };
}
