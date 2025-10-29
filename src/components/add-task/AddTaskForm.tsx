'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import DateTimePicker from 'react-datetime-picker';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { useAddNewTaskMutation } from '@/lib/task-queries';
import { Priority } from '@/lib/schemas';

import TagSelector from '@/components/selectors/TagSelector';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const addTaskFormSchema = z
  .object({
    description: z.string().min(1, 'Task description is required'),
    project: z.string().optional(),
    priority: z.enum(['none', 'H', 'M', 'L']).optional(),
    due: z.date().nullable().optional(),
    tags: z.array(z.string()),
  })
  .transform(data => ({
    description: data.description,
    project: data.project || undefined,
    priority:
      data.priority && data.priority !== 'none' ? (data.priority as Priority) : undefined,
    due: data.due || undefined,
    tags: data.tags,
  }));

type AddTaskFormData = z.input<typeof addTaskFormSchema>;

interface AddTaskFormProps {
  tags: string[];
  onSuccess?: () => void;
}

export default function AddTaskForm({ tags: availableTags, onSuccess }: AddTaskFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
    setError,
  } = useForm<AddTaskFormData>({
    resolver: zodResolver(addTaskFormSchema),
    defaultValues: {
      description: '',
      project: '',
      priority: 'none',
      due: null,
      tags: [],
    },
  });
  const addNewTaskMutation = useAddNewTaskMutation();

  const onSubmit = async (formData: AddTaskFormData) => {
    try {
      const transformedData = addTaskFormSchema.parse(formData);

      // TODO: Implement your own mutation logic here
      addNewTaskMutation.mutate(transformedData);

      // Reset form on success
      reset();
      onSuccess?.();
    } catch (error) {
      setError('root', {
        type: 'server',
        message: 'Failed to add task',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Description Field */}
      <div>
        <Input
          {...register('description')}
          placeholder="Task description..."
          className={`w-full ${errors.description ? 'border-red-500' : ''}`}
        />
        {errors.description && (
          <p className="text-red-600 text-sm mt-1">{errors.description.message}</p>
        )}
      </div>

      {/* Grid for other fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {/* Project Field */}
        <div>
          <Input {...register('project')} placeholder="Project (optional)" className="w-full" />
        </div>

        {/* Priority Field */}
        <div>
          <Controller
            name="priority"
            control={control}
            render={({ field }) => (
              <Select value={field.value || 'none'} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Priority" />
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
        </div>

        {/* Due Date Field */}
        <div className="flex items-start gap-2">
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
                  className="w-full"
                />
                <button
                  type="button"
                  onClick={() => field.onChange(null)}
                  className="flex items-center justify-center w-8 h-8 rounded border transition-colors border-(--color-danger) bg-[rgba(var(--color-danger)/0.2)] hover:bg-[rgba(var(--color-danger)/0.4)]"
                  title="Clear due date"
                >
                  <X className="w-4 h-4" style={{ color: 'var(--color-danger)' }} />
                </button>
              </>
            )}
          />
        </div>

        {/* Tags Field */}
        <div>
          <Controller
            name="tags"
            control={control}
            render={({ field }) => (
              <TagSelector
                availableTags={availableTags}
                selectedTags={field.value}
                onTagsChange={field.onChange}
                placeholder="Add tags..."
              />
            )}
          />
        </div>
      </div>

      {/* Global Error Display */}
      {errors.root && (
        <div className="text-red-600 dark:text-red-400 text-sm">{errors.root.message}</div>
      )}

      {/* Submit Button */}
      <Button type="submit" className="w-full sm:w-auto">
        <Plus className="w-4 h-4 mr-2" />
        Add Task
      </Button>
    </form>
  );
}
