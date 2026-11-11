'use client';

import { CloudUpload } from 'lucide-react';

import { useSyncTasksMutation } from '@/lib/task-queries';

import { Button } from '@/components/ui/button';

export default function SyncButton() {
  const syncMutation = useSyncTasksMutation();

  const handleSync = () => {
    syncMutation.mutate();
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSync}
      disabled={syncMutation.isPending}
      className={`flex items-center gap-2 ${syncMutation.isError ? 'border-(--color-danger) text-(--color-danger)' : ''}`}
      title={syncMutation.isError ? 'Last sync failed - check the server logs' : 'Sync & Refresh'}
    >
      <CloudUpload className={`w-4 h-4 ${syncMutation.isPending ? 'animate-pulse' : ''}`} />
      <span className="hidden sm:inline">Sync & Refresh</span>
    </Button>
  );
}
