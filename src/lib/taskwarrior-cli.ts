'use server';

import { execa } from 'execa';

import { type Task, TaskAdd, TaskSchema, TaskUpdate } from './schemas';
import { TaskListSchema } from './schemas';
import { getSettings } from './settings';

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
      await execa('task', ['sync']);
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
    const { stdout } = await execa('task', ['export']);
    if (!stdout.trim()) return [];

    const rawTasks = JSON.parse(stdout);
    const validatedTasks = TaskListSchema.parse(rawTasks);
    return validatedTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export async function getTask(uuid: string): Promise<Task | null> {
  try {
    const { stdout } = await execa('task', [uuid, 'export']);
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

// Get pending tasks
export async function getPendingTasks(): Promise<Task[]> {
  try {
    const { stdout } = await execa('task', ['status:pending', 'export']);
    if (!stdout.trim()) return [];

    const rawTasks = JSON.parse(stdout);
    const validatedTasks = TaskListSchema.parse(rawTasks);
    return validatedTasks.sort((a, b) => (b.urgency || 0) - (a.urgency || 0));
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    return [];
  }
}

// Get completed tasks
export async function getCompletedTasks(): Promise<Task[]> {
  try {
    const { stdout } = await execa('task', ['status:completed', 'export']);
    if (!stdout.trim()) return [];

    const rawTasks = JSON.parse(stdout);
    const validatedTasks = TaskListSchema.parse(rawTasks);
    return validatedTasks.sort((a, b) => {
      const aEnd = a.end ? new Date(a.end).getTime() : 0;
      const bEnd = b.end ? new Date(b.end).getTime() : 0;
      return bEnd - aEnd;
    });
  } catch (error) {
    console.error('Error fetching completed tasks:', error);
    return [];
  }
}

// Add task using TaskAdd interface
export async function addTask(taskData: TaskAdd) {
  try {
    const args = ['add', taskData.description];

    if (taskData.project) args.push(`project:${taskData.project}`);
    if (taskData.priority) args.push(`priority:${taskData.priority}`);
    if (taskData.due) args.push(`due:${formatDateForTaskWarrior(taskData.due)}`);
    if (taskData.tags && taskData.tags.length > 0) {
      taskData.tags.forEach(tag => args.push(`+${tag}`));
    }

    // TODO: after adding new task, retrieve it's UUID then pull the whole new task and return it
    const { stdout } = await execa('task', args);
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
    return false;
  }
}

// Complete task
export async function completeTask(uuid: string): Promise<boolean> {
  try {
    await execa('task', [uuid, 'done']);
    await autoSyncIfEnabled();
    return true;
  } catch (error) {
    console.error('Error completing task:', error);
    return false;
  }
}

// Restore task
export async function restoreTask(uuid: string): Promise<boolean> {
  try {
    await execa('task', [uuid, 'modify', 'status:pending']);
    await autoSyncIfEnabled();
    return true;
  } catch (error) {
    console.error('Error restoring task:', error);
    return false;
  }
}

// Edit task
export async function updateTask(taskUpdate: {
  updates: TaskUpdate;
  original?: Task;
}) {
  try {
    if (!taskUpdate.original) throw new Error('Original task not provided');

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
      await execa('task', args);
      await autoSyncIfEnabled();
    }

    const result = await getTask(taskUpdate.original.uuid);
    return result;

  } catch (error) {
    console.error('Error editing task:', error);
    return false;
  }
}

// Get all tags
export async function getTags(): Promise<string[]> {
  try {
    const { stdout } = await execa('task', ['_unique', 'tags']);
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
    const { stdout } = await execa('task', ['_projects']);
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
    const { stdout } = await execa('task', ['context', 'list']);
    if (!stdout.trim()) return [];

    const lines = stdout.split('\n');
    const contexts: Set<string> = new Set();

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed &&
        !trimmed.includes('Context') &&
        !trimmed.includes('---') &&
        !trimmed.includes('Definition')
      ) {
        const parts = trimmed.split(/\s+/);
        if (
          parts.length > 0 &&
          parts[0] &&
          !parts[0].match(/^\d+$/) &&
          parts[0] !== 'write' &&
          parts[0] !== 'read'
        ) {
          contexts.add(parts[0]);
        }
      }
    }

    return Array.from(contexts).sort();
  } catch (error) {
    console.error('Error getting contexts:', error);
    return [];
  }
}

// Get current context
export async function getCurrentContext(): Promise<string | null> {
  try {
    const { stdout } = await execa('task', ['context', 'show']);
    const match = stdout.match(/Context '(.+)' is currently applied/);
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error getting current context:', error);
    return null;
  }
}

// Set context
export async function setContext(context: string | null): Promise<boolean> {
  try {
    if (context) {
      await execa('task', ['context', context]);
    } else {
      await execa('task', ['context', 'none']);
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
    await execa('task', ['sync']);
    console.log('Task sync completed successfully');
    return true;
  } catch (error) {
    console.error('Error syncing tasks:', error);
    return false;
  }
}
