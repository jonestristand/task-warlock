'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

import { Task, TaskUpdate } from '@/lib/schemas';

import CompleteTaskButton from '@/components/task-actions/CompleteTaskButton';
import RestoreTaskButton from '@/components/task-actions/RestoreTaskButton';
import { Button } from '@/components/ui/button';

const priorityStyles = {
  H: {
    text: 'text-[var(--color-danger)] font-semibold',
  },
  M: {
    text: 'text-[var(--color-warning)] font-medium',
  },
  L: {
    text: 'text-[var(--color-success)]',
  },
} as const;

const formatDate = (date?: Date) => {
  if (!date) return '';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const createColumns = (showCompleted: boolean): ColumnDef<Task>[] => [
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => {
      const task = row.original;
      const isCompleted = Boolean(task.end);
      
      return (
        <div className="flex gap-1">
          {isCompleted ? (
            <RestoreTaskButton taskUuid={task.uuid} />
          ) : (
            <CompleteTaskButton taskUuid={task.uuid} />
          )}
        </div>
      );
    },
    enableSorting: false,
    size: 60,
  },
  {
    accessorKey: 'description',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 hover:bg-transparent"
        >
          Description
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div className="font-medium">{row.getValue('description')}</div>;
    },
  },
  {
    accessorKey: 'project',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 hover:bg-transparent"
        >
          Project
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div>{row.getValue('project') || ''}</div>;
    },
  },
  {
    accessorKey: 'priority',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 hover:bg-transparent"
        >
          Priority
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const priority = row.getValue('priority') as 'H' | 'M' | 'L' | undefined;
      return (
        <div
          className={
            priority && priority in priorityStyles
              ? priorityStyles[priority as keyof typeof priorityStyles].text
              : ''
          }
        >
          {priority || ''}
        </div>
      );
    },
    sortingFn: (rowA, rowB, columnId) => {
      const priorityOrder: Record<string, number> = { H: 3, M: 2, L: 1 };
      const a = rowA.getValue(columnId) as 'H' | 'M' | 'L' | undefined;
      const b = rowB.getValue(columnId) as 'H' | 'M' | 'L' | undefined;
      const aValue = a ? priorityOrder[a] : 0;
      const bValue = b ? priorityOrder[b] : 0;
      return aValue - bValue;
    },
  },
  {
    accessorKey: showCompleted ? 'end' : 'due',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 hover:bg-transparent"
        >
          {showCompleted ? 'Completed' : 'Due'}
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      const task = row.original;
      const date = showCompleted ? task.end : task.due;
      return <div>{formatDate(date)}</div>;
    },
  },
  {
    accessorKey: 'urgency',
    header: ({ column }) => {
      const isSorted = column.getIsSorted();
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="px-0 hover:bg-transparent"
        >
          Urgency
          {isSorted === 'asc' ? (
            <ArrowUp className="ml-2 h-4 w-4" />
          ) : isSorted === 'desc' ? (
            <ArrowDown className="ml-2 h-4 w-4" />
          ) : (
            <ArrowUpDown className="ml-2 h-4 w-4" />
          )}
        </Button>
      );
    },
    cell: ({ row }) => {
      return <div>{row.original.urgency?.toFixed(1) || '0.0'}</div>;
    },
  },
  {
    accessorKey: 'tags',
    header: 'Tags',
    cell: ({ row }) => {
      const tags = row.getValue('tags') as string[] | undefined;
      return <div>{tags?.join(', ') || ''}</div>;
    },
    enableSorting: false,
  },
];
