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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="hidden sm:table-cell">Priority</TableHead>
            <TableHead>{showCompleted ? 'Completed' : 'Due'}</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Tags</TableHead>
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
  );
}
