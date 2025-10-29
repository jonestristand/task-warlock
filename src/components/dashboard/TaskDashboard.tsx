'use client';

import { useMemo, useState } from 'react';

import { RefreshCw } from 'lucide-react';

import { Task } from '@/lib/schemas';
import { useProjectsQuery, useTagsQuery, useTasksQuery } from '@/lib/task-queries';

import SyncButton from '@/components/SyncButton';
import TaskTable from '@/components/task-table/TaskTable';
import { Button } from '@/components/ui/button';

import ContextFilter from '../filters/ContextFilter';
import ProjectFilter from '../filters/ProjectFilter';
import TagFilter from '../filters/TagFilter';

export default function TaskDashboard() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  const { data: allTasks, isPending, isError, refetch: refetchTasks } = useTasksQuery();
  const { data: projects, refetch: refetchProjects } = useProjectsQuery();
  const { data: tags, refetch: refetchTags } = useTagsQuery();

  // Filter tasks based on completion status, project, and tags
  const filteredTasks = useMemo(() => {
    if (!allTasks) return [];

    let currentTasks = allTasks;

    // Filter by completion status
    if (showCompleted) {
      currentTasks = currentTasks
        .filter(task => task.end) // Has end date = completed
        .sort((a, b) => {
          // Sort completed tasks by completion date (most recent first)
          const aEnd = a.end ? new Date(a.end).getTime() : 0;
          const bEnd = b.end ? new Date(b.end).getTime() : 0;
          return bEnd - aEnd;
        });
    } else {
      currentTasks = currentTasks
        .filter(task => !task.end)
        .sort((a, b) => (b.urgency || 0) - (a.urgency || 0)); // No end date = pending
    }

    // Filter by project
    if (selectedProject) {
      if (selectedProject === 'no-project') {
        currentTasks = currentTasks.filter(task => !task.project);
      } else {
        currentTasks = currentTasks.filter(task => task.project === selectedProject);
      }
    }

    // Filter by tags (task must have ALL selected tags)
    if (selectedTags.length > 0) {
      currentTasks = currentTasks.filter(
        task => task.tags && selectedTags.every(selectedTag => task.tags!.includes(selectedTag))
      );
    }

    return currentTasks;
  }, [allTasks, showCompleted, selectedProject, selectedTags]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchTasks(), refetchProjects(), refetchTags()]);
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <p className="text-sm text-destructive">Error loading tasks. Please try again.</p>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">{showCompleted ? 'Completed Tasks' : 'Tasks'}</h2>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <SyncButton />
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-4">
            <Button
              variant={showCompleted ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setShowCompleted(!showCompleted);
                setSelectedProject(null); // Reset project filter when switching
                setSelectedTags([]); // Reset tag filter when switching
              }}
              className="flex items-center gap-2"
            >
              {showCompleted ? 'Show Pending' : 'Show Completed'}
            </Button>
            {/*<ContextFilter contexts={[]} currentContext={null} />*/}
            <ProjectFilter
              projects={projects || []}
              selectedProject={selectedProject}
              onProjectChange={setSelectedProject}
            />
            <TagFilter tags={tags || []} selectedTags={selectedTags} onTagsChange={setSelectedTags} />
          </div>
        </div>
      </div>

      <TaskTable 
        tasks={filteredTasks} 
        showCompleted={showCompleted}
        isLoading={isPending}
      />
    </div>
  );
}
