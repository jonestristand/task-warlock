import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Task } from '@/lib/schemas';
import { addTask, completeTask, getAllTasks, getProjects, getTags, getUrgencyConfig, restoreTask, syncTasks, updateTask } from '@/lib/taskwarrior-cli';

import { type UrgencyConfig, estimateUrgency } from './urgency';

const urgencyConfigQuery = {
  queryKey: ['urgency-config'],
  queryFn: async () => await getUrgencyConfig(),
  staleTime: 5 * 60 * 1000,
};

export const useUrgencyConfigQuery = () => useQuery(urgencyConfigQuery);

// TaskWarrior's urgency config for optimistic estimates; defaults if it can't be read
async function loadUrgencyConfig(
  queryClient: ReturnType<typeof useQueryClient>
): Promise<UrgencyConfig | undefined> {
  try {
    return await queryClient.ensureQueryData<UrgencyConfig>(urgencyConfigQuery);
  } catch {
    return undefined;
  }
}

export const useTasksQuery = () => {
  const query = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => await getAllTasks(),
  });

  return query;
};

export const useTagsQuery = () => {
  const query = useQuery({
    queryKey: ['tags'],
    queryFn: async () => await getTags(),
  });

  return query;
};

export const useProjectsQuery = () => {
  const query = useQuery({
    queryKey: ['projects'],
    queryFn: async () => await getProjects(),
  });

  return query;
};

export const useUpdateTaskMutation = () => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: updateTask,
    onMutate: async optimisticTask => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      if (!optimisticTask.original)
        throw new Error('No original task data for the task being updated exists.');

      // Convert optimisticTask priority field to fit the Task type
      const updatedTask: Task = {
        ...optimisticTask.original,
        ...optimisticTask.updates,
        priority:
          optimisticTask.updates.priority !== '' ? optimisticTask.updates.priority : undefined,
        due: optimisticTask.updates.due === null ? undefined : optimisticTask.updates.due,
      };
      const urgencyConfig = await loadUrgencyConfig(queryClient);
      updatedTask.urgency = estimateUrgency(
        updatedTask,
        urgencyConfig?.coefficients,
        urgencyConfig?.ageMax
      );

      // Update task list
      queryClient.setQueryData<Task[]>(['tasks'], old => {
        if (!old) return [updatedTask];

        return old.map(task => {
          if (task.uuid === optimisticTask.original!.uuid) {
            return { ...task, ...updatedTask };
          } else {
            return { ...task };
          }
        });
      });

      return { previousTasks };
    },
    onError: (_err, _newTask, onMutateResult, _context) => {
      if (onMutateResult?.previousTasks) {
        queryClient.setQueryData(['tasks'], onMutateResult.previousTasks);
      }
    },
    onSettled: async () => {
      // Invalidate or refetch queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  return mutation;
};

export const useCompleteTaskMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: completeTask,
    onMutate: async (taskUuid: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update task as completed
      queryClient.setQueryData<Task[]>(['tasks'], old => {
        if (!old) return old;

        return old.map(task => {
          if (task.uuid === taskUuid) {
            return { ...task, end: new Date() };
          } else {
            return { ...task };
          }
        });
      });

      return { previousTasks };
    },
    onError: (_err, _taskUuid, onMutateResult, _context) => {
      if (onMutateResult?.previousTasks) {
        queryClient.setQueryData(['tasks'], onMutateResult.previousTasks);
      }
    },
    onSettled: async () => {
      // Invalidate or refetch queries
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return mutation;
};

export const useRestoreTaskMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: restoreTask,
    onMutate: async (taskUuid: string) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically update task as completed
      queryClient.setQueryData<Task[]>(['tasks'], old => {
        if (!old) return old;

        return old.map(task => {
          if (task.uuid === taskUuid) {
            return { ...task, end: undefined };
          } else {
            return { ...task };
          }
        });
      });

      return { previousTasks };
    },
    onError: (_err, _taskUuid, onMutateResult, _context) => {
      if (onMutateResult?.previousTasks) {
        queryClient.setQueryData(['tasks'], onMutateResult.previousTasks);
      }
    },
    onSettled: async () => {
      // Invalidate or refetch queries
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return mutation;
};

export const useAddNewTaskMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: addTask,
    onMutate: async (newTaskData) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData<Task[]>(['tasks']);

      // Optimistically add new task with temporary UUID
      const tempUuid = `temp-${Date.now()}`;
      const newTask: Task = {
        id: -1,
        uuid: tempUuid,
        status: 'pending',
        entry: new Date(),
        urgency: 0,
        ...newTaskData,
      };
      const urgencyConfig = await loadUrgencyConfig(queryClient);
      newTask.urgency = estimateUrgency(newTask, urgencyConfig?.coefficients, urgencyConfig?.ageMax);

      queryClient.setQueryData<Task[]>(['tasks'], old => {
        if (!old) return [newTask];

        return [newTask, ...old];
      });

      return { previousTasks, tempUuid };
    },
    onError: (_err, _newTaskData, onMutateResult, _context) => {
      if (onMutateResult?.previousTasks) {
        queryClient.setQueryData(['tasks'], onMutateResult.previousTasks);
      }
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  return mutation;
}

export const useSyncTasksMutation = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: syncTasks,
    onSuccess: async () => {
      // Invalidate all queries to refetch fresh data from server
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['tags'] }),
        queryClient.invalidateQueries({ queryKey: ['projects'] }),
      ]);
    },
  });

  return mutation;
}
