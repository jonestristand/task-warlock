'use client';

import { useState } from 'react';

import { Check, X } from 'lucide-react';
import DateTimePicker from 'react-datetime-picker';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Priority, Task, TaskUpdate } from '@/lib/schemas';
import { useTagsQuery } from '@/lib/task-queries';

import TagSelector from '@/components/selectors/TagSelector';
import CompleteTaskButton from '@/components/task-actions/CompleteTaskButton';
import RestoreTaskButton from '@/components/task-actions/RestoreTaskButton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TableCell, TableRow } from '@/components/ui/table';

const priorityStyles = {
  H: {
    text: 'text-[var(--color-danger)] font-semibold',
    background: 'priority-bg-danger',
  },
  M: {
    text: 'text-[var(--color-warning)] font-medium',
    background: 'priority-bg-warning',
  },
  L: {
    text: 'text-[var(--color-success)]',
    background: 'priority-bg-success',
  },
} as const;

const urgencyFontWeights = [
  { threshold: 0.9, weight: 'font-black' },
  { threshold: 0.8, weight: 'font-extrabold' },
  { threshold: 0.7, weight: 'font-bold' },
  { threshold: 0.6, weight: 'font-semibold' },
  { threshold: 0.5, weight: 'font-medium' },
  { threshold: 0.4, weight: 'font-normal' },
  { threshold: 0.3, weight: 'font-light' },
  { threshold: 0.2, weight: 'font-extralight' },
  { threshold: 0, weight: 'font-thin' },
] as const;

const getUrgencyFontWeight = (urgency: number, maxUrgency: number): string => {
  if (maxUrgency === 0) return 'font-normal';

  const ratio = urgency / maxUrgency;
  return urgencyFontWeights.find(item => ratio >= item.threshold)?.weight || 'font-thin';
};

interface TaskTableRowProps {
  task: Task;
  maxUrgency: number;
  onSave: (taskUuid: string, updates: TaskUpdate) => Promise<void>;
}

export interface TaskUpdateFormValues {
  description: string;
  project: string;
  priority: 'H' | 'M' | 'L' | 'none';
  due: Date | null | undefined;
  tags: string[];
}

export function TaskTableRow({ task, maxUrgency, onSave }: TaskTableRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: tags } = useTagsQuery();

  const urgencyFontWeight = getUrgencyFontWeight(task.urgency, maxUrgency);
  const isCompleted = Boolean(task.end);

  const { register, handleSubmit, reset, control } = useForm<TaskUpdateFormValues>({
    defaultValues: {
      description: task.description,
      project: task.project || '',
      priority: (task.priority as Priority) || 'none',
      due: task.due,
      tags: task.tags || [],
    },
  });

  const onSubmit: SubmitHandler<TaskUpdateFormValues> = async data => {
    await onSave(task.uuid, {
      description: data.description,
      project: data.project,
      priority: data.priority === 'none' ? '' : data.priority, // Convert 'none' to empty string for clearing
      due: data.due,
      tags: data.tags,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleRowClick = () => {
    if (!isCompleted && !isEditing) {
      reset({
        description: task.description,
        project: task.project || '',
        priority: (task.priority as Priority) || 'none',
        due: task.due,
        tags: task.tags || [],
      });
      setIsEditing(true);
    }
  };

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

  return (
    <TableRow
      className={`${task.priority && task.priority in priorityStyles ? priorityStyles[task.priority as keyof typeof priorityStyles].background : 'hover:bg-(--color-surface)'} ${urgencyFontWeight} ${!isCompleted && !isEditing ? 'cursor-pointer' : ''}`}
      onClick={handleRowClick}
    >
      {/* Complete/Restore Button OR Save/Cancel */}
      <TableCell onClick={e => e.stopPropagation()}>
        {isEditing ? (
          <div className="flex gap-1">
            <button
              onClick={handleSubmit(onSubmit)}
              className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border transition-colors border-(--color-success) bg-[rgba(var(--color-success)/0.2)] hover:bg-[rgba(var(--color-success))]"
              title="Save"
            >
              <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border transition-colors border-(--color-danger) bg-[rgba(var(--color-danger)/0.2)] hover:bg-[rgba(var(--color-danger)/0.4)]"
              title="Cancel"
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            {isCompleted ? (
              <RestoreTaskButton taskUuid={task.uuid} />
            ) : (
              <CompleteTaskButton taskUuid={task.uuid} />
            )}
            <div className="w-8" />
          </div>
        )}
      </TableCell>

      {/* Description */}
      <TableCell>
        {isEditing ? (
          <Input {...register('description')} className="h-8" onClick={e => e.stopPropagation()} />
        ) : (
          task.description
        )}
      </TableCell>

      {/* Project */}
      <TableCell>
        {isEditing ? (
          <Input
            {...register('project')}
            className="h-8"
            placeholder="Project"
            onClick={e => e.stopPropagation()}
          />
        ) : (
          task.project || ''
        )}
      </TableCell>

      {/* Priority */}
      <TableCell
        className={`hidden sm:table-cell ${task.priority && task.priority in priorityStyles ? priorityStyles[task.priority as keyof typeof priorityStyles].text : ''}`}
      >
        {isEditing ? (
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-8" onClick={e => e.stopPropagation()}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Priority</SelectItem>
                  <SelectItem value="H">High</SelectItem>
                  <SelectItem value="M">Medium</SelectItem>
                  <SelectItem value="L">Low</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        ) : (
          task.priority || ''
        )}
      </TableCell>

      {/* Due Date / Completion Date */}
      <TableCell>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Controller
              name="due"
              control={control}
              render={({ field }) => (
                <>
                  <DateTimePicker
                    value={field.value}
                    onChange={field.onChange}
                    format="y-MM-dd HH:mm"
                    disableClock={false}
                    clearIcon={null}
                    calendarIcon={null}
                    className="h-8"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  />
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      reset({ due: null });
                    }}
                    className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border transition-colors border-(--color-danger) bg-[rgba(var(--color-danger)/0.2)] hover:bg-[rgba(var(--color-danger)/0.4)]"
                    title="Clear due date"
                  >
                    <X className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                  </button>
                </>
              )}
            />
          </div>
        ) : isCompleted ? (
          formatDate(task.end) || ''
        ) : (
          formatDate(task.due) || ''
        )}
      </TableCell>

      {/* Urgency (read-only) */}
      <TableCell>{isEditing ? '-' : task.urgency?.toFixed(1) || '0.0'}</TableCell>

      {/* Tags */}
      <TableCell>
        {isEditing ? (
          <div className="min-w-[200px]" onClick={e => e.stopPropagation()}>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <TagSelector
                  availableTags={tags || []}
                  selectedTags={field.value}
                  onTagsChange={field.onChange}
                  placeholder="Edit tags..."
                />
              )}
            />
          </div>
        ) : (
          task.tags?.join(', ') || ''
        )}
      </TableCell>
    </TableRow>
  );
}
