'use client';

import { useRestoreTaskMutation } from '@/lib/task-queries';
import { Undo2 } from 'lucide-react';

interface UncompleteTaskButtonProps {
  taskUuid: string;
}

export default function RestoreTaskButton({ taskUuid }: UncompleteTaskButtonProps) {
  const restoreTaskMutation = useRestoreTaskMutation();
  const handleUncomplete = async () => {
    await restoreTaskMutation.mutateAsync(taskUuid);
  };

  return (
    <button
      onClick={handleUncomplete}
      className="flex items-center justify-center w-5 h-5 rounded border border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50"
      title="Mark as pending"
    >
      <Undo2 className="w-3 h-3 text-gray-400 hover:text-blue-600" />
    </button>
  );
}
