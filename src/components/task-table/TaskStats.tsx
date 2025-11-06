'use client';

import { useTasksQuery } from '@/lib/task-queries';

import { Skeleton } from '@/components/ui/skeleton';

export function TaskStats() {
  const { data: tasks, isPending, isError } = useTasksQuery();

  if (isPending) {
    return (
      <div className="flex flex-wrap gap-3 mt-3">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-20 rounded-full" />
        <Skeleton className="h-7 w-28 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-wrap gap-3 mt-3">
        <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-sm font-medium text-destructive">
          Error loading tasks
        </span>
      </div>
    );
  }

  // Filter to only pending tasks (no end date)
  const pendingTasks = tasks?.filter(t => !t.end) || [];

  const stats = {
    total: pendingTasks.length,
    high: pendingTasks.filter(t => t.priority === 'H').length,
    medium: pendingTasks.filter(t => t.priority === 'M').length,
    low: pendingTasks.filter(t => t.priority === 'L').length,
    overdue: pendingTasks.filter(t => t.due && t.due < new Date()).length,
    projects: new Set(pendingTasks.filter(t => t.project).map(t => t.project)).size,
  };

  return (
    <div className="flex flex-wrap gap-3 mt-3">
      {stats.overdue > 0 && (
        <span className="inline-flex items-center rounded-full bg-(--color-danger)/10 px-3 py-1 text-sm font-medium text-(--color-danger)">
          {stats.overdue} overdue
        </span>
      )}
      <span className="inline-flex items-center rounded-full bg-(--color-info)/10 px-3 py-1 text-sm font-medium text-(--color-info)">
        {stats.total} pending
      </span>
      {stats.high > 0 && (
        <span className="inline-flex items-center rounded-full bg-(--color-danger)/10 px-3 py-1 text-sm font-medium text-(--color-danger)">
          {stats.high} high
        </span>
      )}
      {stats.medium > 0 && (
        <span className="inline-flex items-center rounded-full bg-(--color-warning)/10 px-3 py-1 text-sm font-medium text-(--color-warning)">
          {stats.medium} medium
        </span>
      )}
      {stats.low > 0 && (
        <span className="inline-flex items-center rounded-full bg-(--color-success)/10 px-3 py-1 text-sm font-medium text-(--color-success)">
          {stats.low} low
        </span>
      )}
      {stats.projects > 0 && (
        <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          {stats.projects} projects
        </span>
      )}
    </div>
  );
}
