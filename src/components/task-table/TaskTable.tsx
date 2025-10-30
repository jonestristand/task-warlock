'use client';

import { Task, TaskUpdate } from '@/lib/schemas';
import { useUpdateTaskMutation } from '@/lib/task-queries';

import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import TaskCard from './TaskCard';
import { TaskTableRow } from './TaskTableRow';

interface TaskTableProps {
  tasks?: Task[];
  showCompleted?: boolean;
  isLoading?: boolean;
}

export default function TaskTable({
  tasks,
  showCompleted = false,
  isLoading = false,
}: TaskTableProps) {
  const updateTaskMutation = useUpdateTaskMutation();

  const handleSaveTask = async (taskUuid: string, updates: TaskUpdate) => {
    try {
      updateTaskMutation.mutate({ updates, original: tasks?.find(t => t.uuid === taskUuid) });
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  if (!isLoading && tasks?.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No pending tasks found.</div>;
  }

  const maxUrgency = tasks ? Math.max(...tasks.map(task => task.urgency || 0)) : 0;

  return (
    <>
      {/* Mobile/Tablet: Card Layout (< 1024px) */}
      <div className="lg:hidden rounded-md border">
        {isLoading
          ? [...Array(5)].map((_, i) => (
              <div key={i} className="border-b p-3">
                <Skeleton className="h-12 w-full" />
              </div>
            ))
          : tasks?.map(task => (
              <TaskCard
                key={task.uuid}
                task={task}
                maxUrgency={maxUrgency}
                onSave={handleSaveTask}
              />
            ))}
      </div>

      {/* Desktop: Table Layout (>= 1024px) */}
      <div className="hidden lg:block rounded-md border">
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead className="w-10 px-4"></TableHead>
              <TableHead className="px-4">Description</TableHead>
              <TableHead className="px-4">Project</TableHead>
              <TableHead className="px-4">Priority</TableHead>
              <TableHead className="px-4">{showCompleted ? 'Completed' : 'Due'}</TableHead>
              <TableHead className="px-4">Urgency</TableHead>
              <TableHead className="px-4">Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              : tasks?.map(task => (
                  <TaskTableRow
                    key={task.uuid}
                    task={task}
                    maxUrgency={maxUrgency}
                    onSave={handleSaveTask}
                  />
                ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
