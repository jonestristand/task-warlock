'use client';

import { useCompleteTaskMutation } from '@/lib/task-queries';
import { Check } from 'lucide-react';

interface CompleteTaskButtonProps {
  taskUuid: string;
}

export default function CompleteTaskButton({ taskUuid }: CompleteTaskButtonProps) {
  const completeTaskMutation = useCompleteTaskMutation();
  const handleComplete = async () => {
    await completeTaskMutation.mutateAsync(taskUuid);
  };

  return (
    <button
      onClick={handleComplete}
      className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded border border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors disabled:opacity-50"
      title="Mark as complete"
    >
      <Check className="w-4 h-4 text-gray-400 hover:text-green-600" />
    </button>
  );
}
