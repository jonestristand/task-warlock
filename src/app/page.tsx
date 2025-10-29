import Link from 'next/link';

import { HydrationBoundary, QueryClient, dehydrate } from '@tanstack/react-query';
import { Settings } from 'lucide-react';

import { getCompletedTasks, getPendingTasks, getTags } from '@/lib/taskwarrior-cli';

import AddTaskSection from '@/components/add-task/AddTaskSection';
import TaskDashboard from '@/components/dashboard/TaskDashboard';
import { TaskStats } from '@/components/task-table/TaskStats';
import ThemeSelector from '@/components/selectors/ThemeSelector';
import { Button } from '@/components/ui/button';

// Force dynamic rendering (SSR on each request, not static generation at build time)
export const dynamic = 'force-dynamic';

export default async function Home() {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ['tasks', 'pending'],
    queryFn: getPendingTasks,
  });
  await queryClient.prefetchQuery({
    queryKey: ['tasks', 'completed'],
    queryFn: getCompletedTasks,
  });
  await queryClient.prefetchQuery({
    queryKey: ['tags'],
    queryFn: getTags,
  });

  return (
    <div className="container mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">

        <HydrationBoundary state={dehydrate(queryClient)}>
          <div>
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold tracking-tight">🧙‍♂️ TaskWarlock</h1>
              <div className="flex items-center gap-2">
                <ThemeSelector />
                <Link href="/settings">
                  <Button variant="outline" size="icon" title="Settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
            <TaskStats />
          </div>

          <AddTaskSection />

          <TaskDashboard />
        </HydrationBoundary>

      </div>
    </div>
  );
}
