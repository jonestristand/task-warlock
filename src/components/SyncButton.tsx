'use client';

import { CloudUpload } from 'lucide-react';

import { useSyncTasksMutation } from '@/lib/task-queries';

import { Button } from '@/components/ui/button';

export default function SyncButton() {
  const syncMutation = useSyncTasksMutation();

  const handleSync = async () => {
    await syncMutation.mutateAsync();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncMutation.isPending}
      className="flex items-center gap-2"
    >
      <CloudUpload className={`w-4 h-4 ${syncMutation.isPending ? 'animate-pulse' : ''}`} />
      Sync & Refresh
    </Button>
  );
}
