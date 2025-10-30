'use client';

import { useState } from 'react';

import { Calendar, Check, Folder, Lock, Tag, X, Zap } from 'lucide-react';
import DateTimePicker from 'react-datetime-picker';
import { Controller, SubmitHandler, useForm } from 'react-hook-form';

import { Priority, Task, TaskUpdate } from '@/lib/schemas';
import { useTagsQuery, useTasksQuery } from '@/lib/task-queries';
import { getBlockingTasks, isTaskBlocked } from '@/lib/utils';

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

interface TaskCardProps {
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

export default function TaskCard({ task, maxUrgency, onSave }: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const { data: tags } = useTagsQuery();
  const { data: allTasks } = useTasksQuery();

  const urgencyFontWeight = getUrgencyFontWeight(task.urgency, maxUrgency);
  const isCompleted = Boolean(task.end);
  const blocked = isTaskBlocked(task, allTasks || []);
  const blockingTasks = blocked ? getBlockingTasks(task, allTasks || []) : [];

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
      priority: data.priority === 'none' ? '' : data.priority,
      due: data.due,
      tags: data.tags,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleCardClick = () => {
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

  const formatRelativeTime = (date?: Date) => {
    if (!date) return '';

    const now = new Date();
    const diff = new Date(date).getTime() - now.getTime();
    const isPast = diff < 0;
    const absDiff = Math.abs(diff);

    const minutes = Math.floor(absDiff / (1000 * 60));
    const hours = Math.floor(absDiff / (1000 * 60 * 60));
    const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));

    let result = '';
    if (days > 0) {
      result = `${days}d`;
    } else if (hours > 0) {
      result = `${hours}h`;
    } else {
      result = `${minutes}m`;
    }

    return isPast ? `-${result}` : result;
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
    <div
      className={`border-b p-3 ${task.priority && task.priority in priorityStyles ? priorityStyles[task.priority as keyof typeof priorityStyles].background : ''} ${urgencyFontWeight} ${!isCompleted && !isEditing ? 'cursor-pointer hover:bg-[var(--color-surface)]' : ''}`}
      onClick={handleCardClick}
    >
      <div className="flex gap-3">
        {/* Checkbox */}
        <div className="flex-shrink-0 pt-0.5" onClick={e => e.stopPropagation()}>
          {isEditing ? (
            <div className="flex gap-1">
              <button
                onClick={handleSubmit(onSubmit)}
                className="flex items-center justify-center w-6 h-6 rounded border transition-colors border-(--color-success) bg-[rgba(var(--color-success)/0.2)] hover:bg-[rgba(var(--color-success))]"
                title="Save"
              >
                <Check className="w-4 h-4" style={{ color: 'var(--color-success)' }} />
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center justify-center w-6 h-6 rounded border transition-colors border-(--color-danger) bg-[rgba(var(--color-danger)/0.2)] hover:bg-[rgba(var(--color-danger)/0.4)]"
                title="Cancel"
              >
                <X className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
              </button>
            </div>
          ) : (
            <div>
              {isCompleted ? (
                <RestoreTaskButton taskUuid={task.uuid} />
              ) : (
                <CompleteTaskButton taskUuid={task.uuid} />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-3" onClick={e => e.stopPropagation()}>
              {/* Description */}
              <Input {...register('description')} className="h-8" placeholder="Description" />

              {/* Project & Priority */}
              <div className="flex gap-2">
                <Input {...register('project')} className="h-8 flex-1" placeholder="Project" />
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="h-8 w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="H">High</SelectItem>
                        <SelectItem value="M">Med</SelectItem>
                        <SelectItem value="L">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              {/* Due Date */}
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
                        className="h-8 flex-1"
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          reset({ due: null });
                        }}
                        className="flex items-center justify-center w-6 h-6 rounded border transition-colors border-(--color-danger) bg-[rgba(var(--color-danger)/0.2)] hover:bg-[rgba(var(--color-danger)/0.4)]"
                        title="Clear due date"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                      </button>
                    </>
                  )}
                />
              </div>

              {/* Tags */}
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
            <>
              {/* Row 1: Description */}
              <div className="text-sm mb-2">{task.description}</div>

              {/* Row 2: Metadata */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {/* Blocked Indicator */}
                {blocked && (
                  <div
                    className="flex items-center gap-1 text-[var(--color-warning)]"
                    title={`Blocked by: ${blockingTasks.map(t => t.description).join(', ')}`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Blocked</span>
                  </div>
                )}

                {/* Urgency */}
                <div className="flex items-center gap-1" title={`Urgency: ${task.urgency?.toFixed(1)}`}>
                  <Zap className="w-3 h-3" />
                  <span>{task.urgency?.toFixed(1) || '0.0'}</span>
                </div>

                {/* Project */}
                {task.project && (
                  <div className="flex items-center gap-1">
                    <Folder className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{task.project}</span>
                  </div>
                )}

                {/* Tags */}
                {task.tags && task.tags.length > 0 && (
                  <div className="flex items-center gap-1" title={task.tags.join(', ')}>
                    <Tag className="w-3 h-3 flex-shrink-0" />
                    <div className="flex items-center gap-1">
                      {task.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="text-xs">
                          {tag}
                          {i < Math.min(task.tags!.length, 2) - 1 && ','}
                        </span>
                      ))}
                      {task.tags.length > 2 && (
                        <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Due Date */}
                {(task.due || task.end) && (
                  <div
                    className="flex items-center gap-1"
                    title={isCompleted ? formatDate(task.end) : formatDate(task.due)}
                  >
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {isCompleted
                        ? task.end?.toLocaleDateString()
                        : task.due?.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
