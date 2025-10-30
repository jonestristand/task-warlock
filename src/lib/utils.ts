import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { Task } from './schemas';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type RequireKeys<T extends object, K extends keyof T> = Required<Pick<T, K>> & Omit<T, K>;

/**
 * Check if a task is blocked by incomplete dependencies
 * @param task - The task to check
 * @param allTasks - All tasks to look up dependency status
 * @returns true if task has dependencies and at least one is still pending
 */
export function isTaskBlocked(task: Task, allTasks: Task[]): boolean {
  if (!task.depends || task.depends.length === 0) {
    return false;
  }

  return task.depends.some(depUuid => {
    const depTask = allTasks.find(t => t.uuid === depUuid);
    // Blocked if dependency exists and is still pending
    return depTask && depTask.status === 'pending';
  });
}

/**
 * Get list of blocking tasks (incomplete dependencies)
 * @param task - The task to check
 * @param allTasks - All tasks to look up dependency status
 * @returns Array of tasks that are blocking this task
 */
export function getBlockingTasks(task: Task, allTasks: Task[]): Task[] {
  if (!task.depends || task.depends.length === 0) {
    return [];
  }

  return task.depends
    .map(depUuid => allTasks.find(t => t.uuid === depUuid))
    .filter((depTask): depTask is Task => depTask !== undefined && depTask.status === 'pending');
}
