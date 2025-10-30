import { z } from 'zod';
import { RequireKeys } from './utils';

const parseTaskWarriorDate = (dateStr: string): Date => {
  // TaskWarrior format: 20251201T075959Z
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  const hour = dateStr.slice(9, 11);
  const minute = dateStr.slice(11, 13);
  const second = dateStr.slice(13, 15);

  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}Z`);
};

export const TaskSchema = z.object({
  uuid: z.string(),
  id: z.number(),
  description: z.string(),
  status: z.string(),
  urgency: z.number(),
  priority: z.enum(['H', 'M', 'L']).optional(),
  project: z.string().optional(),
  tags: z.array(z.string()).optional(),
  depends: z.array(z.string()).optional(),
  due: z.string().transform(parseTaskWarriorDate).optional(),
  end: z.string().transform(parseTaskWarriorDate).optional(),
  entry: z.string().transform(parseTaskWarriorDate),
  modified: z.string().transform(parseTaskWarriorDate).optional(),
});

export type Task = z.infer<typeof TaskSchema>;

// List schema for array of tasks
export const TaskListSchema = z.array(TaskSchema);

export type TaskList = z.infer<typeof TaskListSchema>;
// Shared types for TaskWarrior operations

type test = RequireKeys<Partial<Task>, 'description'>;
export interface TaskAdd extends Partial<Omit<Task, 'description' | 'uuid' | 'id' | 'urgency' | 'status' | 'entry' | 'description'>> { 
  description: string;
};

// TaskUpdate interface derived from Task, excluding only truly read-only fields
export interface TaskUpdate extends Partial<Omit<Task, 'uuid' | 'id' | 'urgency' | 'status' | 'entry' | 'priority' | 'due'>> {
  due?: Date | null; // Allow null to clear due date
  priority?: 'H' | 'M' | 'L' | ''; // Allow empty string to clear priority
}

export type Priority = 'H' | 'M' | 'L';
export type PriorityOption = Priority | 'none' | '';
