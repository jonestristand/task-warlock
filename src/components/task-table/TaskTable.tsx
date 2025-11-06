'use client';

import { useEffect, useState } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useQueryClient } from '@tanstack/react-query';

import { Task, TaskUpdate } from '@/lib/schemas';
import { getSettingsAction, updateSettingsAction } from '@/lib/settings-actions';
import { useUpdateTaskMutation } from '@/lib/task-queries';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { createColumns } from './columns';
import { EditableTableRow } from './EditableTableRow';
import TaskCard from './TaskCard';

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
  const queryClient = useQueryClient();
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'urgency',
      desc: true,
    },
  ]);
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 20,
  });
  const updateTaskMutation = useUpdateTaskMutation();

  // Load default page size from settings on mount
  useEffect(() => {
    getSettingsAction().then(settings => {
      setPagination(prev => ({
        ...prev,
        pageSize: settings.defaultPageSize,
      }));
    });
  }, []);

  const handleSaveTask = async (taskUuid: string, updates: TaskUpdate) => {
    try {
      updateTaskMutation.mutate({ updates, original: tasks?.find(t => t.uuid === taskUuid) });
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  const columns = createColumns(showCompleted);

  const table = useReactTable({
    data: tasks || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    state: {
      sorting,
      pagination,
    },
  });

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

      {/* Desktop: Table Layout with TanStack Table (>= 1024px) */}
      <div className="hidden lg:block space-y-4">
        <div className="rounded-md border">
          <Table className="w-full">
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id} className="px-4">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map(row => (
                  <EditableTableRow
                    key={row.id}
                    task={row.original}
                    maxUrgency={maxUrgency}
                    onSave={handleSaveTask}
                    showCompleted={showCompleted}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Items per page:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  const newSize = Number(e.target.value);
                  setPagination(prev => ({
                    ...prev,
                    pageSize: newSize,
                  }));
                }}
                className="h-8 rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
